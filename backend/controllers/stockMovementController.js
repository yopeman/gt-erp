import StockMovement from '../models/StockMovement.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { recordStockMovementWithBalance, generateCode } from '../utils/inventoryHelper.js';

// Create a stock movement record and automatically update balance
export const createStockMovement = async (req, res) => {
  try {
    const {
      movementNumber,
      item,
      warehouse,
      movementType,
      quantity,
      unitCost,
      referenceType,
      referenceId,
      reason,
      note,
      attachments,
      performedBy,
      approvedBy,
      movementDate
    } = req.body;

    if (!item || !warehouse || !movementType || quantity === undefined) {
      return sendError(res, 'Item, warehouse, movementType, and quantity are required', 400);
    }

    const movement = await recordStockMovementWithBalance({
      movementNumber: movementNumber || generateCode('MOV'),
      item,
      warehouse,
      movementType,
      quantity: Number(quantity),
      unitCost: Number(unitCost || 0),
      referenceType: referenceType || 'manual adjustment',
      referenceId,
      reason,
      note,
      attachments: attachments || [],
      performedBy: performedBy || req.user?._id,
      approvedBy,
      movementDate: movementDate ? new Date(movementDate) : new Date()
    });

    const populated = await movement.populate([
      { path: 'item', select: 'itemName itemCode unitOfMeasurement' },
      { path: 'warehouse', select: 'warehouseName warehouseCode' },
      { path: 'performedBy', select: 'fullName email' },
      { path: 'approvedBy', select: 'fullName email' }
    ]);

    return sendSuccess(res, 'Stock movement recorded successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to record stock movement', 500, error);
  }
};

// Get stock movements with filters & pagination
export const getStockMovements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      item,
      warehouse,
      movementType,
      referenceType,
      referenceId,
      startDate,
      endDate
    } = req.query;

    const query = {};
    if (item) query.item = item;
    if (warehouse) query.warehouse = warehouse;
    if (movementType) query.movementType = movementType;
    if (referenceType) query.referenceType = referenceType;
    if (referenceId) query.referenceId = referenceId;

    if (startDate || endDate) {
      query.movementDate = {};
      if (startDate) query.movementDate.$gte = new Date(startDate);
      if (endDate) query.movementDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await StockMovement.countDocuments(query);
    const movements = await StockMovement.find(query)
      .populate('item', 'itemName itemCode unitOfMeasurement')
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('performedBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .sort({ movementDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Stock movements retrieved successfully', movements, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch stock movements', 500, error);
  }
};

// Get single stock movement by ID
export const getStockMovementById = async (req, res) => {
  try {
    const movement = await StockMovement.findById(req.params.id)
      .populate('item')
      .populate('warehouse')
      .populate('performedBy', 'fullName email')
      .populate('approvedBy', 'fullName email');

    if (!movement) {
      return sendError(res, 'Stock movement not found', 404);
    }
    return sendSuccess(res, 'Stock movement retrieved successfully', movement);
  } catch (error) {
    return sendError(res, 'Failed to retrieve stock movement', 500, error);
  }
};

