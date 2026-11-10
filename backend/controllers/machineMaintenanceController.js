import MachineMaintenance from '../models/MachineMaintenance.js';
import Machine from '../models/Machine.js';
import InventoryItem from '../models/InventoryItem.js';
import Warehouse from '../models/Warehouse.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { recordStockMovementWithBalance, generateCode } from '../utils/inventoryHelper.js';

// Get maintenance tickets with filters
export const getMaintenances = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      machine,
      status,
      priority,
      maintenanceType,
      startDate,
      endDate
    } = req.query;

    const query = { isDeleted: false };

    if (search) {
      query.$or = [
        { maintenanceNumber: { $regex: search.trim(), $options: 'i' } },
        { issueDescription: { $regex: search.trim(), $options: 'i' } },
        { externalServiceProvider: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (machine && machine !== 'all') {
      query.machine = machine;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (maintenanceType && maintenanceType !== 'all') {
      query.maintenanceType = maintenanceType;
    }

    if (startDate || endDate) {
      query.reportedAt = {};
      if (startDate) query.reportedAt.$gte = new Date(startDate);
      if (endDate) query.reportedAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await MachineMaintenance.countDocuments(query);

    const maintenances = await MachineMaintenance.find(query)
      .populate('machine', 'machineCode name category status warehouse hourlyCostRate')
      .populate('reportedBy', 'firstName lastName employeeId phone position')
      .populate('assignedTechnician', 'firstName lastName employeeId phone position')
      .populate('approvedBy', 'firstName lastName employeeId')
      .populate('sparePartsUsed.item', 'itemCode itemName unit costPrice')
      .sort({ reportedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Maintenance records retrieved successfully', {
      maintenances,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch maintenance records', 500, error);
  }
};

// Get single maintenance record
export const getMaintenanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const maintenance = await MachineMaintenance.findOne({ _id: id, isDeleted: false })
      .populate('machine', 'machineCode name category status warehouse hourlyCostRate totalOperatingHours')
      .populate('reportedBy', 'firstName lastName employeeId phone position email')
      .populate('assignedTechnician', 'firstName lastName employeeId phone position email')
      .populate('approvedBy', 'firstName lastName employeeId')
      .populate('sparePartsUsed.item', 'itemCode itemName unit costPrice currentStock');

    if (!maintenance) {
      return sendError(res, 'Maintenance record not found', 404);
    }

    return sendSuccess(res, 'Maintenance record retrieved successfully', maintenance);
  } catch (error) {
    return sendError(res, 'Failed to retrieve maintenance record', 500, error);
  }
};

// Create a maintenance ticket / breakdown report
export const createMaintenance = async (req, res) => {
  try {
    const {
      machine: machineId,
      maintenanceType,
      priority,
      reportedBy,
      assignedTechnician,
      externalServiceProvider,
      issueDescription,
      rootCause,
      technicianLaborCost,
      externalServiceCost,
      sparePartsUsed
    } = req.body;

    if (!machineId) {
      return sendError(res, 'Machine is required', 400);
    }

    if (!maintenanceType) {
      return sendError(res, 'Maintenance type is required', 400);
    }

    if (!issueDescription || !issueDescription.trim()) {
      return sendError(res, 'Issue description is required', 400);
    }

    const machineDoc = await Machine.findOne({ _id: machineId, isDeleted: false });
    if (!machineDoc) {
      return sendError(res, 'Machine not found', 404);
    }

    const reporter = reportedBy || req.user?.employee?._id || req.user?.employee || null;
    if (!reporter) {
      return sendError(res, 'Reporting employee is required', 400);
    }

    const maintenance = await MachineMaintenance.create({
      machine: machineDoc._id,
      maintenanceType,
      priority: priority || 'medium',
      reportedBy: reporter,
      assignedTechnician: assignedTechnician || null,
      externalServiceProvider: externalServiceProvider?.trim() || '',
      issueDescription: issueDescription.trim(),
      rootCause: rootCause?.trim() || '',
      technicianLaborCost: Number(technicianLaborCost || 0),
      externalServiceCost: Number(externalServiceCost || 0),
      sparePartsUsed: sparePartsUsed || [],
      status: 'reported'
    });

    // Auto-update machine status
    if (maintenanceType === 'breakdown_repair' || priority === 'critical') {
      machineDoc.status = 'breakdown';
    } else {
      machineDoc.status = 'maintenance';
    }
    await machineDoc.save();

    const populated = await MachineMaintenance.findById(maintenance._id)
      .populate('machine', 'machineCode name category status')
      .populate('reportedBy', 'firstName lastName employeeId phone position')
      .populate('assignedTechnician', 'firstName lastName employeeId phone position');

    return sendSuccess(res, 'Maintenance ticket logged successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create maintenance ticket', 500, error);
  }
};

// Update maintenance ticket
export const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const maintenance = await MachineMaintenance.findOne({ _id: id, isDeleted: false });

    if (!maintenance) {
      return sendError(res, 'Maintenance record not found', 404);
    }

    const {
      maintenanceType,
      priority,
      assignedTechnician,
      externalServiceProvider,
      issueDescription,
      rootCause,
      correctiveActionTaken,
      technicianLaborCost,
      externalServiceCost,
      sparePartsUsed,
      status,
      approvedBy
    } = req.body;

    if (maintenanceType) maintenance.maintenanceType = maintenanceType;
    if (priority) maintenance.priority = priority;
    if (assignedTechnician !== undefined) maintenance.assignedTechnician = assignedTechnician || null;
    if (externalServiceProvider !== undefined) maintenance.externalServiceProvider = externalServiceProvider.trim();
    if (issueDescription) maintenance.issueDescription = issueDescription.trim();
    if (rootCause !== undefined) maintenance.rootCause = rootCause.trim();
    if (correctiveActionTaken !== undefined) maintenance.correctiveActionTaken = correctiveActionTaken.trim();
    if (technicianLaborCost !== undefined) maintenance.technicianLaborCost = Number(technicianLaborCost);
    if (externalServiceCost !== undefined) maintenance.externalServiceCost = Number(externalServiceCost);
    if (sparePartsUsed !== undefined) maintenance.sparePartsUsed = sparePartsUsed;
    if (status) maintenance.status = status;
    if (approvedBy !== undefined) maintenance.approvedBy = approvedBy || null;

    await maintenance.save();

    const populated = await MachineMaintenance.findById(maintenance._id)
      .populate('machine', 'machineCode name category status')
      .populate('reportedBy', 'firstName lastName employeeId phone position')
      .populate('assignedTechnician', 'firstName lastName employeeId phone position')
      .populate('sparePartsUsed.item', 'itemCode itemName unit costPrice');

    return sendSuccess(res, 'Maintenance record updated successfully', populated);
  } catch (error) {
    return sendError(res, 'Failed to update maintenance record', 500, error);
  }
};

// Start maintenance
export const startMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const maintenance = await MachineMaintenance.findOne({ _id: id, isDeleted: false });

    if (!maintenance) {
      return sendError(res, 'Maintenance record not found', 404);
    }

    maintenance.status = 'in_progress';
    if (!maintenance.startedAt) {
      maintenance.startedAt = new Date();
    }
    await maintenance.save();

    // Ensure machine status reflects maintenance
    await Machine.updateOne(
      { _id: maintenance.machine },
      { $set: { status: 'maintenance' } }
    );

    const populated = await MachineMaintenance.findById(maintenance._id)
      .populate('machine', 'machineCode name category status')
      .populate('reportedBy', 'firstName lastName employeeId')
      .populate('assignedTechnician', 'firstName lastName employeeId');

    return sendSuccess(res, 'Maintenance marked as in progress', populated);
  } catch (error) {
    return sendError(res, 'Failed to start maintenance', 500, error);
  }
};

// Complete maintenance and resolve machine status + inventory spare parts deduction
export const completeMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const maintenance = await MachineMaintenance.findOne({ _id: id, isDeleted: false });

    if (!maintenance) {
      return sendError(res, 'Maintenance record not found', 404);
    }

    const {
      completedAt,
      downtimeHours,
      correctiveActionTaken,
      rootCause,
      technicianLaborCost,
      externalServiceCost,
      sparePartsUsed,
      approvedBy
    } = req.body;

    maintenance.completedAt = completedAt ? new Date(completedAt) : new Date();
    if (!maintenance.startedAt) {
      maintenance.startedAt = maintenance.reportedAt || new Date();
    }

    if (downtimeHours !== undefined) {
      maintenance.downtimeHours = Number(downtimeHours);
    }

    if (correctiveActionTaken !== undefined) {
      maintenance.correctiveActionTaken = correctiveActionTaken.trim();
    }
    if (rootCause !== undefined) {
      maintenance.rootCause = rootCause.trim();
    }
    if (technicianLaborCost !== undefined) {
      maintenance.technicianLaborCost = Number(technicianLaborCost);
    }
    if (externalServiceCost !== undefined) {
      maintenance.externalServiceCost = Number(externalServiceCost);
    }
    if (approvedBy !== undefined) {
      maintenance.approvedBy = approvedBy || null;
    }

    // Process spare parts if provided
    if (Array.isArray(sparePartsUsed)) {
      maintenance.sparePartsUsed = sparePartsUsed;
    }

    maintenance.status = 'completed';
    await maintenance.save();

    // Fetch machine to restore operational state and get warehouse location
    const machine = await Machine.findOne({ _id: maintenance.machine });
    if (machine) {
      machine.status = 'available';
      machine.lastMaintenanceDate = maintenance.completedAt;
      
      // Schedule next maintenance in 90 days by default if not set
      const nextDate = new Date(maintenance.completedAt);
      nextDate.setDate(nextDate.getDate() + 90);
      machine.nextScheduledMaintenance = nextDate;

      await machine.save();

      // Deduct spare parts from inventory if spare parts were used and warehouse exists
      if (Array.isArray(maintenance.sparePartsUsed) && maintenance.sparePartsUsed.length > 0) {
        const warehouseId = machine.warehouse || (await Warehouse.findOne({ isDeleted: false }))?._id;
        if (warehouseId) {
          for (const part of maintenance.sparePartsUsed) {
            if (part.item && part.quantity > 0) {
              try {
                await recordStockMovementWithBalance({
                  movementNumber: generateCode('MNT-MOV'),
                  item: part.item,
                  warehouse: warehouseId,
                  movementType: 'stock issue',
                  quantity: part.quantity,
                  unitCost: part.unitCost || 0,
                  referenceType: 'other',
                  referenceId: maintenance._id,
                  reason: `Machine repair ${maintenance.maintenanceNumber} for ${machine.machineCode}`,
                  note: `Spare part consumption logged automatically by machine maintenance`,
                  performedBy: maintenance.assignedTechnician || maintenance.reportedBy,
                  performedByModel: 'Employee',
                  approvedBy: maintenance.approvedBy || null,
                  approvedByModel: 'Employee',
                  movementDate: maintenance.completedAt
                });
              } catch (stockErr) {
                console.error(`Warning: could not deduct spare part ${part.item}:`, stockErr.message);
              }
            }
          }
        }
      }
    }

    const populated = await MachineMaintenance.findById(maintenance._id)
      .populate('machine', 'machineCode name category status')
      .populate('reportedBy', 'firstName lastName employeeId phone position')
      .populate('assignedTechnician', 'firstName lastName employeeId phone position')
      .populate('approvedBy', 'firstName lastName employeeId')
      .populate('sparePartsUsed.item', 'itemCode itemName unit costPrice');

    return sendSuccess(res, 'Maintenance successfully completed and machine restored to operational state', populated);
  } catch (error) {
    return sendError(res, 'Failed to complete maintenance', 500, error);
  }
};

// Soft delete
export const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const maintenance = await MachineMaintenance.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!maintenance) {
      return sendError(res, 'Maintenance record not found', 404);
    }

    return sendSuccess(res, 'Maintenance record deleted successfully', { id: maintenance._id });
  } catch (error) {
    return sendError(res, 'Failed to delete maintenance record', 500, error);
  }
};

