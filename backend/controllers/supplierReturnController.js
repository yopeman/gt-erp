import SupplierReturn from '../models/SupplierReturn.js';
import InventoryItem from '../models/InventoryItem.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  generateCode,
  recordStockMovementWithBalance,
  recordAudit
} from '../utils/inventoryHelper.js';

// Create supplier return request
export const createSupplierReturn = async (req, res) => {
  try {
    const {
      supplier,
      purchaseOrder,
      goodsReceipt,
      warehouse,
      items,
      returnDate,
      refundAmount,
      attachments,
      notes
    } = req.body;

    if (!supplier || !warehouse || !items || items.length === 0) {
      return sendError(res, 'Supplier, warehouse, and at least one item are required', 400);
    }

    const returnNumber = generateCode('RET');

    const formattedItems = items.map((i) => ({
      item: i.item,
      quantity: Number(i.quantity),
      unitCost: Number(i.unitCost || 0),
      reason: i.reason || '',
      condition: i.condition || 'damaged/defective'
    }));

    const supplierReturn = await SupplierReturn.create({
      returnNumber,
      supplier,
      purchaseOrder: purchaseOrder || null,
      goodsReceipt: goodsReceipt || null,
      warehouse,
      items: formattedItems,
      returnedBy: req.user?._id,
      returnDate: returnDate ? new Date(returnDate) : new Date(),
      refundAmount: Number(refundAmount || 0),
      attachments: attachments || [],
      notes,
      status: 'pending'
    });

    const populated = await supplierReturn.populate([
      { path: 'supplier', select: 'supplierName supplierCode' },
      { path: 'warehouse', select: 'warehouseName warehouseCode' },
      { path: 'items.item', select: 'itemName itemCode unitOfMeasurement' },
      { path: 'returnedBy', select: 'fullName email' }
    ]);

    return sendSuccess(res, 'Supplier return created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create supplier return', 500, error);
  }
};

// Get supplier returns
export const getSupplierReturns = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      supplier,
      warehouse,
      status,
      startDate,
      endDate
    } = req.query;

    const query = {};
    if (supplier) query.supplier = supplier;
    if (warehouse) query.warehouse = warehouse;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.returnDate = {};
      if (startDate) query.returnDate.$gte = new Date(startDate);
      if (endDate) query.returnDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await SupplierReturn.countDocuments(query);
    const returns = await SupplierReturn.find(query)
      .populate('supplier', 'supplierName supplierCode')
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('items.item', 'itemName itemCode unitOfMeasurement')
      .populate('returnedBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .sort({ returnDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Supplier returns fetched successfully', returns, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch supplier returns', 500, error);
  }
};

// Get single supplier return by ID
export const getSupplierReturnById = async (req, res) => {
  try {
    const returnDoc = await SupplierReturn.findById(req.params.id)
      .populate('supplier')
      .populate('warehouse')
      .populate('purchaseOrder')
      .populate('goodsReceipt')
      .populate('items.item')
      .populate('returnedBy', 'fullName email')
      .populate('approvedBy', 'fullName email');

    if (!returnDoc) {
      return sendError(res, 'Supplier return not found', 404);
    }
    return sendSuccess(res, 'Supplier return retrieved successfully', returnDoc);
  } catch (error) {
    return sendError(res, 'Failed to retrieve supplier return', 500, error);
  }
};

// Approve & process supplier return (deducts stock and records movement)
export const approveSupplierReturn = async (req, res) => {
  try {
    const { status = 'returned', refundAmount, notes } = req.body;
    const returnDoc = await SupplierReturn.findById(req.params.id);
    if (!returnDoc) {
      return sendError(res, 'Supplier return not found', 404);
    }

    if (returnDoc.status === 'returned' || returnDoc.status === 'refunded') {
      return sendError(res, 'This supplier return has already been processed', 400);
    }

    // Deduct items from warehouse stock
    for (const itemEntry of returnDoc.items) {
      await recordStockMovementWithBalance({
        movementNumber: generateCode('MOV-RET-OUT'),
        item: itemEntry.item,
        warehouse: returnDoc.warehouse,
        movementType: 'stock issue', // Outgoing back to supplier
        quantity: itemEntry.quantity,
        unitCost: itemEntry.unitCost || 0,
        referenceType: 'supplier return',
        referenceId: returnDoc._id,
        reason: itemEntry.reason || 'Returned to supplier',
        performedBy: req.user?._id
      });
    }

    returnDoc.status = status;
    returnDoc.approvedBy = req.user?._id;
    if (refundAmount !== undefined) returnDoc.refundAmount = Number(refundAmount);
    if (notes) returnDoc.notes = `${returnDoc.notes || ''} | ${notes}`;
    await returnDoc.save();

    await recordAudit({
      warehouse: returnDoc.warehouse,
      action: 'stock changed',
      performedBy: req.user?._id,
      reason: `Supplier return ${returnDoc.returnNumber} processed`
    });

    return sendSuccess(res, 'Supplier return approved and stock deducted successfully', returnDoc);
  } catch (error) {
    return sendError(res, 'Failed to approve supplier return', 500, error);
  }
};

