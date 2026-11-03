import Clearance from '../models/Clearance.js';
import Employee from '../models/Employee.js';
import { recordApprovalEvent } from '../utils/approvalHelper.js';

// Helper to resolve employee ID
const resolveEmployeeId = async (req) => {
  if (req.body.employee && req.user && (req.user.roles?.includes('admin') || req.user.roles?.includes('hr') || req.user.roles?.includes('manager'))) {
    return req.body.employee;
  }
  if (req.user) {
    const employee = await Employee.findOne({ email: req.user.email.toLowerCase() });
    if (employee) {
      return employee._id;
    }
  }
  if (req.body.employee) {
    return req.body.employee;
  }
  return null;
};

// Create a new clearance request
export const createClearance = async (req, res) => {
  try {
    const { employee, reason, checklist } = req.body;

    const targetEmployeeId = employee || (await resolveEmployeeId(req));

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'employee reference is required'
      });
    }

    // Default standard enterprise exit checklist
    const defaultChecklist = [
      { title: 'Department Equipment, Projects & Files' },
      { title: 'Store & Inventory Borrowed Tools/Assets' },
      { title: 'IT & System Access Deactivation / Laptop Return' },
      { title: 'Finance, Loan Settlements & Salary Advances' },
      { title: 'HR ID Card, Medical Card & Exit Interview' }
    ];

    const clearance = await Clearance.create({
      employee: targetEmployeeId,
      reason,
      status: 'pending',
      checklist: checklist && checklist.length > 0 ? checklist : defaultChecklist
    });

    // Record submission in ApprovalHistory
    await recordApprovalEvent({
      referenceType: 'clearance',
      referenceId: clearance._id,
      action: 'submitted',
      user: req.user,
      comment: reason || 'Exit clearance initialized'
    });

    const populated = await clearance.populate('employee', 'fullName email department position');

    res.status(201).json({
      success: true,
      message: 'Clearance request initialized successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create clearance request',
      error: error.message
    });
  }
};

// Get current user's clearance status
export const getMyClearance = async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(404).json({
        success: false,
        message: 'No employee profile linked to user'
      });
    }

    const clearance = await Clearance.findOne({ employee: employeeId })
      .populate('checklist.confirmedBy', 'fullName email')
      .populate('finalApprovedBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: clearance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clearance status',
      error: error.message
    });
  }
};

// Get all clearances with filters and pagination
export const getClearances = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      employee,
      status
    } = req.query;

    const query = {};

    if (employee) query.employee = employee;
    if (status) query.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Clearance.countDocuments(query);
    const clearances = await Clearance.find(query)
      .populate('employee', 'fullName email department position profileImage')
      .populate('checklist.confirmedBy', 'fullName email')
      .populate('finalApprovedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: clearances,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clearance records',
      error: error.message
    });
  }
};

// Get clearance by ID
export const getClearanceById = async (req, res) => {
  try {
    const clearance = await Clearance.findById(req.params.id)
      .populate('employee', 'fullName email department position profileImage')
      .populate('checklist.confirmedBy', 'fullName email')
      .populate('finalApprovedBy', 'fullName email');

    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: 'Clearance not found'
      });
    }

    res.status(200).json({
      success: true,
      data: clearance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clearance',
      error: error.message
    });
  }
};

// Update clearance details
export const updateClearance = async (req, res) => {
  try {
    const clearance = await Clearance.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('employee', 'fullName email department position')
      .populate('checklist.confirmedBy', 'fullName email');

    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: 'Clearance not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Clearance updated successfully',
      data: clearance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update clearance',
      error: error.message
    });
  }
};

// Update a specific checklist item in clearance
export const updateChecklistItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status, remarks } = req.body;

    const clearance = await Clearance.findById(req.params.id);
    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: 'Clearance not found'
      });
    }

    const item = clearance.checklist.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Checklist item not found'
      });
    }

    if (status) item.status = status;
    item.confirmedBy = req.user?._id || req.body.confirmedBy;
    if (remarks !== undefined) item.remarks = remarks;
    if (status === 'cleared') {
      item.confirmedAt = new Date();
    }

    if (clearance.status === 'pending') {
      clearance.status = 'in_progress';
    }

    await clearance.save();

    // Log action in ApprovalHistory
    await recordApprovalEvent({
      referenceType: 'clearance',
      referenceId: clearance._id,
      action: status === 'cleared' ? 'cleared' : status === 'rejected' ? 'rejected' : 'returned for correction',
      user: req.user,
      comment: `Checklist item '${item.title}' marked as ${status}. ${remarks || ''}`
    });

    const populated = await clearance.populate([
      { path: 'employee', select: 'fullName email department position' },
      { path: 'checklist.confirmedBy', select: 'fullName email' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Checklist item updated successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update checklist item',
      error: error.message
    });
  }
};

// Final approval for clearance and auto-offboarding
export const finalApproveClearance = async (req, res) => {
  try {
    const { status = 'completed', remarks } = req.body;

    const clearance = await Clearance.findById(req.params.id);
    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: 'Clearance not found'
      });
    }

    clearance.finalApprovedBy = req.user?._id || req.body.finalApprovedBy;
    clearance.status = status;
    clearance.completedAt = new Date();

    await clearance.save();

    // When clearance is officially completed, automatically mark employee status as 'terminated'
    if (status === 'completed' && clearance.employee) {
      await Employee.findByIdAndUpdate(clearance.employee, {
        status: 'terminated'
      });
    }

    // Log in ApprovalHistory
    await recordApprovalEvent({
      referenceType: 'clearance',
      referenceId: clearance._id,
      action: status === 'completed' ? 'approved' : 'rejected',
      user: req.user,
      comment: remarks || `Final exit clearance marked as ${status}. Employee status updated to terminated.`
    });

    const populated = await clearance.populate([
      { path: 'employee', select: 'fullName email department position status' },
      { path: 'finalApprovedBy', select: 'fullName email' }
    ]);

    res.status(200).json({
      success: true,
      message: `Clearance marked as ${status} and employee status updated`,
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to finalize clearance',
      error: error.message
    });
  }
};

// Delete clearance
export const deleteClearance = async (req, res) => {
  try {
    const clearance = await Clearance.findByIdAndDelete(req.params.id);
    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: 'Clearance not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Clearance deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete clearance',
      error: error.message
    });
  }
};
