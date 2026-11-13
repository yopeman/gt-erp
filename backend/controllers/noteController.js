import Note from '../models/Note.js';

/**
 * Get all notes for the authenticated user
 * Strictly user-specific: no one can view other users' notes.
 */
export const getMyNotes = async (req, res) => {
  try {
    const userId = req.user._id;
    const { search, color, pinned } = req.query;

    const query = { user: userId };

    if (pinned === 'true') {
      query.isPinned = true;
    } else if (pinned === 'false') {
      query.isPinned = false;
    }

    if (color && color !== 'all') {
      query.color = color;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { content: regex },
        { 'checklist.text': regex }
      ];
    }

    const notes = await Note.find(query).sort({ isPinned: -1, updatedAt: -1 });

    const total = notes.length;
    const pinnedCount = notes.filter((n) => n.isPinned).length;

    res.status(200).json({
      success: true,
      total,
      pinnedCount,
      data: notes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notes',
      error: error.message
    });
  }
};

/**
 * Create a new personal note
 */
export const createNote = async (req, res) => {
  try {
    const { title, content, color, isPinned, checklist } = req.body;

    // Sanitize checklist array
    const cleanChecklist = Array.isArray(checklist)
      ? checklist
          .filter((item) => item && typeof item.text === 'string' && item.text.trim())
          .map((item) => ({
            text: item.text.trim(),
            completed: Boolean(item.completed)
          }))
      : [];

    const note = await Note.create({
      user: req.user._id,
      title: title?.trim() || '',
      content: content || '',
      color: color || 'default',
      isPinned: Boolean(isPinned),
      checklist: cleanChecklist
    });

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: note
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create note',
      error: error.message
    });
  }
};

/**
 * Get a specific note by ID (user isolation enforced)
 */
export const getNoteById = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch note',
      error: error.message
    });
  }
};

/**
 * Update note details
 */
export const updateNote = async (req, res) => {
  try {
    const { title, content, color, isPinned, checklist } = req.body;

    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found or access denied'
      });
    }

    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content;
    if (color !== undefined) note.color = color;
    if (isPinned !== undefined) note.isPinned = Boolean(isPinned);
    if (Array.isArray(checklist)) {
      note.checklist = checklist
        .filter((item) => item && typeof item.text === 'string' && item.text.trim())
        .map((item) => ({
          _id: item._id,
          text: item.text.trim(),
          completed: Boolean(item.completed)
        }));
    }

    await note.save();

    res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      data: note
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update note',
      error: error.message
    });
  }
};

/**
 * Toggle pin/unpin status
 */
export const togglePin = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found or access denied'
      });
    }

    note.isPinned = !note.isPinned;
    await note.save();

    res.status(200).json({
      success: true,
      message: note.isPinned ? 'Note pinned' : 'Note unpinned',
      data: note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle pin',
      error: error.message
    });
  }
};

/**
 * Update note color
 */
export const updateColor = async (req, res) => {
  try {
    const { color } = req.body;
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { color } },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Color updated',
      data: note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update color',
      error: error.message
    });
  }
};

/**
 * Toggle single checklist item's completion state
 */
export const toggleChecklistItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    const item = note.checklist.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Checklist item not found'
      });
    }

    item.completed = !item.completed;
    await note.save();

    res.status(200).json({
      success: true,
      message: item.completed ? 'Item marked completed' : 'Item marked pending',
      data: note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle checklist item',
      error: error.message
    });
  }
};

/**
 * Add a new checklist item to a note directly
 */
export const addChecklistItem = async (req, res) => {
  try {
    const { text, completed = false } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Checklist item text is required'
      });
    }

    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    note.checklist.push({
      text: text.trim(),
      completed: Boolean(completed)
    });

    await note.save();

    res.status(200).json({
      success: true,
      message: 'Checklist item added',
      data: note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add checklist item',
      error: error.message
    });
  }
};

/**
 * Delete a note
 */
export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete note',
      error: error.message
    });
  }
};

