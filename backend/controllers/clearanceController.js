import Clearance from '../models/Clearance.js';
import Employee from '../models/Employee.js';

/**
 * Helper to resolve logged in employee ID safely
 */
const resolveUserEmployeeId = async (user) => {
  if (!user) return null;
  if (user.employee) {
    return user.employee._id || user.employee;
  }
  const emp = await Employee.findOne({
    $or: [
      { user: user._id },
      { email: user.email?.toLowerCase().trim() }
    ]
  });
  return emp ? emp._id : null;
};

// Create a new clearance request
export const createClearance = async (req, res) => {
  try {
    const { employee, reason, checklist } = req.body;

    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr'].includes(r));

    let targetEmployeeId = employee;

    // Scoped restriction: Regular employees can only initiate clearance for themselves
    if (!canManage) {
      const myEmpId = await resolveUserEmployeeId(req.user);
      if (!myEmpId) {
        return res.status(400).json({
          success: false,
          message: 'Could not resolve your linked employee profile to start clearance'
        });
      }
      targetEmployeeId = myEmpId;
    } else if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'employee reference is required'
      });
    }

    // Default checklist items if none provided
    const defaultChecklist = [
      { title: 'Department Equipment & Files' },
      { title: 'Store & Inventory Assets' },
      { title: 'IT & System Access / Laptop' },
      { title: 'Finance & Salary Advances' },
      { title: 'HR & ID Card Return' }
    ];

    const clearance = await Clearance.create({
      employee: targetEmployeeId,
      reason,
      status: 'pending',
      checklist: checklist && checklist.length > 0 ? checklist : defaultChecklist
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

// Get all clearances with filters and pagination
export const getClearances = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      employee,
      status
    } = req.query;

    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr'].includes(r));

    const query = {};

    // Scoped visibility: Regular employees can only see their own exit clearance records
    if (!canManage) {
      const myEmpId = await resolveUserEmployeeId(req.user);
      if (!myEmpId) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, pages: 0 }
        });
      }
      query.employee = myEmpId;
    } else if (employee) {
      query.employee = employee;
    }

    if (status) query.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Clearance.countDocuments(query);
    const clearances = await Clearance.find(query)
      .populate('employee', 'fullName email department position')
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
      message: 'Failed to fetch clearances',
      error: error.message
    });
  }
};

// Get clearance by ID
export const getClearanceById = async (req, res) => {
  try {
    const clearance = await Clearance.findById(req.params.id)
      .populate('employee', 'fullName email department position detailAddress phoneNumber')
      .populate('checklist.confirmedBy', 'fullName email')
      .populate('finalApprovedBy', 'fullName email');

    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: 'Clearance not found'
      });
    }

    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr'].includes(r));
    if (!canManage) {
      const myEmpId = await resolveUserEmployeeId(req.user);
      if (!myEmpId || clearance.employee?._id?.toString() !== myEmpId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own exit clearance record'
        });
      }
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
    const { status, confirmedBy, remarks, isConfirmed } = req.body;

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

    let newStatus = status;
    if (!newStatus) {
      if (isConfirmed === true) newStatus = 'cleared';
      else if (isConfirmed === false) newStatus = 'pending';
      else newStatus = item.status === 'cleared' ? 'pending' : 'cleared';
    }

    item.status = newStatus;
    if (newStatus === 'cleared') {
      item.confirmedBy = confirmedBy || req.user?._id;
      item.confirmedAt = new Date();
    } else {
      item.confirmedBy = null;
      item.confirmedAt = null;
    }

    if (remarks !== undefined) item.remarks = remarks;

    // If any item is in progress or cleared, transition root clearance status to 'in_progress'
    if (clearance.status === 'pending') {
      clearance.status = 'in_progress';
    }

    await clearance.save();

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

// Final approval for clearance
export const finalApproveClearance = async (req, res) => {
  try {
    const finalApprovedBy = req.body?.finalApprovedBy || req.user?._id;
    const status = req.body?.status || 'approved';

    if (!finalApprovedBy) {
      return res.status(400).json({
        success: false,
        message: 'finalApprovedBy user reference is required'
      });
    }

    const clearance = await Clearance.findById(req.params.id);
    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: 'Clearance not found'
      });
    }

    // Verify all checklist items are cleared
    const hasUnclearedItems = clearance.checklist && clearance.checklist.some((c) => c.status !== 'cleared');
    if (hasUnclearedItems) {
      return res.status(400).json({
        success: false,
        message: 'Cannot grant final approval until all department checklist items are signed off'
      });
    }

    clearance.finalApprovedBy = finalApprovedBy;
    clearance.status = status;
    clearance.completedAt = new Date();

    await clearance.save();

    // Mark employee as terminated upon finalized clearance
    if (clearance.employee) {
      try {
        await Employee.findByIdAndUpdate(clearance.employee, { status: 'terminated' });
      } catch (empErr) {
        console.warn('Could not update employee status upon final clearance:', empErr.message);
      }
    }

    const populated = await clearance.populate([
      { path: 'employee', select: 'fullName email department position' },
      { path: 'finalApprovedBy', select: 'fullName email' }
    ]);

    res.status(200).json({
      success: true,
      message: `Clearance marked as ${status}`,
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

