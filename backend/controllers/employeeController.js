import Employee from '../models/Employee.js';
// Create a new employee
export const createEmployee = async (req, res) => {
  try {
    const {
      fullName,
      email,
      department,
      position,
      gender,
      branch,
      phoneNumber,
      detailAddress,
      hiredAt,
      manager,
      type,
      profileImage,
      dateOfBirth,
      status,
      documents,
      nationalId,
      emergency,
      warranty,
      educations,
      accountDetails,
      baseSalary
    } = req.body;

    if (!fullName || !email || !department || !position || !phoneNumber || !type) {
      return res.status(400).json({
        success: false,
        message: 'fullName, email, department, position, phoneNumber, and type are required'
      });
    }

    const existingEmployee = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: 'An employee with this email already exists'
      });
    }

    const employee = await Employee.create({
      fullName,
      email,
      department,
      position,
      gender,
      branch,
      phoneNumber,
      detailAddress,
      hiredAt,
      manager: manager || null,
      type,
      profileImage,
      dateOfBirth,
      status: status || 'active',
      documents: documents || [],
      nationalId,
      emergency,
      warranty,
      educations: educations || [],
      accountDetails,
      baseSalary: baseSalary || 0
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create employee',
      error: error.message
    });
  }
};

// Get all employees with filtering and pagination
export const getEmployees = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      department,
      position,
      branch,
      status,
      type,
      manager
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { nationalId: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) query.department = department;
    if (position) query.position = position;
    if (branch) query.branch = branch;
    if (status) query.status = status;
    if (type) query.type = type;
    if (manager) query.manager = manager;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .populate('manager', 'fullName email position department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees',
      error: error.message
    });
  }
};

// Get employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('manager', 'fullName email position department phoneNumber')
      .populate('documents.uploadedBy', 'fullName email');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee',
      error: error.message
    });
  }
};

// Update employee
export const updateEmployee = async (req, res) => {
  try {
    if (req.body.email) {
      req.body.email = req.body.email.toLowerCase();
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('manager', 'fullName email position department');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update employee',
      error: error.message
    });
  }
};

// Delete employee (or terminate)
export const deleteEmployee = async (req, res) => {
  try {
    const { permanent } = req.query;

    if (permanent === 'true') {
      const employee = await Employee.findByIdAndDelete(req.params.id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Employee permanently deleted'
      });
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { status: 'terminated' },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Employee status changed to terminated',
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete employee',
      error: error.message
    });
  }
};

// Add a document to an employee
export const addDocument = async (req, res) => {
  try {
    const { type, name, url, issuedAt, uploadedBy, expiresAt, approvedAt } = req.body;

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          documents: {
            type,
            name,
            url,
            issuedAt,
            uploadedBy,
            expiresAt,
            approvedAt
          }
        }
      },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Document added successfully',
      data: employee.documents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add document',
      error: error.message
    });
  }
};

// Add education record to an employee
export const addEducation = async (req, res) => {
  try {
    const { graduationYear, graduationUniversity, educationLevel } = req.body;

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          educations: {
            graduationYear,
            graduationUniversity,
            educationLevel
          }
        }
      },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Education added successfully',
      data: employee.educations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add education',
      error: error.message
    });
  }
};
