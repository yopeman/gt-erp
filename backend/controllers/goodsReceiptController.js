import GoodsReceipt from '../models/GoodsReceipt.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import InventoryItem from '../models/InventoryItem.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  generateCode,
  recordStockMovementWithBalance,
  recordAudit
} from '../utils/inventoryHelper.js';

// Create Goods Receipt (GRN) draft / entry
export const createGoodsReceipt = async (req, res) => {
  try {
    const {
      purchaseOrder,
      supplier,
      warehouse,
      items,
      inspectedBy,
      receiptDate,
      supplierDeliveryNoteNumber,
      supplierInvoiceNumber,
      attachments,
      note
    } = req.body;

    if (!purchaseOrder || !supplier || !warehouse || !items || items.length === 0) {
      return sendError(res, 'Purchase order, supplier, warehouse, and items are required', 400);
    }

    const receiptNumber = generateCode('GRN');

    const formattedItems = items.map((i) => ({
      item: i.item,
      orderedQuantity: Number(i.orderedQuantity || 0),
      previouslyReceivedQuantity: Number(i.previouslyReceivedQuantity || 0),
      receivedQuantity: Number(i.receivedQuantity),
      acceptedQuantity: Number(i.acceptedQuantity || i.receivedQuantity),
      rejectedQuantity: Number(i.rejectedQuantity || 0),
      damagedQuantity: Number(i.damagedQuantity || 0),
      unitCost: Number(i.unitCost || 0),
      note: i.note || ''
    }));

    const grn = await GoodsReceipt.create({
      receiptNumber,
      purchaseOrder,
      supplier,
      warehouse,
      items: formattedItems,
      receivedBy: req.user?._id,
      inspectedBy: inspectedBy || null,
      receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
      supplierDeliveryNoteNumber,
      supplierInvoiceNumber,
      attachments: attachments || [],
      status: 'pending inspection',
      note
    });

    const populated = await grn.populate([
      { path: 'purchaseOrder', select: 'purchaseOrderNumber status' },
      { path: 'supplier', select: 'supplierName supplierCode' },
      { path: 'warehouse', select: 'warehouseName warehouseCode' },
      { path: 'items.item', select: 'itemName itemCode unitOfMeasurement' },
      { path: 'receivedBy', select: 'fullName email' }
    ]);

    return sendSuccess(res, 'Goods receipt created successfully and pending inspection', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create goods receipt', 500, error);
  }
};

// Get goods receipts
export const getGoodsReceipts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      purchaseOrder,
      supplier,
      warehouse,
      status,
      startDate,
      endDate
    } = req.query;

    const query = {};
    if (purchaseOrder) query.purchaseOrder = purchaseOrder;
    if (supplier) query.supplier = supplier;
    if (warehouse) query.warehouse = warehouse;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.receiptDate = {};
      if (startDate) query.receiptDate.$gte = new Date(startDate);
      if (endDate) query.receiptDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await GoodsReceipt.countDocuments(query);
    const receipts = await GoodsReceipt.find(query)
      .populate('purchaseOrder', 'purchaseOrderNumber')
      .populate('supplier', 'supplierName supplierCode')
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('items.item', 'itemName itemCode unitOfMeasurement')
      .populate('receivedBy', 'fullName email')
      .populate('inspectedBy', 'fullName email')
      .sort({ receiptDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Goods receipts retrieved successfully', receipts, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch goods receipts', 500, error);
  }
};

// Get single goods receipt by ID
export const getGoodsReceiptById = async (req, res) => {
  try {
    const receipt = await GoodsReceipt.findById(req.params.id)
      .populate('purchaseOrder')
      .populate('supplier')
      .populate('warehouse')
      .populate('items.item')
      .populate('receivedBy', 'fullName email')
      .populate('inspectedBy', 'fullName email');

    if (!receipt) {
      return sendError(res, 'Goods receipt not found', 404);
    }
    return sendSuccess(res, 'Goods receipt retrieved successfully', receipt);
  } catch (error) {
    return sendError(res, 'Failed to retrieve goods receipt', 500, error);
  }
};

/**
 * Accept / Complete Goods Receipt
 * Crucial business requirement:
 * 1. Increase the warehouse stock balance.
 * 2. Create stock movement records.
 * 3. Update received quantities in the purchase order.
 * 4. Update the purchase order status.
 */
export const acceptGoodsReceipt = async (req, res) => {
  try {
    const { inspectionItems, note } = req.body;
    const grn = await GoodsReceipt.findById(req.params.id);
    if (!grn) {
      return sendError(res, 'Goods receipt not found', 404);
    }

    if (grn.status === 'completed' || grn.status === 'accepted') {
      return sendError(res, 'This goods receipt has already been accepted and processed', 400);
    }

    // Optional update of accepted/rejected inspection counts
    if (inspectionItems && Array.isArray(inspectionItems)) {
      inspectionItems.forEach((ii) => {
        const item = grn.items.find(
          (i) => i._id.toString() === ii.itemId || i.item.toString() === ii.itemId
        );
        if (item) {
          if (ii.acceptedQuantity !== undefined) item.acceptedQuantity = Number(ii.acceptedQuantity);
          if (ii.rejectedQuantity !== undefined) item.rejectedQuantity = Number(ii.rejectedQuantity);
          if (ii.damagedQuantity !== undefined) item.damagedQuantity = Number(ii.damagedQuantity);
        }
      });
    }

    // 1 & 2: Increase warehouse stock balance & create stock movement records for accepted goods
    for (const itemEntry of grn.items) {
      const acceptedQty = itemEntry.acceptedQuantity || 0;
      if (acceptedQty > 0) {
        await recordStockMovementWithBalance({
          movementNumber: generateCode('MOV-GRN'),
          item: itemEntry.item,
          warehouse: grn.warehouse,
          movementType: 'purchase receipt',
          quantity: acceptedQty,
          unitCost: itemEntry.unitCost || 0,
          referenceType: 'goods receipt',
          referenceId: grn._id,
          note: `Goods Receipt ${grn.receiptNumber}`,
          performedBy: req.user?._id
        });
      }

      // If any items are damaged, record damaged stock balance
      if (itemEntry.damagedQuantity > 0) {
        await recordStockMovementWithBalance({
          movementNumber: generateCode('MOV-DMG'),
          item: itemEntry.item,
          warehouse: grn.warehouse,
          movementType: 'damaged',
          quantity: itemEntry.damagedQuantity,
          unitCost: itemEntry.unitCost || 0,
          referenceType: 'goods receipt',
          referenceId: grn._id,
          reason: 'Damaged upon delivery inspection',
          performedBy: req.user?._id
        });
      }
    }

    // 3 & 4: Update received quantities in the purchase order and update PO status
    const po = await PurchaseOrder.findById(grn.purchaseOrder);
    if (po) {
      let poFullyReceived = true;

      for (const poItem of po.items) {
        const matchingGRNItem = grn.items.find(
          (gi) => gi.item.toString() === poItem.item.toString()
        );
        if (matchingGRNItem) {
          poItem.receivedQuantity = (poItem.receivedQuantity || 0) + (matchingGRNItem.acceptedQuantity || 0);
        }

        if (poItem.receivedQuantity < poItem.quantity) {
          poFullyReceived = false;
        }
      }

      po.status = poFullyReceived ? 'received' : 'partially received';
      await po.save();
    }

    grn.status = 'completed';
    grn.inspectedBy = req.user?._id;
    if (note) grn.note = `${grn.note || ''} | ${note}`;
    await grn.save();

    await recordAudit({
      warehouse: grn.warehouse,
      action: 'stock changed',
      performedBy: req.user?._id,
      reason: `Goods receipt ${grn.receiptNumber} accepted and processed into stock`
    });

    return sendSuccess(
      res,
      'Goods receipt accepted. Warehouse stock increased, stock movements created, and PO updated successfully.',
      grn
    );
  } catch (error) {
    return sendError(res, 'Failed to accept goods receipt', 500, error);
  }
};

