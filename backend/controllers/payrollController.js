import Payroll from '../models/Payroll.js';

// Create a new payroll record
export const createPayroll = async (req, res) => {
  try {
    const {
      employeeId,
      fromDate,
      toDate,
      currency,
      type,
      totalGross,
      totalDeduction,
      totalNet,
      createdBy
    } = req.body;

    if (!employeeId || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'employeeId, fromDate, and toDate are required'
      });
    }

    const gross = Number(totalGross) || 0;
    const deduction = Number(totalDeduction) || 0;
    const net = totalNet !== undefined ? Number(totalNet) : gross - deduction;

    const payroll = await Payroll.create({
      employeeId,
      fromDate,
      toDate,
      currency: currency || 'ETB',
      type: type || 'salary',
      totalGross: gross,
      totalDeduction: deduction,
      totalNet: net,
      createdBy: createdBy || null,
      status: 'unpaid'
    });

    const populated = await payroll.populate([
      { path: 'employeeId', select: 'fullName email department position baseSalary' },
      { path: 'createdBy', select: 'fullName email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Payroll record created successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create payroll record',
      error: error.message
    });
  }
};

// Get all payrolls with filters & pagination
export const getPayrolls = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      employeeId,
      status,
      type,
      fromDate,
      toDate
    } = req.query;

    const query = {};

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (type) query.type = type;

    if (fromDate || toDate) {
      query.fromDate = {};
      if (fromDate) query.fromDate.$gte = new Date(fromDate);
      if (toDate) query.fromDate.$lte = new Date(toDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Payroll.countDocuments(query);
    const payrolls = await Payroll.find(query)
      .populate('employeeId', 'fullName email department position baseSalary')
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: payrolls,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll records',
      error: error.message
    });
  }
};

// Get payroll by ID
export const getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employeeId', 'fullName email department position baseSalary accountDetails')
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll record',
      error: error.message
    });
  }
};

// Update payroll
export const updatePayroll = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (updateData.totalGross !== undefined || updateData.totalDeduction !== undefined) {
      const existing = await Payroll.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Payroll record not found'
        });
      }

      const gross = updateData.totalGross !== undefined ? Number(updateData.totalGross) : existing.totalGross;
      const deduction = updateData.totalDeduction !== undefined ? Number(updateData.totalDeduction) : existing.totalDeduction;
      if (updateData.totalNet === undefined) {
        updateData.totalNet = gross - deduction;
      }
    }

    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('employeeId', 'fullName email department position baseSalary')
      .populate('approvedBy', 'fullName email');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payroll record updated successfully',
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update payroll record',
      error: error.message
    });
  }
};

// Approve payroll
export const approvePayroll = async (req, res) => {
  try {
    const { approvedBy } = req.body;

    if (!approvedBy) {
      return res.status(400).json({
        success: false,
        message: 'approvedBy user ID is required'
      });
    }

    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { approvedBy },
      { new: true }
    )
      .populate('employeeId', 'fullName email department position')
      .populate('approvedBy', 'fullName email');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payroll approved successfully',
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve payroll',
      error: error.message
    });
  }
};

// Mark payroll as paid
export const markPayrollAsPaid = async (req, res) => {
  try {
    const { status = 'paid', paidAt = new Date() } = req.body;

    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { status, paidAt },
      { new: true }
    ).populate('employeeId', 'fullName email department position');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Payroll status updated to ${status}`,
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
};

// Delete payroll
export const deletePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndDelete(req.params.id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payroll record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete payroll record',
      error: error.message
    });
  }
};

