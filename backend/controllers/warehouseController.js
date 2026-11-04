import Warehouse from '../models/Warehouse.js';
import StockBalance from '../models/StockBalance.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Create warehouse
export const createWarehouse = async (req, res) => {
  try {
    const { warehouseName, warehouseCode, description, branch, location, manager, contactPerson, phoneNumber, status } = req.body;

    if (!warehouseName || !warehouseCode) {
      return sendError(res, 'Warehouse name and warehouse code are required', 400);
    }

    const existing = await Warehouse.findOne({ warehouseCode: warehouseCode.toUpperCase().trim() });
    if (existing) {
      return sendError(res, 'Warehouse with this code already exists', 400);
    }

    const warehouse = await Warehouse.create({
      warehouseName,
      warehouseCode: warehouseCode.toUpperCase().trim(),
      description,
      branch,
      location,
      manager: manager || null,
      contactPerson,
      phoneNumber,
      status: status || 'active'
    });

    const populated = await warehouse.populate('manager', 'fullName email department position');

    return sendSuccess(res, 'Warehouse created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create warehouse', 500, error);
  }
};

// Get warehouses with pagination, search, branch & status filters
export const getWarehouses = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, branch, status, includeDeleted = 'false' } = req.query;

    const query = {};
    if (includeDeleted !== 'true') {
      query.isDeleted = false;
    }
    if (status) query.status = status;
    if (branch) query.branch = branch;

    if (search) {
      query.$or = [
        { warehouseName: { $regex: search, $options: 'i' } },
        { warehouseCode: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Warehouse.countDocuments(query);
    const warehouses = await Warehouse.find(query)
      .populate('manager', 'fullName email department position')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Warehouses fetched successfully', warehouses, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch warehouses', 500, error);
  }
};

// Get single warehouse by ID
export const getWarehouseById = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id).populate('manager', 'fullName email department position');
    if (!warehouse) {
      return sendError(res, 'Warehouse not found', 404);
    }
    return sendSuccess(res, 'Warehouse retrieved successfully', warehouse);
  } catch (error) {
    return sendError(res, 'Failed to retrieve warehouse', 500, error);
  }
};

// Update warehouse
export const updateWarehouse = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.warehouseCode) {
      updates.warehouseCode = updates.warehouseCode.toUpperCase().trim();
      const duplicate = await Warehouse.findOne({
        warehouseCode: updates.warehouseCode,
        _id: { $ne: req.params.id }
      });
      if (duplicate) {
        return sendError(res, 'Another warehouse already has this code', 400);
      }
    }

    const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).populate('manager', 'fullName email department position');

    if (!warehouse) {
      return sendError(res, 'Warehouse not found', 404);
    }

    return sendSuccess(res, 'Warehouse updated successfully', warehouse);
  } catch (error) {
    return sendError(res, 'Failed to update warehouse', 500, error);
  }
};

// Soft delete warehouse
export const deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, status: 'inactive' },
      { new: true }
    );
    if (!warehouse) {
      return sendError(res, 'Warehouse not found', 404);
    }
    return sendSuccess(res, 'Warehouse deactivated successfully', warehouse);
  } catch (error) {
    return sendError(res, 'Failed to delete warehouse', 500, error);
  }
};

