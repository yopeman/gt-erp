import Employee from '../models/Employee.js';
import User from '../models/User.js';
import LeaveBalance from '../models/LeaveBalance.js';
import CompanySetting from '../models/CompanySetting.js';
import { hashPassword, generateTemporaryPassword } from '../utils/password.js';

// Get profile of current logged-in user
export const getMyProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    let employee = null;

    if (req.user.employee) {
      employee = await Employee.findById(req.user.employee)
        .populate('manager', 'fullName email position department phoneNumber')
        .populate('user', 'fullName email roles mustChangePassword')
        .populate('documents.uploadedBy', 'fullName email');
    }

    if (!employee) {
      employee = await Employee.findOne({ email: req.user.email.toLowerCase() })
        .populate('manager', 'fullName email position department phoneNumber')
        .populate('user', 'fullName email roles mustChangePassword')
        .populate('documents.uploadedBy', 'fullName email');
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'No employee record associated with current user account'
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee profile',
      error: error.message
    });
  }
};

// Create a new employee with full details and auto-link/provision user account
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
      baseSalary,
      roles,
      password,
      autoCreateUser = true
    } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: 'fullName and email are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if employee already exists
    let employee = await Employee.findOne({ email: normalizedEmail });

    // If an existing employee has status 'pending_profile', we fill in their details
    if (employee && employee.status !== 'pending_profile') {
      return res.status(409).json({
        success: false,
        message: 'An active employee with this email already exists'
      });
    }

    let userAccount = await User.findOne({ email: normalizedEmail });
    let temporaryPassword = null;
    let isNewUserCreated = false;

    // Check or provision User login account
    if (!userAccount && autoCreateUser) {
      temporaryPassword = password || generateTemporaryPassword();
      userAccount = await User.create({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: hashPassword(temporaryPassword),
        roles: roles && roles.length > 0 ? roles : ['employee'],
        mustChangePassword: true,
        isTemporaryPassword: true
      });
      isNewUserCreated = true;
    }

    const employeeData = {
      user: userAccount ? userAccount._id : null,
      fullName: fullName.trim(),
      email: normalizedEmail,
      department: department || 'General',
      position: position || 'Employee',
      gender,
      branch,
      phoneNumber: phoneNumber || '',
      detailAddress: detailAddress || {},
      hiredAt: hiredAt || new Date(),
      manager: manager || null,
      type: type || 'full time',
      profileImage: profileImage || null,
      dateOfBirth,
      status: status || 'active',
      documents: documents || [],
      nationalId,
      emergency: emergency || {},
      warranty: warranty || {},
      educations: educations || [],
      accountDetails: accountDetails || {},
      baseSalary: baseSalary || 0
    };

    if (employee) {
      // Complete existing pending profile
      employee = await Employee.findByIdAndUpdate(employee._id, { $set: employeeData }, { new: true });
    } else {
      // Create new employee document
      employee = await Employee.create(employeeData);
    }

    // Ensure User references this Employee
    if (userAccount) {
      userAccount.employee = employee._id;
      if (roles && roles.length > 0) userAccount.roles = roles;
      await userAccount.save();
    }

    // Auto-initialize standard leave balances for the employee
    try {
      const currentYear = new Date().getFullYear();
      const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
      const standardBalances = [
        { type: 'annual', total: setting?.leaveSettings?.annualDaysPerYear || 16, isPayable: true },
        { type: 'sick', total: setting?.leaveSettings?.sickDaysPerYear || 15, isPayable: false },
        { type: 'emergency', total: setting?.leaveSettings?.emergencyDaysPerYear || 5, isPayable: false },
        { type: 'casual', total: setting?.leaveSettings?.casualDaysPerYear || 3, isPayable: false }
      ];

      if (employee.gender === 'female') {
        standardBalances.push({ type: 'maternity', total: setting?.leaveSettings?.maternityDays || 90, isPayable: true });
      } else if (employee.gender === 'male') {
        standardBalances.push({ type: 'paternity', total: setting?.leaveSettings?.paternityDays || 5, isPayable: false });
      }

      for (const item of standardBalances) {
        const existingBal = await LeaveBalance.findOne({
          employee: employee._id,
          year: currentYear,
          type: item.type
        });
        if (!existingBal) {
          await LeaveBalance.create({
            employee: employee._id,
            year: currentYear,
            type: item.type,
            isPayable: item.isPayable,
            total: item.total,
            remaining: item.total,
            totalUsed: 0
          });
        }
      }
    } catch (balanceErr) {
      console.warn('Auto leave balance init skipped:', balanceErr.message);
    }

    const populated = await Employee.findById(employee._id)
      .populate('user', 'fullName email roles mustChangePassword')
      .populate('manager', 'fullName email department position');

    res.status(201).json({
      success: true,
      message: isNewUserCreated
        ? 'Employee details filled and linked with new User account (temporary password generated).'
        : 'Employee details filled and successfully linked with existing User account.',
      credentials: isNewUserCreated
        ? {
            email: normalizedEmail,
            temporaryPassword,
            roles: userAccount.roles,
            mustChangePassword: true
          }
        : null,
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create employee',
      error: error.message
    });
  }
};

// Link an existing employee to a user account or generate temporary credentials
export const linkUserAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, roles, customPassword } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    let user = null;
    let temporaryPassword = null;

    if (userId) {
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Specified User not found'
        });
      }
    } else {
      // Find by employee's email or create new
      user = await User.findOne({ email: employee.email.toLowerCase() });
      if (!user) {
        temporaryPassword = customPassword || generateTemporaryPassword();
        user = await User.create({
          fullName: employee.fullName,
          email: employee.email.toLowerCase(),
          password: hashPassword(temporaryPassword),
          roles: roles && roles.length > 0 ? roles : ['employee'],
          mustChangePassword: true,
          isTemporaryPassword: true
        });
      }
    }

    // Bidirectional link
    employee.user = user._id;
    await employee.save();

    user.employee = employee._id;
    if (roles && roles.length > 0) user.roles = roles;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Employee and User linked bidirectionally',
      temporaryPassword,
      credentials: temporaryPassword
        ? {
            email: user.email,
            temporaryPassword,
            roles: user.roles
          }
        : null,
      data: {
        employeeId: employee._id,
        userId: user._id,
        roles: user.roles
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to link user account',
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
      .populate('user', 'fullName email roles mustChangePassword isDeleted')
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
      .populate('user', 'fullName email roles mustChangePassword isDeleted')
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

// Update employee & keep user account synchronized
export const updateEmployee = async (req, res) => {
  try {
    const updateData = { ...req.body };

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Prevent direct modification of email to an existing one
    if (updateData.email && updateData.email.toLowerCase() !== employee.email.toLowerCase()) {
      const existing = await Employee.findOne({
        email: updateData.email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Another employee with this email already exists'
        });
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('user', 'fullName email roles mustChangePassword')
      .populate('manager', 'fullName email position department');

    // Synchronize linked User account
    const linkedUserId = updatedEmployee.user?._id || employee.user;
    if (linkedUserId) {
      const userUpdate = {};
      if (updateData.fullName) userUpdate.fullName = updateData.fullName.trim();
      if (updateData.email) userUpdate.email = updateData.email.toLowerCase().trim();

      // If employee is terminated or inactive, deactivate their login account
      if (updateData.status === 'terminated' || updateData.status === 'inactive') {
        userUpdate.isDeleted = true;
      } else if (updateData.status === 'active') {
        userUpdate.isDeleted = false;
      }

      if (Object.keys(userUpdate).length > 0) {
        await User.findByIdAndUpdate(linkedUserId, { $set: userUpdate });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully and synchronized with User account',
      data: updatedEmployee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update employee',
      error: error.message
    });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Soft-delete linked User account
    if (employee.user) {
      await User.findByIdAndUpdate(employee.user, { isDeleted: true });
    }

    res.status(200).json({
      success: true,
      message: 'Employee deleted and user account deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete employee',
      error: error.message
    });
  }
};

// Add document to employee
export const addDocument = async (req, res) => {
  try {
    const { type, name, url, issuedAt, expiresAt } = req.body;

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          documents: {
            type,
            name,
            url,
            issuedAt,
            uploadedBy: req.user?._id || null,
            expiresAt
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
