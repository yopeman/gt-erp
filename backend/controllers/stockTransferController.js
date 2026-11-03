import StockTransfer from '../models/StockTransfer.js';
import StockBalance from '../models/StockBalance.js';
import InventoryItem from '../models/InventoryItem.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  generateCode,
  recordStockMovementWithBalance,
  recordApproval
} from '../utils/inventoryHelper.js';

// Create stock transfer request
export const createStockTransfer = async (req, res) => {
  try {
    const {
      sourceWarehouse,
      destinationWarehouse,
      items,
      attachments,
      note
    } = req.body;

    if (!sourceWarehouse || !destinationWarehouse || !items || items.length === 0) {
      return sendError(res, 'Source warehouse, destination warehouse, and at least one item are required', 400);
    }

    if (sourceWarehouse.toString() === destinationWarehouse.toString()) {
      return sendError(res, 'Source and destination warehouses cannot be the same', 400);
    }

    const transferNumber = generateCode('TRF');

    const formattedItems = items.map((i) => ({
      item: i.item,
      requestedQuantity: Number(i.requestedQuantity),
      approvedQuantity: Number(i.approvedQuantity || i.requestedQuantity),
      transferredQuantity: 0,
      receivedQuantity: 0,
      note: i.note || ''
    }));

    const transfer = await StockTransfer.create({
      transferNumber,
      sourceWarehouse,
      destinationWarehouse,
      items: formattedItems,
      requestedBy: req.user?._id,
      attachments: attachments || [],
      note,
      status: 'pending'
    });

    await recordApproval({
      referenceType: 'stock transfer',
      referenceId: transfer._id,
      action: 'submitted',
      actionBy: req.user?._id,
      comment: `Transfer ${transferNumber} created`
    });

    const populated = await transfer.populate([
      { path: 'sourceWarehouse', select: 'warehouseName warehouseCode' },
      { path: 'destinationWarehouse', select: 'warehouseName warehouseCode' },
      { path: 'items.item', select: 'itemName itemCode unitOfMeasurement' },
      { path: 'requestedBy', select: 'fullName email' }
    ]);

    return sendSuccess(res, 'Stock transfer request created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create stock transfer', 500, error);
  }
};

// Get stock transfers
export const getStockTransfers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sourceWarehouse,
      destinationWarehouse,
      status,
      startDate,
      endDate
    } = req.query;

    const query = {};
    if (sourceWarehouse) query.sourceWarehouse = sourceWarehouse;
    if (destinationWarehouse) query.destinationWarehouse = destinationWarehouse;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.transferDate = {};
      if (startDate) query.transferDate.$gte = new Date(startDate);
      if (endDate) query.transferDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await StockTransfer.countDocuments(query);
    const transfers = await StockTransfer.find(query)
      .populate('sourceWarehouse', 'warehouseName warehouseCode')
      .populate('destinationWarehouse', 'warehouseName warehouseCode')
      .populate('items.item', 'itemName itemCode unitOfMeasurement')
      .populate('requestedBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .populate('receivedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Stock transfers fetched successfully', transfers, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch stock transfers', 500, error);
  }
};

// Get single transfer by ID
export const getStockTransferById = async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id)
      .populate('sourceWarehouse')
      .populate('destinationWarehouse')
      .populate('items.item')
      .populate('requestedBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .populate('receivedBy', 'fullName email');

    if (!transfer) {
      return sendError(res, 'Stock transfer not found', 404);
    }
    return sendSuccess(res, 'Stock transfer retrieved successfully', transfer);
  } catch (error) {
    return sendError(res, 'Failed to retrieve stock transfer', 500, error);
  }
};

// Approve transfer
export const approveStockTransfer = async (req, res) => {
  try {
    const { approvedItems, comment } = req.body;
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) {
      return sendError(res, 'Stock transfer not found', 404);
    }

    if (transfer.status !== 'pending' && transfer.status !== 'draft') {
      return sendError(res, `Cannot approve transfer with status "${transfer.status}"`, 400);
    }

    if (approvedItems && Array.isArray(approvedItems)) {
      approvedItems.forEach((ai) => {
        const item = transfer.items.find((i) => i._id.toString() === ai.itemId || i.item.toString() === ai.itemId);
        if (item) {
          item.approvedQuantity = Number(ai.approvedQuantity);
        }
      });
    } else {
      transfer.items.forEach((item) => {
        item.approvedQuantity = item.requestedQuantity;
      });
    }

    transfer.status = 'approved';
    transfer.approvedBy = req.user?._id;
    await transfer.save();

    await recordApproval({
      referenceType: 'stock transfer',
      referenceId: transfer._id,
      action: 'approved',
      actionBy: req.user?._id,
      comment: comment || 'Transfer approved'
    });

    return sendSuccess(res, 'Stock transfer approved successfully', transfer);
  } catch (error) {
    return sendError(res, 'Failed to approve stock transfer', 500, error);
  }
};

// Dispatch transfer (Goods leave source warehouse -> In Transit)
export const dispatchStockTransfer = async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) {
      return sendError(res, 'Stock transfer not found', 404);
    }

    if (transfer.status !== 'approved') {
      return sendError(res, 'Transfer must be approved before dispatch', 400);
    }

    // Deduct stock from source warehouse and record "stock transfer out"
    for (const itemEntry of transfer.items) {
      const qtyToTransfer = itemEntry.approvedQuantity || itemEntry.requestedQuantity;
      itemEntry.transferredQuantity = qtyToTransfer;

      const itemDoc = await InventoryItem.findById(itemEntry.item);
      const unitCost = itemDoc ? itemDoc.unitCost : 0;

      await recordStockMovementWithBalance({
        movementNumber: generateCode('MOV-TRF-OUT'),
        item: itemEntry.item,
        warehouse: transfer.sourceWarehouse,
        movementType: 'stock transfer out',
        quantity: qtyToTransfer,
        unitCost,
        referenceType: 'stock transfer',
        referenceId: transfer._id,
        note: `Dispatched in transfer ${transfer.transferNumber}`,
        performedBy: req.user?._id
      });
    }

    transfer.status = 'in transit';
    await transfer.save();

    return sendSuccess(res, 'Stock transfer dispatched into transit successfully', transfer);
  } catch (error) {
    return sendError(res, 'Failed to dispatch stock transfer', 500, error);
  }
};

// Receive transfer (Goods arrive at destination warehouse -> Completed)
export const receiveStockTransfer = async (req, res) => {
  try {
    const { receivedItems, note } = req.body;
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) {
      return sendError(res, 'Stock transfer not found', 404);
    }

    if (transfer.status !== 'in transit') {
      return sendError(res, 'Only in-transit transfers can be received', 400);
    }

    let allFullyReceived = true;

    for (const itemEntry of transfer.items) {
      let rQty = itemEntry.transferredQuantity;
      if (receivedItems && Array.isArray(receivedItems)) {
        const found = receivedItems.find(
          (ri) => ri.itemId === itemEntry._id.toString() || ri.itemId === itemEntry.item.toString()
        );
        if (found) {
          rQty = Number(found.receivedQuantity);
        }
      }

      itemEntry.receivedQuantity = rQty;
      if (itemEntry.receivedQuantity < itemEntry.transferredQuantity) {
        allFullyReceived = false;
      }

      const itemDoc = await InventoryItem.findById(itemEntry.item);
      const unitCost = itemDoc ? itemDoc.unitCost : 0;

      // Increase stock in destination warehouse
      await recordStockMovementWithBalance({
        movementNumber: generateCode('MOV-TRF-IN'),
        item: itemEntry.item,
        warehouse: transfer.destinationWarehouse,
        movementType: 'stock transfer in',
        quantity: rQty,
        unitCost,
        referenceType: 'stock transfer',
        referenceId: transfer._id,
        note: `Received in destination warehouse for transfer ${transfer.transferNumber}`,
        performedBy: req.user?._id
      });
    }

    transfer.status = allFullyReceived ? 'completed' : 'partially received';
    transfer.receivedBy = req.user?._id;
    transfer.receivedDate = new Date();
    if (note) transfer.note = `${transfer.note || ''} | ${note}`;
    await transfer.save();

    return sendSuccess(res, 'Stock transfer received and added to destination stock successfully', transfer);
  } catch (error) {
    return sendError(res, 'Failed to receive stock transfer', 500, error);
  }
};

