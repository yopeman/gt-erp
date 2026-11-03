import JobApplication from '../models/JobApplication.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { sendInterviewEmail } from '../utils/mailer.js';

// Submit / Create a job application
export const createJobApplication = async (req, res) => {
  try {
    const { position, candidate, attachments = [], resumeFile, resumeFileName, resumeUrl } = req.body;

    if (!position || !candidate || !candidate.name || !candidate.email) {
      return res.status(400).json({
        success: false,
        message: 'position, candidate.name, and candidate.email are required'
      });
    }

    const finalAttachments = Array.isArray(attachments) ? [...attachments] : [];

    // If resume base64 file is attached, upload to Cloudinary
    if (resumeFile) {
      try {
        const uploadResult = await uploadToCloudinary(resumeFile, {
          folder: 'gt_erp/resumes',
          resourceType: 'auto'
        });
        finalAttachments.push({
          name: resumeFileName || 'Resume / CV Document',
          url: uploadResult.secureUrl || uploadResult.url
        });
      } catch (uploadErr) {
        console.warn('Resume upload to Cloudinary failed, continuing:', uploadErr.message);
      }
    }

    // If resume URL / portfolio link is provided
    if (resumeUrl && !finalAttachments.some((a) => a.url === resumeUrl)) {
      finalAttachments.push({
        name: 'Portfolio / Resume Link',
        url: resumeUrl
      });
    }

    const application = await JobApplication.create({
      position,
      candidate,
      attachments: finalAttachments,
      applyAt: new Date(),
      status: 'applied'
    });

    const populated = await application.populate('position', 'title department type status');

    res.status(201).json({
      success: true,
      message: 'Job application submitted successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create job application',
      error: error.message
    });
  }
};

// Get all job applications with filters and pagination
export const getJobApplications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      position,
      status,
      search
    } = req.query;

    const query = {};

    if (position) query.position = position;
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { 'candidate.name': { $regex: search, $options: 'i' } },
        { 'candidate.email': { $regex: search, $options: 'i' } },
        { 'candidate.phoneNumber': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await JobApplication.countDocuments(query);
    const applications = await JobApplication.find(query)
      .populate('position', 'title department type status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: applications,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job applications',
      error: error.message
    });
  }
};

// Get job application by ID
export const getJobApplicationById = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id)
      .populate('position', 'title description requirements type status closingTime');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Job application not found'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job application',
      error: error.message
    });
  }
};

// Update job application details
export const updateJobApplication = async (req, res) => {
  try {
    const application = await JobApplication.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('position', 'title department type');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Job application not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job application updated successfully',
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update job application',
      error: error.message
    });
  }
};

// Schedule / Update interview
export const scheduleInterview = async (req, res) => {
  try {
    const { date, type, meetingLink, note } = req.body;

    const application = await JobApplication.findByIdAndUpdate(
      req.params.id,
      {
        interview: { date, type, meetingLink, note },
        status: 'interview'
      },
      { new: true, runValidators: true }
    ).populate('position', 'title department type');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Job application not found'
      });
    }

    // Send interview email notification with fallback to console
    if (application.candidate?.email) {
      try {
        await sendInterviewEmail({
          to: application.candidate.email,
          candidateName: application.candidate.name,
          positionTitle: application.position?.title || 'Open Position',
          date,
          type,
          meetingLink,
          note
        });
      } catch (emailErr) {
        console.warn('[Recruitment Mailer] Email dispatch failed:', emailErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to schedule interview',
      error: error.message
    });
  }
};

// Update application status
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    const application = await JobApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('position', 'title department type');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Job application not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Job application status updated to ${status}`,
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};

// Delete job application
export const deleteJobApplication = async (req, res) => {
  try {
    const application = await JobApplication.findByIdAndDelete(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Job application not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job application deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete job application',
      error: error.message
    });
  }
};

