import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/token.js';

// Register / Create user
export const createUser = async (req, res) => {
  try {
    const { fullName, email, password, roles, employee } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'fullName, email, and password are required'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    let linkedEmployeeId = employee || null;
    if (!linkedEmployeeId && email) {
      const matchedEmployee = await Employee.findOne({ email: email.toLowerCase() });
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

    const hashedPassword = hashPassword(password);

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      roles: roles || ['employee'],
      employee: linkedEmployeeId
    });

    if (linkedEmployeeId) {
      await Employee.updateOne({ _id: linkedEmployeeId }, { $set: { user: user._id } });
    }

    const token = generateToken({ id: user._id, email: user.email, roles: user.roles });

    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('employee', 'fullName email department position status branch profileImage');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      data: populatedUser
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

    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('employee', 'fullName email department position status branch profileImage');
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

    const token = generateToken({ id: user._id, email: user.email, roles: user.roles });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
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

// Get current user profile
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

// Get all users with filtering and pagination
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, includeDeleted = 'false' } = req.query;

    const query = {};

    if (includeDeleted !== 'true') {
      query.isDeleted = false;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.roles = role;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .populate('employee', 'fullName email department position status branch profileImage')
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
      .populate('employee', 'fullName email department position status branch profileImage');

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

// Update user details
export const updateUser = async (req, res) => {
  try {
    const { fullName, email, roles, employee, isDeleted, password } = req.body;
    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email.toLowerCase();
    if (roles) updateData.roles = roles;
    if (typeof isDeleted === 'boolean') updateData.isDeleted = isDeleted;
    if (password) updateData.password = hashPassword(password);

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
      .populate('employee', 'fullName email department position status branch profileImage');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Keep linked employee's fullName and email synced if user credentials changed
    if (updatedUser.employee && (fullName || email)) {
      const empId = updatedUser.employee._id || updatedUser.employee;
      const empUpdate = {};
      if (fullName) empUpdate.fullName = fullName;
      if (email) empUpdate.email = email.toLowerCase();
      await Employee.updateOne({ _id: empId }, { $set: empUpdate });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
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

// Soft delete user
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

    res.status(200).json({
      success: true,
      message: 'User deleted (soft delete) successfully',
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
