import Internship from '../models/Internship.js';
import Employee from '../models/Employee.js';

// Create internship
export const createInternship = async (req, res) => {
  try {
    const { supervisor, employee, type, department, startDate, endDate, status } = req.body;

    if (!supervisor || !employee || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'supervisor, employee, startDate, and endDate are required'
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be after endDate'
      });
    }

    // Verify employee exists and is of type intern
    const internEmployee = await Employee.findById(employee);
    if (!internEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Intern employee not found'
      });
    }

    const internship = await Internship.create({
      supervisor,
      employee,
      type: type || 'unpaid',
      department: department || internEmployee.department,
      startDate,
      endDate,
      status: status || 'ongoing'
    });

    const populated = await internship.populate([
      { path: 'supervisor', select: 'fullName email department position' },
      { path: 'employee', select: 'fullName email department position type' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Internship record created successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create internship record',
      error: error.message
    });
  }
};

// Get all internships with filters and pagination
export const getInternships = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      supervisor,
      employee,
      status,
      type,
      department
    } = req.query;

    const query = {};

    if (supervisor) query.supervisor = supervisor;
    if (employee) query.employee = employee;
    if (status) query.status = status;
    if (type) query.type = type;
    if (department) query.department = department;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Internship.countDocuments(query);
    const internships = await Internship.find(query)
      .populate('supervisor', 'fullName email department position')
      .populate('employee', 'fullName email department position type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: internships,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch internship records',
      error: error.message
    });
  }
};

// Get internship by ID
export const getInternshipById = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id)
      .populate('supervisor', 'fullName email department position')
      .populate('employee', 'fullName email department position type detailAddress phoneNumber');

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: internship
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch internship record',
      error: error.message
    });
  }
};

// Update internship
export const updateInternship = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be after endDate'
      });
    }

    const internship = await Internship.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('supervisor', 'fullName email department position')
      .populate('employee', 'fullName email department position type');

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Internship record updated successfully',
      data: internship
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update internship record',
      error: error.message
    });
  }
};

// Delete internship
export const deleteInternship = async (req, res) => {
  try {
    const internship = await Internship.findByIdAndDelete(req.params.id);
    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Internship record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete internship record',
      error: error.message
    });
  }
};

