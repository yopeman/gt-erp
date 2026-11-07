import StockAdjustment from '../models/StockAdjustment.js';
import StockBalance from '../models/StockBalance.js';
import InventoryItem from '../models/InventoryItem.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  generateCode,
  recordStockMovementWithBalance,
  recordApproval,
  recordAudit
} from '../utils/inventoryHelper.js';

// Create stock adjustment request
export const createStockAdjustment = async (req, res) => {
  try {
    const {
      warehouse,
      item,
      systemQuantity,
      physicalQuantity,
      reason,
      description,
      attachments
    } = req.body;

    if (!warehouse || !item || physicalQuantity === undefined || !reason) {
      return sendError(res, 'Warehouse, item, physicalQuantity and reason are required', 400);
    }

    // Determine system quantity from current stock balance if not supplied
    let sysQty = systemQuantity;
    if (sysQty === undefined) {
      const balance = await StockBalance.findOne({ warehouse, item });
      sysQty = balance ? balance.quantityOnHand : 0;
    }

    const difference = Number(physicalQuantity) - Number(sysQty);
    const adjustmentNumber = generateCode('ADJ');

    const requesterId = req.user?.employee?._id || req.user?.employee || req.user?._id;
    const requestedByModel = req.user?.employee ? 'Employee' : 'User';

    const adjustment = await StockAdjustment.create({
      adjustmentNumber,
      warehouse,
      item,
      systemQuantity: sysQty,
      physicalQuantity: Number(physicalQuantity),
      difference,
      reason,
      description,
      attachments: attachments || [],
      requestedBy: requesterId,
      requestedByModel,
      status: 'pending'
    });

    await recordApproval({
      referenceType: 'stock adjustment',
      referenceId: adjustment._id,
      action: 'submitted',
      actionBy: req.user?._id,
      actionByModel: 'User',
      comment: `Stock adjustment ${adjustmentNumber} created`
    });

    const populated = await adjustment.populate([
      { path: 'warehouse', select: 'warehouseName warehouseCode' },
      { path: 'item', select: 'itemName itemCode unitOfMeasurement unitCost' },
      { path: 'requestedBy', select: 'fullName email' }
    ]);

    return sendSuccess(res, 'Stock adjustment request created successfully', populated, 201);
  } catch (error) {
    console.error('Failed to create stock adjustment:', error);
    return sendError(res, 'Failed to create stock adjustment', 500, error);
  }
};

// Get stock adjustments with filters
export const getStockAdjustments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      warehouse,
      item,
      status,
      reason,
      startDate,
      endDate
    } = req.query;

    const query = {};
    if (warehouse) query.warehouse = warehouse;
    if (item) query.item = item;
    if (status) query.status = status;
    if (reason) query.reason = reason;

    if (startDate || endDate) {
      query.adjustmentDate = {};
      if (startDate) query.adjustmentDate.$gte = new Date(startDate);
      if (endDate) query.adjustmentDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await StockAdjustment.countDocuments(query);
    const adjustments = await StockAdjustment.find(query)
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('item', 'itemName itemCode unitOfMeasurement unitCost')
      .populate('requestedBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .sort({ adjustmentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Stock adjustments fetched successfully', adjustments, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch stock adjustments', 500, error);
  }
};

// Get single stock adjustment
export const getStockAdjustmentById = async (req, res) => {
  try {
    const adjustment = await StockAdjustment.findById(req.params.id)
      .populate('warehouse')
      .populate('item')
      .populate('requestedBy', 'fullName email')
      .populate('approvedBy', 'fullName email');

    if (!adjustment) {
      return sendError(res, 'Stock adjustment not found', 404);
    }
    return sendSuccess(res, 'Stock adjustment retrieved successfully', adjustment);
  } catch (error) {
    return sendError(res, 'Failed to retrieve stock adjustment', 500, error);
  }
};

// Approve or reject stock adjustment
export const handleApproval = async (req, res) => {
  try {
    const status = req.body.status || (req.body.approved === true ? 'approved' : req.body.approved === false ? 'rejected' : undefined);
    const comment = req.body.comment;

    if (!['approved', 'rejected'].includes(status)) {
      return sendError(res, 'Status must be approved or rejected', 400);
    }

    const adjustment = await StockAdjustment.findById(req.params.id);
    if (!adjustment) {
      return sendError(res, 'Stock adjustment not found', 404);
    }

    if (adjustment.status !== 'pending') {
      return sendError(res, `Cannot modify adjustment with status "${adjustment.status}"`, 400);
    }

    const approverId = req.user?.employee?._id || req.user?.employee || req.user?._id;
    const approvedByModel = req.user?.employee ? 'Employee' : 'User';

    adjustment.status = status === 'approved' ? 'completed' : 'rejected';
    adjustment.approvedBy = approverId;
    adjustment.approvedByModel = approvedByModel;
    await adjustment.save();

    // If approved, create Stock Movement and update Stock Balance!
    if (status === 'approved') {
      const itemDoc = await InventoryItem.findById(adjustment.item);
      const unitCost = itemDoc ? itemDoc.unitCost : 0;

      await recordStockMovementWithBalance({
        movementNumber: generateCode('MOV-ADJ'),
        item: adjustment.item,
        warehouse: adjustment.warehouse,
        movementType: 'adjustment',
        quantity: adjustment.difference, // difference can be positive or negative
        unitCost,
        referenceType: 'manual adjustment',
        referenceId: adjustment._id,
        reason: adjustment.reason,
        note: adjustment.description,
        performedBy: adjustment.requestedBy,
        performedByModel: adjustment.requestedByModel || 'User',
        approvedBy: approverId,
        approvedByModel
      });

      await recordAudit({
        item: adjustment.item,
        warehouse: adjustment.warehouse,
        action: 'stock changed',
        performedBy: req.user?._id,
        reason: `Stock adjusted by ${adjustment.difference} (Reason: ${adjustment.reason})`
      });
    }

    await recordApproval({
      referenceType: 'stock adjustment',
      referenceId: adjustment._id,
      action: status,
      actionBy: req.user?._id,
      actionByModel: 'User',
      comment: comment || `Adjustment ${status}`
    });

    return sendSuccess(res, `Stock adjustment ${status} successfully`, adjustment);
  } catch (error) {
    console.error('Failed to process stock adjustment approval:', error);
    return sendError(res, 'Failed to process stock adjustment approval', 500, error);
  }
};

