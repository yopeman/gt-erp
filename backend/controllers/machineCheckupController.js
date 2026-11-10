import MachineCheckup from '../models/MachineCheckup.js';
import Machine from '../models/Machine.js';
import MachineMaintenance from '../models/MachineMaintenance.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Get checkup logs with filters
export const getCheckups = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      machine,
      type,
      overallStatus,
      startDate,
      endDate
    } = req.query;

    const query = { isDeleted: false };

    if (machine && machine !== 'all') {
      query.machine = machine;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (overallStatus && overallStatus !== 'all') {
      query.overallStatus = overallStatus;
    }

    if (startDate || endDate) {
      query.inspectionDate = {};
      if (startDate) query.inspectionDate.$gte = new Date(startDate);
      if (endDate) query.inspectionDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await MachineCheckup.countDocuments(query);

    const checkups = await MachineCheckup.find(query)
      .populate('machine', 'machineCode name category status')
      .populate('inspectedBy', 'firstName lastName employeeId phone position')
      .populate('triggeredMaintenanceTicket', 'maintenanceNumber status priority')
      .sort({ inspectionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Machine checkups retrieved successfully', {
      checkups,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch checkups', 500, error);
  }
};

// Get checkup by ID
export const getCheckupById = async (req, res) => {
  try {
    const { id } = req.params;
    const checkup = await MachineCheckup.findOne({ _id: id, isDeleted: false })
      .populate('machine', 'machineCode name category status checklists warehouse')
      .populate('inspectedBy', 'firstName lastName employeeId phone position')
      .populate('triggeredMaintenanceTicket', 'maintenanceNumber status priority issueDescription reportedAt');

    if (!checkup) {
      return sendError(res, 'Checkup not found', 404);
    }

    return sendSuccess(res, 'Checkup retrieved successfully', checkup);
  } catch (error) {
    return sendError(res, 'Failed to retrieve checkup', 500, error);
  }
};

// Submit a preventive inspection checkup
export const createCheckup = async (req, res) => {
  try {
    const {
      machine: machineId,
      type,
      inspectionDate,
      inspectedBy,
      checklistItems,
      remarks,
      createTicketOnFail = true
    } = req.body;

    if (!machineId) {
      return sendError(res, 'Machine is required', 400);
    }

    if (!type || !['daily', 'weekly', 'monthly'].includes(type)) {
      return sendError(res, 'Valid checkup type (daily, weekly, monthly) is required', 400);
    }

    if (!inspectedBy) {
      return sendError(res, 'Inspector employee ID is required', 400);
    }

    if (!Array.isArray(checklistItems) || checklistItems.length === 0) {
      return sendError(res, 'Checklist items are required', 400);
    }

    const machineDoc = await Machine.findOne({ _id: machineId, isDeleted: false });
    if (!machineDoc) {
      return sendError(res, 'Machine not found', 404);
    }

    // Determine overall status based on checklist items
    const failedItems = checklistItems.filter(item => item.status === 'fail');
    const overallStatus = failedItems.length > 0 ? 'failed' : 'passed';

    let triggeredTicket = null;

    // If failed and auto-ticket requested, create a MachineMaintenance record
    if (overallStatus === 'failed' && createTicketOnFail) {
      const failedSummary = failedItems.map(f => `• ${f.task}${f.notes ? `: ${f.notes}` : ''}`).join('\n');
      const ticket = await MachineMaintenance.create({
        machine: machineDoc._id,
        maintenanceType: 'breakdown_repair',
        priority: 'high',
        reportedBy: inspectedBy,
        issueDescription: `Triggered by ${type} checkup failure:\n${failedSummary}`,
        status: 'reported'
      });

      triggeredTicket = ticket._id;

      // Update machine status to maintenance
      machineDoc.status = 'maintenance';
      await machineDoc.save();
    }

    const checkup = await MachineCheckup.create({
      machine: machineDoc._id,
      type,
      inspectionDate: inspectionDate ? new Date(inspectionDate) : new Date(),
      inspectedBy,
      checklistItems,
      overallStatus,
      triggeredMaintenanceTicket: triggeredTicket,
      remarks: remarks?.trim() || ''
    });

    const populated = await MachineCheckup.findById(checkup._id)
      .populate('machine', 'machineCode name category status')
      .populate('inspectedBy', 'firstName lastName employeeId phone position')
      .populate('triggeredMaintenanceTicket', 'maintenanceNumber status priority');

    return sendSuccess(res, 'Checkup recorded successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to record checkup', 500, error);
  }
};

// Soft delete checkup
export const deleteCheckup = async (req, res) => {
  try {
    const { id } = req.params;
    const checkup = await MachineCheckup.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!checkup) {
      return sendError(res, 'Checkup not found', 404);
    }

    return sendSuccess(res, 'Checkup deleted successfully', { id: checkup._id });
  } catch (error) {
    return sendError(res, 'Failed to delete checkup', 500, error);
  }
};

