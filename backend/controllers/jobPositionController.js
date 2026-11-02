import JobPosition from '../models/JobPosition.js';

// Create a new job position
export const createJobPosition = async (req, res) => {
  try {
    const { title, description, requirements, type, status, postedAt, closingTime } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Job title is required'
      });
    }

    const jobPosition = await JobPosition.create({
      title,
      description,
      requirements: requirements || [],
      type,
      status: status || 'open',
      postedAt: postedAt || new Date(),
      closingTime
    });

    res.status(201).json({
      success: true,
      message: 'Job position created successfully',
      data: jobPosition
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create job position',
      error: error.message
    });
  }
};

// Get all job positions with filters and pagination
export const getJobPositions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      type
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await JobPosition.countDocuments(query);
    const jobPositions = await JobPosition.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: jobPositions,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job positions',
      error: error.message
    });
  }
};

// Get job position by ID
export const getJobPositionById = async (req, res) => {
  try {
    const jobPosition = await JobPosition.findById(req.params.id);

    if (!jobPosition) {
      return res.status(404).json({
        success: false,
        message: 'Job position not found'
      });
    }

    res.status(200).json({
      success: true,
      data: jobPosition
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job position',
      error: error.message
    });
  }
};

// Update job position
export const updateJobPosition = async (req, res) => {
  try {
    const jobPosition = await JobPosition.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!jobPosition) {
      return res.status(404).json({
        success: false,
        message: 'Job position not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job position updated successfully',
      data: jobPosition
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update job position',
      error: error.message
    });
  }
};

// Delete job position
export const deleteJobPosition = async (req, res) => {
  try {
    const jobPosition = await JobPosition.findByIdAndDelete(req.params.id);
    if (!jobPosition) {
      return res.status(404).json({
        success: false,
        message: 'Job position not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job position deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete job position',
      error: error.message
    });
  }
};

