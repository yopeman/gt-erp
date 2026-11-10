import Machine from '../models/Machine.js';
import Warehouse from '../models/Warehouse.js';
import Employee from '../models/Employee.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Get machines with pagination, category/status filters and search
export const getMachines = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      category,
      status,
      warehouse
    } = req.query;

    const query = { isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { machineCode: { $regex: search.trim(), $options: 'i' } },
        { manufacturer: { $regex: search.trim(), $options: 'i' } },
        { model: { $regex: search.trim(), $options: 'i' } },
        { serialNumber: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (warehouse && warehouse !== 'all') {
      query.warehouse = warehouse;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Machine.countDocuments(query);

    const machines = await Machine.find(query)
      .populate('warehouse', 'warehouseName warehouseCode location')
      .populate('assignedOperators', 'firstName lastName employeeId phone position')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Machines retrieved successfully', {
      machines,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch machines', 500, error);
  }
};

// Get single machine by ID
export const getMachineById = async (req, res) => {
  try {
    const { id } = req.params;
    const machine = await Machine.findOne({ _id: id, isDeleted: false })
      .populate('warehouse', 'warehouseName warehouseCode location')
      .populate('assignedOperators', 'firstName lastName employeeId phone position email');

    if (!machine) {
      return sendError(res, 'Machine not found', 404);
    }

    return sendSuccess(res, 'Machine details retrieved successfully', machine);
  } catch (error) {
    return sendError(res, 'Failed to retrieve machine', 500, error);
  }
};

// Create a new machine registry entry
export const createMachine = async (req, res) => {
  try {
    const {
      machineCode,
      name,
      category,
      manufacturer,
      model,
      serialNumber,
      yearOfManufacture,
      hourlyCostRate,
      warehouse,
      assignedOperators,
      status,
      specifications,
      checklists,
      notes
    } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, 'Machine name is required', 400);
    }

    if (!category) {
      return sendError(res, 'Machine category is required', 400);
    }

    if (machineCode) {
      const existing = await Machine.findOne({ machineCode: machineCode.trim().toUpperCase(), isDeleted: false });
      if (existing) {
        return sendError(res, 'Machine code already exists', 400);
      }
    }

    // Default checklists if not provided
    const defaultChecklists = checklists || {
      daily: [
        'Inspect lubrication & oil levels',
        'Clean ink fountains & blanket cylinders',
        'Verify emergency stop buttons & safety guards',
        'Inspect air pressure and vacuum filters'
      ],
      weekly: [
        'Check drive belts and roller tension',
        'Clean electronic sensors and optical eyes',
        'Inspect dampening solution pH & conductivity'
      ],
      monthly: [
        'Grease main bearings and gear drives',
        'Calibrate color spectrophotometer / register marks',
        'Deep electrical system audit'
      ]
    };

    const machine = await Machine.create({
      machineCode: machineCode ? machineCode.trim().toUpperCase() : undefined,
      name: name.trim(),
      category,
      manufacturer: manufacturer?.trim() || '',
      model: model?.trim() || '',
      serialNumber: serialNumber?.trim() || undefined,
      yearOfManufacture: yearOfManufacture ? Number(yearOfManufacture) : null,
      hourlyCostRate: Number(hourlyCostRate || 0),
      warehouse: warehouse || null,
      assignedOperators: assignedOperators || [],
      status: status || 'available',
      specifications: {
        maxSheetWidthMm: Number(specifications?.maxSheetWidthMm || 0),
        maxSheetLengthMm: Number(specifications?.maxSheetLengthMm || 0),
        maxSpeedPerHour: Number(specifications?.maxSpeedPerHour || 0),
        powerRatingKw: Number(specifications?.powerRatingKw || 0)
      },
      checklists: defaultChecklists,
      notes: notes?.trim() || ''
    });

    const populated = await Machine.findById(machine._id)
      .populate('warehouse', 'warehouseName warehouseCode location')
      .populate('assignedOperators', 'firstName lastName employeeId phone position');

    return sendSuccess(res, 'Machine registered successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create machine', 500, error);
  }
};

// Update machine
export const updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const machine = await Machine.findOne({ _id: id, isDeleted: false });

    if (!machine) {
      return sendError(res, 'Machine not found', 404);
    }

    const {
      name,
      category,
      manufacturer,
      model,
      serialNumber,
      yearOfManufacture,
      hourlyCostRate,
      warehouse,
      assignedOperators,
      status,
      specifications,
      checklists,
      totalOperatingHours,
      nextScheduledMaintenance,
      notes
    } = req.body;

    if (name) machine.name = name.trim();
    if (category) machine.category = category;
    if (manufacturer !== undefined) machine.manufacturer = manufacturer.trim();
    if (model !== undefined) machine.model = model.trim();
    if (serialNumber !== undefined) machine.serialNumber = serialNumber.trim() || undefined;
    if (yearOfManufacture !== undefined) machine.yearOfManufacture = yearOfManufacture ? Number(yearOfManufacture) : null;
    if (hourlyCostRate !== undefined) machine.hourlyCostRate = Number(hourlyCostRate);
    if (warehouse !== undefined) machine.warehouse = warehouse || null;
    if (assignedOperators !== undefined) machine.assignedOperators = assignedOperators;
    if (status) machine.status = status;
    if (specifications) {
      machine.specifications = {
        maxSheetWidthMm: Number(specifications.maxSheetWidthMm ?? machine.specifications?.maxSheetWidthMm ?? 0),
        maxSheetLengthMm: Number(specifications.maxSheetLengthMm ?? machine.specifications?.maxSheetLengthMm ?? 0),
        maxSpeedPerHour: Number(specifications.maxSpeedPerHour ?? machine.specifications?.maxSpeedPerHour ?? 0),
        powerRatingKw: Number(specifications.powerRatingKw ?? machine.specifications?.powerRatingKw ?? 0)
      };
    }
    if (checklists) machine.checklists = checklists;
    if (totalOperatingHours !== undefined) machine.totalOperatingHours = Number(totalOperatingHours);
    if (nextScheduledMaintenance !== undefined) machine.nextScheduledMaintenance = nextScheduledMaintenance;
    if (notes !== undefined) machine.notes = notes.trim();

    await machine.save();

    const populated = await Machine.findById(machine._id)
      .populate('warehouse', 'warehouseName warehouseCode location')
      .populate('assignedOperators', 'firstName lastName employeeId phone position');

    return sendSuccess(res, 'Machine updated successfully', populated);
  } catch (error) {
    return sendError(res, 'Failed to update machine', 500, error);
  }
};

// Fast status toggle
export const updateMachineStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['available', 'running', 'maintenance', 'breakdown', 'decommissioned'];
    if (!allowed.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${allowed.join(', ')}`, 400);
    }

    const machine = await Machine.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { status } },
      { new: true }
    )
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('assignedOperators', 'firstName lastName employeeId phone');

    if (!machine) {
      return sendError(res, 'Machine not found', 404);
    }

    return sendSuccess(res, `Machine status updated to ${status}`, machine);
  } catch (error) {
    return sendError(res, 'Failed to update status', 500, error);
  }
};

// Soft delete machine
export const deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const machine = await Machine.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!machine) {
      return sendError(res, 'Machine not found', 404);
    }

    return sendSuccess(res, 'Machine deleted successfully', { id: machine._id });
  } catch (error) {
    return sendError(res, 'Failed to delete machine', 500, error);
  }
};

// Aggregated machine statistics
export const getMachineStats = async (req, res) => {
  try {
    const [total, available, running, maintenance, breakdown] = await Promise.all([
      Machine.countDocuments({ isDeleted: false }),
      Machine.countDocuments({ isDeleted: false, status: 'available' }),
      Machine.countDocuments({ isDeleted: false, status: 'running' }),
      Machine.countDocuments({ isDeleted: false, status: 'maintenance' }),
      Machine.countDocuments({ isDeleted: false, status: 'breakdown' })
    ]);

    const categoryStats = await Machine.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$category', count: { $sum: 1 }, avgHourlyRate: { $avg: '$hourlyCostRate' } } }
    ]);

    return sendSuccess(res, 'Machine statistics retrieved', {
      total,
      available,
      running,
      maintenance,
      breakdown,
      categoryStats
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch statistics', 500, error);
  }
};

