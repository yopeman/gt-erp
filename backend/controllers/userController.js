import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { hashPassword, comparePassword, generateTemporaryPassword } from '../utils/password.js';
import { generateToken } from '../utils/token.js';

// Register / Create user with temporary password and automatic employee profile link
export const createUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      roles,
      employee,
      department,
      position,
      phoneNumber
    } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: 'fullName and email are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    let linkedEmployeeId = employee || null;
    if (!linkedEmployeeId) {
      const matchedEmployee = await Employee.findOne({ email: normalizedEmail });
      if (matchedEmployee) {
        linkedEmployeeId = matchedEmployee._id;
      }
    }

    // Enforce 1-to-1 unique relationship: ensure employee is not already linked to another user
    if (linkedEmployeeId) {
      const existingUserLink = await User.findOne({ employee: linkedEmployeeId });
      if (existingUserLink) {
        return res.status(409).json({
          success: false,
          message: `Employee is already linked to user account '${existingUserLink.email}'. A one-to-one relationship is required.`
        });
      }
    }

    // Determine temporary or provided password
    const isTemp = !password;
    const effectivePassword = password || generateTemporaryPassword();
    const hashedPassword = hashPassword(effectivePassword);

    // Create user account
    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      roles: roles && roles.length > 0 ? roles : ['employee'],
      employee: linkedEmployeeId,
      mustChangePassword: isTemp || req.body.mustChangePassword === true,
      isTemporaryPassword: isTemp
    });

    // Link or create corresponding Employee profile
    let employeeDoc = null;
    if (linkedEmployeeId) {
      employeeDoc = await Employee.findByIdAndUpdate(
        linkedEmployeeId,
        { $set: { user: user._id } },
        { new: true }
      );
    } else {
      employeeDoc = await Employee.findOne({ email: normalizedEmail });
      if (employeeDoc) {
        employeeDoc.user = user._id;
        if (!employeeDoc.fullName) employeeDoc.fullName = fullName.trim();
        await employeeDoc.save();
      } else {
        // Create initial base employee profile ready for detailed completion later
        employeeDoc = await Employee.create({
          user: user._id,
          fullName: fullName.trim(),
          email: normalizedEmail,
          department: department || 'General',
          position: position || 'Employee',
          phoneNumber: phoneNumber || '',
          status: 'pending_profile',
          type: 'full time'
        });
      }
      user.employee = employeeDoc._id;
      await user.save();
    }

    const token = generateToken({
      id: user._id,
      email: user.email,
      roles: user.roles,
      employeeId: employeeDoc?._id || user.employee || null
    });

    const userObj = user.toObject();
    delete userObj.password;
    userObj.employee = employeeDoc;

    res.status(201).json({
      success: true,
      message: isTemp
        ? 'User created successfully with temporary password. Employee profile initialized.'
        : 'User and Employee profile created and linked successfully.',
      token,
      temporaryPassword: isTemp ? effectivePassword : null,
      credentials: {
        email: user.email,
        temporaryPassword: isTemp ? effectivePassword : null,
        roles: user.roles,
        mustChangePassword: user.mustChangePassword
      },
      data: userObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

// Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let user = await User.findOne({ email: normalizedEmail }).populate('employee');
    if (!user || user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Self-heal link if employee is missing
    if (!user.employee) {
      const employee = await Employee.findOne({ email: normalizedEmail });
      if (employee) {
        user.employee = employee._id;
        await user.save();
        employee.user = user._id;
        await employee.save();
        user = await User.findById(user._id).populate('employee');
      }
    }

    const token = generateToken({
      id: user._id,
      email: user.email,
      roles: user.roles,
      employeeId: user.employee?._id || null
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      mustChangePassword: user.mustChangePassword,
      isTemporaryPassword: user.isTemporaryPassword,
      data: userObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message
    });
  }
};

// Get current logged-in user profile
export const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current user profile',
      error: error.message
    });
  }
};

// Change password (mandatory if user logged in with temporary password)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'currentPassword and newPassword are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'newPassword must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isMatch = comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password'
      });
    }

    user.password = hashPassword(newPassword);
    user.mustChangePassword = false;
    user.isTemporaryPassword = false;
    user.lastPasswordChangeAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Your account is now fully secured.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// Admin reset temporary password for an employee / user
export const resetTemporaryPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const newTempPassword = generateTemporaryPassword();
    user.password = hashPassword(newTempPassword);
    user.mustChangePassword = true;
    user.isTemporaryPassword = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Temporary password reset successfully',
      temporaryPassword: newTempPassword,
      credentials: {
        email: user.email,
        temporaryPassword: newTempPassword,
        mustChangePassword: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset temporary password',
      error: error.message
    });
  }
};

// Get all users with filters and pagination
export const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      search,
      includeDeleted = 'false'
    } = req.query;

    const query = {};

    if (includeDeleted !== 'true') {
      query.isDeleted = false;
    }

    if (role) {
      query.roles = role;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .populate('employee', 'fullName email department position status branch profileImage employeeCode nationalId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('employee', 'fullName email department position status branch profileImage employeeCode nationalId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

// Update user details & sync with employee
export const updateUser = async (req, res) => {
  try {
    const { fullName, email, roles, isDeleted, password, employee } = req.body;
    const updateData = {};

    if (fullName) updateData.fullName = fullName.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (roles) updateData.roles = roles;
    if (typeof isDeleted === 'boolean') updateData.isDeleted = isDeleted;
    if (password) updateData.password = hashPassword(password);
    if (employee !== undefined) updateData.employee = employee;

    // Handle employee bidirectional link consistency
    if (employee !== undefined) {
      const currentUser = await User.findById(req.params.id);
      const newEmpId = employee || null;
      updateData.employee = newEmpId;

      if (currentUser && currentUser.employee && String(currentUser.employee) !== String(newEmpId)) {
        // Unlink previous employee
        await Employee.updateOne({ _id: currentUser.employee }, { $set: { user: null } });
      }

      if (newEmpId) {
        // Unlink any other user pointing to this employee
        await User.updateMany(
          { employee: newEmpId, _id: { $ne: req.params.id } },
          { $set: { employee: null } }
        );
        // Link employee to this user
        await Employee.updateOne({ _id: newEmpId }, { $set: { user: req.params.id } });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('employee', 'fullName email department position status branch profileImage employeeCode nationalId');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Bidirectional sync: keep Employee updated
    if (updatedUser.employee) {
      const empId = updatedUser.employee._id || updatedUser.employee;
      const empUpdate = {};
      if (fullName) empUpdate.fullName = fullName.trim();
      if (email) empUpdate.email = email.toLowerCase().trim();
      if (isDeleted === true) empUpdate.status = 'inactive';

      if (Object.keys(empUpdate).length > 0) {
        await Employee.findByIdAndUpdate(empId, { $set: empUpdate });
      }
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully and synchronized with Employee record',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// Soft delete user and synchronize employee status
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    )
      .select('-password')
      .populate('employee', 'fullName email department position status branch profileImage');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Deactivate linked employee
    if (user.employee) {
      await Employee.findByIdAndUpdate(user.employee, { status: 'inactive' });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted and employee record deactivated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};
