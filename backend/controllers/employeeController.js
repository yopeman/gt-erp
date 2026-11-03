import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

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

    // Determine linked user if specified or auto-create system user account by default
    let linkedUserId = user || null;
    if (!linkedUserId && email) {
      let matchedUser = await User.findOne({ email: email.toLowerCase() });
      if (!matchedUser) {
        const { hashPassword } = await import('../utils/password.js');
        const defaultPassword = 'password123';
        matchedUser = await User.create({
          fullName,
          email: email.toLowerCase(),
          password: hashPassword(defaultPassword),
          roles: ['employee']
        });
      }
      linkedUserId = matchedUser._id;
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

    const employee = await Employee.create({
      fullName,
      email: email.toLowerCase(),
      department,
      position,
      gender,
      branch,
      phoneNumber,
      detailAddress,
      hiredAt,
      manager: manager || null,
      user: linkedUserId,
      type,
      profileImage: finalProfileImage || null,
      dateOfBirth,
      status: status || 'active',
      documents: processedDocuments,
      nationalId,
      emergency,
      warranty,
      educations: educations || [],
      accountDetails: processedAccounts,
      baseSalary: baseSalary || 0
    });

    // Ensure linked user points back to this employee
    if (linkedUserId) {
      await User.updateOne({ _id: linkedUserId }, { $set: { employee: employee._id } });
    }

    const populatedEmployee = await Employee.findById(employee._id)
      .populate('manager', 'fullName email position department')
      .populate('user', 'fullName email roles isDeleted');

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: populatedEmployee
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
      .populate('user', 'fullName email roles isDeleted')
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
      .populate('user', 'fullName email roles isDeleted')
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

    // Process profile image if base64
    if (req.body.profileImage) {
      req.body.profileImage = await processMediaUrl(req.body.profileImage, 'gt_erp/employees/profiles', 'image');
    }

    // Normalize bank accounts ensuring strictly one primary
    if (req.body.accountDetails) {
      req.body.accountDetails = normalizeAccountDetails(req.body.accountDetails);
    }

    // Process any base64 document URLs
    if (Array.isArray(req.body.documents)) {
      req.body.documents = await Promise.all(
        req.body.documents.map(async (doc) => ({
          ...doc,
          url: await processMediaUrl(doc.url, 'gt_erp/documents', 'auto')
        }))
      );
    }

    // Handle user link consistency if user field is explicitly updated
    if (req.body.user !== undefined) {
      const currentEmployee = await Employee.findById(req.params.id);
      const newUserId = req.body.user || null;
      req.body.user = newUserId;

      if (currentEmployee && currentEmployee.user && String(currentEmployee.user) !== String(newUserId)) {
        // Unlink previous user
        await User.updateOne({ _id: currentEmployee.user }, { $set: { employee: null } });
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

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('manager', 'fullName email position department')
      .populate('user', 'fullName email roles isDeleted');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Keep linked user details synchronized with updated employee info
    if (employee.user) {
      const linkedUserId = employee.user._id || employee.user;
      const userUpdate = {
        fullName: employee.fullName,
        email: employee.email
      };
      if (employee.status === 'terminated') {
        userUpdate.isDeleted = true;
      }
      await User.updateOne({ _id: linkedUserId }, { $set: userUpdate });
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

    // Soft deactivation of linked user account on termination
    if (employee.user) {
      await User.updateOne({ _id: employee.user }, { $set: { isDeleted: true } });
    }

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
    const { type, name, url, file, issuedAt, uploadedBy, expiresAt, approvedAt } = req.body;
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
