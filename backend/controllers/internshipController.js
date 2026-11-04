import Internship from '../models/Internship.js';
import Employee from '../models/Employee.js';

// Create internship
export const createInternship = async (req, res) => {
  try {
    const {
      supervisor,
      employee,
      userId,
      newEmployee,
      type,
      department,
      startDate,
      endDate,
      status
    } = req.body;

    if (!supervisor || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'supervisor, startDate, and endDate are required'
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be after endDate'
      });
    }

    let targetEmployeeId = employee;

    // Option 1: Register a new employee on the fly
    if (newEmployee && (newEmployee.fullName || newEmployee.email)) {
      const { fullName, email, phoneNumber, department: empDept, position: empPos, gender } = newEmployee;
      if (!fullName || !email || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'fullName, email, and phoneNumber are required to register a new intern employee'
        });
      }

      let existingEmp = await Employee.findOne({ email: email.toLowerCase().trim() });
      if (existingEmp) {
        targetEmployeeId = existingEmp._id;
        if (existingEmp.type !== 'intern') {
          existingEmp.type = 'intern';
          await existingEmp.save();
        }
      } else {
        const createdEmp = await Employee.create({
          fullName: fullName.trim(),
          email: email.toLowerCase().trim(),
          phoneNumber: phoneNumber.trim(),
          department: empDept || department || 'Digital Print',
          position: empPos || 'Intern / Trainee',
          gender: gender || 'other',
          type: 'intern',
          hiredAt: startDate || new Date()
        });
        targetEmployeeId = createdEmp._id;
      }
    } else if (userId) {
      // Option 2: Link with existing user
      const User = (await import('../models/User.js')).default;
      const targetUser = await User.findById(userId).populate('employee');
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User account not found'
        });
      }

      if (targetUser.employee) {
        targetEmployeeId = targetUser.employee._id || targetUser.employee;
        const linkedEmp = await Employee.findById(targetEmployeeId);
        if (linkedEmp && linkedEmp.type !== 'intern') {
          linkedEmp.type = 'intern';
          await linkedEmp.save();
        }
      } else {
        let existingEmp = await Employee.findOne({ email: targetUser.email.toLowerCase().trim() });
        if (!existingEmp) {
          existingEmp = await Employee.create({
            fullName: targetUser.fullName || targetUser.name || targetUser.email.split('@')[0],
            email: targetUser.email.toLowerCase().trim(),
            phoneNumber: targetUser.phoneNumber || '0900000000',
            department: department || 'Digital Print',
            position: 'Intern / Trainee',
            gender: 'other',
            type: 'intern',
            user: targetUser._id,
            hiredAt: startDate || new Date()
          });
          targetUser.employee = existingEmp._id;
          await targetUser.save();
        } else {
          if (!existingEmp.user) {
            existingEmp.user = targetUser._id;
          }
          if (existingEmp.type !== 'intern') {
            existingEmp.type = 'intern';
          }
          await existingEmp.save();
        }
        targetEmployeeId = existingEmp._id;
      }
    }

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'An intern employee or user must be selected or registered'
      });
    }

    // Verify employee exists and is of type intern
    const internEmployee = await Employee.findById(targetEmployeeId);
    if (!internEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Intern employee not found'
      });
    }

    if (internEmployee.type !== 'intern') {
      internEmployee.type = 'intern';
      await internEmployee.save();
    }

    const internship = await Internship.create({
      supervisor,
      employee: targetEmployeeId,
      type: type || 'unpaid',
      department: department || internEmployee.department || 'Digital Print',
      startDate,
      endDate,
      status: status || 'ongoing'
    });

    const populated = await internship.populate([
      { path: 'supervisor', select: 'fullName email department position' },
      { path: 'employee', select: 'fullName email department position type phoneNumber' }
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
      .populate('employee', 'fullName email department position type phoneNumber')
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
      .populate('employee', 'fullName email department position type phoneNumber');

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

