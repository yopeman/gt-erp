import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import LeaveBalance from '../models/LeaveBalance.js';
import CompanySetting from '../models/CompanySetting.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { hashPassword, generateTemporaryPassword } from '../utils/password.js';

/**
 * Normalizes account details array ensuring strictly ONE primary account
 */
export const normalizeAccountDetails = (accounts) => {
  if (!accounts) return [];
  const list = Array.isArray(accounts) ? accounts : [accounts];
  const validList = list.filter((acc) => acc && (acc.holderName || acc.number || acc.bankName));
  if (validList.length === 0) return [];

  let primaryIndex = validList.findIndex((acc) => acc.isPrimary === true || acc.isPrimary === 'true');
  if (primaryIndex === -1 && validList.length > 0) {
    primaryIndex = 0; // Default first account as primary
  }

  return validList.map((acc, idx) => ({
    bankName: acc.bankName || 'Commercial Bank of Ethiopia (CBE)',
    holderName: acc.holderName || '',
    number: acc.number || '',
    branch: acc.branch || '',
    status: acc.status || 'active',
    isPrimary: idx === primaryIndex
  }));
};

/**
 * Uploads base64 data to Cloudinary (or fallback local file system)
 * Returns the permanent hosted/local URL instead of raw base64
 */
const processMediaUrl = async (urlOrBase64, folder, resourceType = 'auto') => {
  if (!urlOrBase64 || typeof urlOrBase64 !== 'string') return urlOrBase64;
  if (urlOrBase64.startsWith('data:') || urlOrBase64.length > 500) {
    try {
      const uploadResult = await uploadToCloudinary(urlOrBase64, {
        folder,
        resourceType
      });
      return uploadResult.secureUrl || uploadResult.url;
    } catch (err) {
      console.error('Error processing media URL, falling back:', err.message);
      return urlOrBase64;
    }
  }
  return urlOrBase64;
};

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
      user,
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
      password,
      roles,
      autoCreateUser = true
    } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: 'fullName and email are required fields'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if an active employee with this email already exists
    let employee = await Employee.findOne({ email: normalizedEmail });
    if (employee && employee.status !== 'terminated') {
      return res.status(409).json({
        success: false,
        message: 'An active employee with this email already exists'
      });
    }

    // Determine linked user if specified or auto-create system user account
    let userAccount = null;
    let temporaryPassword = null;
    let isNewUserCreated = false;

    if (user) {
      userAccount = await User.findById(user);
    } else {
      userAccount = await User.findOne({ email: normalizedEmail });
    }

    // Enforce 1-to-1 unique relationship: ensure user is not already linked to another employee
    if (userAccount) {
      const existingLink = await Employee.findOne({
        user: userAccount._id,
        ...(employee ? { _id: { $ne: employee._id } } : {})
      });
      if (existingLink) {
        return res.status(409).json({
          success: false,
          message: `User account is already linked to employee '${existingLink.fullName}'. A one-to-one relationship is required.`
        });
      }
    } else if (autoCreateUser) {
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

    // Process profile image (Cloudinary with local fallback)
    const finalProfileImage = await processMediaUrl(profileImage, 'gt_erp/employees/profiles', 'image');

    // Process documents if any are base64
    let processedDocuments = [];
    if (Array.isArray(documents) && documents.length > 0) {
      processedDocuments = await Promise.all(
        documents.map(async (doc) => ({
          ...doc,
          url: await processMediaUrl(doc.url, 'gt_erp/documents', 'auto')
        }))
      );
    }

    // Normalize bank accounts ensuring exactly one primary
    const processedAccounts = normalizeAccountDetails(accountDetails);

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
      profileImage: finalProfileImage || null,
      dateOfBirth,
      status: status || 'active',
      documents: processedDocuments,
      nationalId,
      emergency: emergency || {},
      warranty: warranty || {},
      educations: educations || [],
      accountDetails: processedAccounts,
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
      .populate('user', 'fullName email roles mustChangePassword isDeleted')
      .populate('manager', 'fullName email department position');

    res.status(201).json({
      success: true,
      message: isNewUserCreated
        ? 'Employee details filled and linked with new User account (temporary password generated).'
        : 'Employee created and successfully linked with User account.',
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
      .populate('manager', 'fullName email position department')
      .populate('user', 'fullName email roles mustChangePassword isDeleted')
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
      .populate('user', 'fullName email roles mustChangePassword isDeleted')
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

    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase().trim();
      // Prevent direct modification of email to an existing one
      if (updateData.email !== employee.email.toLowerCase()) {
        const existing = await Employee.findOne({
          email: updateData.email,
          _id: { $ne: req.params.id }
        });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Another employee with this email already exists'
          });
        }
      }
    }

    // Process profile image if base64
    if (updateData.profileImage) {
      updateData.profileImage = await processMediaUrl(updateData.profileImage, 'gt_erp/employees/profiles', 'image');
    }

    // Normalize bank accounts ensuring strictly one primary
    if (updateData.accountDetails) {
      updateData.accountDetails = normalizeAccountDetails(updateData.accountDetails);
    }

    // Process any base64 document URLs
    if (Array.isArray(updateData.documents)) {
      updateData.documents = await Promise.all(
        updateData.documents.map(async (doc) => ({
          ...doc,
          url: await processMediaUrl(doc.url, 'gt_erp/documents', 'auto')
        }))
      );
    }

    // Handle user link consistency if user field is explicitly updated
    if (updateData.user !== undefined) {
      const newUserId = updateData.user || null;
      updateData.user = newUserId;

      if (employee.user && String(employee.user) !== String(newUserId)) {
        // Unlink previous user
        await User.updateOne({ _id: employee.user }, { $set: { employee: null } });
      }

      if (newUserId) {
        // Link new user and clear any other employee attached to this user
        await Employee.updateMany(
          { user: newUserId, _id: { $ne: req.params.id } },
          { $set: { user: null } }
        );
        await User.updateOne({ _id: newUserId }, { $set: { employee: req.params.id } });
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('user', 'fullName email roles mustChangePassword isDeleted')
      .populate('manager', 'fullName email position department');

    // Synchronize linked User account details
    const linkedUserId = updatedEmployee.user?._id || employee.user;
    if (linkedUserId) {
      const userUpdate = {};
      if (updateData.fullName) userUpdate.fullName = updateData.fullName.trim();
      if (updateData.email) userUpdate.email = updateData.email;

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

// Delete employee (supports soft delete and permanent delete)
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
      // Unlink any User pointing to this deleted Employee
      await User.updateMany({ employee: req.params.id }, { $set: { employee: null } });

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

    // Soft-delete / deactivate linked User account on termination
    if (employee.user) {
      await User.findByIdAndUpdate(employee.user, { $set: { isDeleted: true } });
    }

    res.status(200).json({
      success: true,
      message: 'Employee terminated and user account deactivated successfully',
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

// Add document to employee
export const addDocument = async (req, res) => {
  try {
    const { type, name, url, file, issuedAt, uploadedBy, expiresAt } = req.body;
    const rawDocumentData = file || url;
    const finalUrl = await processMediaUrl(rawDocumentData, 'gt_erp/documents', 'auto');

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          documents: {
            type,
            name,
            url: finalUrl,
            issuedAt,
            uploadedBy: req.user?._id || uploadedBy || null,
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

/**
 * Public Endpoint: Verify Employee ID & return public card details
 * Used when scanning QR code on employee ID badge
 */
export const getPublicEmployeeCard = async (req, res) => {
  try {
    const { identifier } = req.params;
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Identifier is required for verification'
      });
    }

    let employee = null;

    // 1. Check if identifier is valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      employee = await Employee.findById(identifier)
        .select('fullName employeeCode position department branch profileImage hiredAt status nationalId bloodGroup emergency')
        .lean();
    }

    // 2. Check by employeeCode (e.g. GTE-001 or custom)
    if (!employee) {
      employee = await Employee.findOne({
        $or: [
          { employeeCode: identifier },
          { employeeCode: identifier.toUpperCase() }
        ]
      })
        .select('fullName employeeCode position department branch profileImage hiredAt status nationalId bloodGroup emergency')
        .lean();
    }

    // 3. Check by GTE- last 6 digits of _id
    if (!employee && (identifier.toUpperCase().startsWith('GTE-') || identifier.length === 6)) {
      const suffix = identifier.toUpperCase().replace('GTE-', '').toLowerCase();
      const allEmps = await Employee.find({})
        .select('fullName employeeCode position department branch profileImage hiredAt status nationalId bloodGroup emergency')
        .lean();

      employee = allEmps.find((e) => e._id.toString().slice(-6).toLowerCase() === suffix);
    }

    // 4. Check by nationalId if matches
    if (!employee) {
      employee = await Employee.findOne({ nationalId: identifier })
        .select('fullName employeeCode position department branch profileImage hiredAt status nationalId bloodGroup emergency')
        .lean();
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee ID credential record not found in registry'
      });
    }

    // Fetch company settings for dynamic branding
    const company = await CompanySetting.findOne().lean();

    res.status(200).json({
      success: true,
      data: {
        employee,
        companyName: company?.companyName || 'GT PRINTING & PACKAGING PLC',
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify employee identity',
      error: error.message
    });
  }
};
