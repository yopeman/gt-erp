import Overtime from '../models/Overtime.js';

// Create overtime request
export const createOvertime = async (req, res) => {
  try {
    const {
      employee,
      startAt,
      workedHours,
      reason,
      type,
      calculationRate,
      isPreApproved
    } = req.body;

    if (!employee || !startAt || workedHours === undefined) {
      return res.status(400).json({
        success: false,
        message: 'employee, startAt, and workedHours are required'
      });
    }

    const overtime = await Overtime.create({
      employee,
      startAt,
      workedHours,
      approvedHours: isPreApproved ? workedHours : 0,
      reason,
      type: type || 'calendar',
      calculationRate: calculationRate || 1.5,
      isPreApproved: Boolean(isPreApproved),
      status: 'pending',
      paymentStatus: 'unpaid'
    });

    const populated = await overtime.populate('employee', 'fullName email department position');

    res.status(201).json({
      success: true,
      message: 'Overtime request created successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create overtime request',
      error: error.message
    });
  }
};

// Get all overtimes with filters and pagination
export const getOvertimes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      employee,
      status,
      paymentStatus,
      type,
      startDate,
      endDate
    } = req.query;

    const query = {};

    if (employee) query.employee = employee;
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (type) query.type = type;

    if (startDate || endDate) {
      query.startAt = {};
      if (startDate) query.startAt.$gte = new Date(startDate);
      if (endDate) query.startAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Overtime.countDocuments(query);
    const overtimes = await Overtime.find(query)
      .populate('employee', 'fullName email department position')
      .populate('approvedBy', 'fullName email')
      .sort({ startAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: overtimes,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overtime records',
      error: error.message
    });
  }
};

// Get overtime by ID
export const getOvertimeById = async (req, res) => {
  try {
    const overtime = await Overtime.findById(req.params.id)
      .populate('employee', 'fullName email department position')
      .populate('approvedBy', 'fullName email');

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: overtime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overtime record',
      error: error.message
    });
  }
};

// Update overtime request
export const updateOvertime = async (req, res) => {
  try {
    const overtime = await Overtime.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('employee', 'fullName email department position')
      .populate('approvedBy', 'fullName email');

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Overtime record updated successfully',
      data: overtime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update overtime record',
      error: error.message
    });
  }
};

// Review / Approve / Reject overtime
export const reviewOvertime = async (req, res) => {
  try {
    const { status, approvedHours, approvedBy } = req.body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'approved', 'rejected', or 'pending'"
      });
    }

    const updateData = {
      status,
      approvedBy: approvedBy || null
    };

    if (approvedHours !== undefined) {
      updateData.approvedHours = approvedHours;
    }

    const overtime = await Overtime.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('employee', 'fullName email department position')
      .populate('approvedBy', 'fullName email');

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Overtime record ${status} successfully`,
      data: overtime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to review overtime record',
      error: error.message
    });
  }
};

// Update overtime payment status
export const updateOvertimePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!['paid', 'unpaid', 'partially'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "paymentStatus must be 'paid', 'unpaid', or 'partially'"
      });
    }

    const overtime = await Overtime.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true }
    );

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Overtime payment status updated successfully',
      data: overtime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update overtime payment status',
      error: error.message
    });
  }
};

// Delete overtime
export const deleteOvertime = async (req, res) => {
  try {
    const overtime = await Overtime.findByIdAndDelete(req.params.id);
    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Overtime record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete overtime record',
      error: error.message
    });
  }
};

