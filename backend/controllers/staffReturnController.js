import StaffReturn from '../models/StaffReturn.js';
import StockRequest from '../models/StockRequest.js';
import InventoryItem from '../models/InventoryItem.js';
import StockBalance from '../models/StockBalance.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  generateCode,
  recordStockMovementWithBalance,
  recordApproval
} from '../utils/inventoryHelper.js';

// Create staff material return
export const createStaffReturn = async (req, res) => {
  try {
    const {
      warehouse,
      department,
      originalStockRequest,
      jobReference,
      items,
      reason,
      note,
      attachments
    } = req.body;

    if (!originalStockRequest) {
      return sendError(res, 'A previously approved or issued material request (REQ) is required to return materials', 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'At least one returned item is required', 400);
    }

    // Fetch and validate the referenced material request
    const stockReq = await StockRequest.findById(originalStockRequest).populate('items.item');
    if (!stockReq) {
      return sendError(res, 'The referenced material request could not be found', 404);
    }

    const userRoles = req.user?.roles || [];
    const canManageAll = userRoles.some((r) => ['admin', 'manager', 'storekeeper'].includes(r));

    // Regular employee can only return materials from their own requests
    const empId = req.user?.employee?._id || req.user?.employee;
    if (!canManageAll) {
      const isOwner =
        stockReq.requestedBy.toString() === req.user._id.toString() ||
        (empId && stockReq.requestedBy.toString() === empId.toString());
      if (!isOwner) {
        return sendError(res, 'Access denied: You can only return materials from your own approved requests', 403);
      }
    }

    // Check request status: Must be approved, partially issued, or completed
    if (!['approved', 'partially issued', 'completed'].includes(stockReq.status)) {
      return sendError(
        res,
        `Cannot return materials from a request with status "${stockReq.status}". Only approved or issued requests can be returned.`,
        400
      );
    }

    // Calculate prior returned quantities for this request to prevent double-returns
    const priorReturns = await StaffReturn.find({
      originalStockRequest: stockReq._id,
      status: { $ne: 'rejected' }
    });

    const priorReturnedMap = {};
    for (const pRet of priorReturns) {
      for (const pItem of pRet.items) {
        const itemIdStr = (pItem.item?._id || pItem.item).toString();
        const qty = pItem.acceptedQuantity > 0 ? pItem.acceptedQuantity : pItem.quantity;
        priorReturnedMap[itemIdStr] = (priorReturnedMap[itemIdStr] || 0) + Number(qty);
      }
    }

    // Validate that each returned item belongs to the original request and does not exceed available return limit
    const formattedItems = [];
    for (const returnItem of items) {
      const returnItemIdStr = (returnItem.item?._id || returnItem.item).toString();
      const origItem = stockReq.items.find(
        (oi) => (oi.item?._id || oi.item).toString() === returnItemIdStr
      );

      if (!origItem) {
        return sendError(
          res,
          'You can only return items that were previously requested and approved in this requisition',
          400
        );
      }

      const issuedOrApproved = Number(origItem.issuedQuantity || origItem.approvedQuantity || 0);
      const alreadyReturned = Number(priorReturnedMap[returnItemIdStr] || 0);
      const maxReturnable = Math.max(0, issuedOrApproved - alreadyReturned);

      const requestedReturnQty = Number(returnItem.quantity);
      if (requestedReturnQty <= 0) {
        return sendError(res, 'Returned quantity must be greater than zero', 400);
      }

      if (requestedReturnQty > maxReturnable) {
        const itName = origItem.item?.itemName || 'Item';
        return sendError(
          res,
          `Cannot return ${requestedReturnQty} of "${itName}". Maximum returnable quantity is ${maxReturnable} (Issued/Approved: ${issuedOrApproved}, already returned: ${alreadyReturned}).`,
          400
        );
      }

      formattedItems.push({
        item: origItem.item?._id || origItem.item,
        quantity: requestedReturnQty,
        unitOfMeasurement: returnItem.unitOfMeasurement || origItem.unitOfMeasurement || '',
        condition: ['good', 'damaged', 'scrap'].includes(returnItem.condition) ? returnItem.condition : 'good',
        reason: returnItem.reason || reason || 'Unused material return',
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        note: returnItem.note || ''
      });
    }

    const returnNumber = generateCode('SRV');
    const requesterId = req.user?.employee?._id || req.user?.employee || req.user?._id;
    const targetWarehouse = stockReq.warehouse;
    const targetDept = stockReq.department;

    const staffReturn = await StaffReturn.create({
      returnNumber,
      returnedBy: requesterId,
      department: targetDept,
      warehouse: targetWarehouse,
      originalStockRequest: stockReq._id,
      jobReference: jobReference || stockReq.purpose || stockReq.requestNumber,
      items: formattedItems,
      reason: reason || 'Staff returning previously requested materials to store',
      note: note || '',
      attachments: attachments || [],
      status: 'pending'
    });

    const populated = await staffReturn.populate([
      { path: 'warehouse', select: 'warehouseName warehouseCode' },
      { path: 'items.item', select: 'itemName itemCode unitOfMeasurement unitCost' },
      { path: 'returnedBy', select: 'fullName email department' },
      { path: 'originalStockRequest', select: 'requestNumber purpose status' }
    ]);

    return sendSuccess(res, 'Staff material return submitted successfully', populated, 201);
  } catch (error) {
    console.error('Failed to create staff return:', error);
    return sendError(res, 'Failed to submit staff material return', 500, error);
  }
};

// Get staff returns
export const getStaffReturns = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      warehouse,
      department,
      status,
      returnedBy
    } = req.query;

    const userRoles = req.user?.roles || [];
    const canManageAll = userRoles.some((r) => ['admin', 'manager', 'storekeeper'].includes(r));

    const query = {};
    if (warehouse) query.warehouse = warehouse;
    if (department) query.department = department;
    if (status) query.status = status;

    if (!canManageAll) {
      // Regular employee can only view their own returns
      const empId = req.user?.employee?._id || req.user?.employee;
      query.$or = [
        { returnedBy: req.user._id },
        ...(empId ? [{ returnedBy: empId }] : [])
      ];
    } else if (returnedBy) {
      query.returnedBy = returnedBy;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await StaffReturn.countDocuments(query);
    const returns = await StaffReturn.find(query)
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('items.item', 'itemName itemCode unitOfMeasurement unitCost')
      .populate('returnedBy', 'fullName email department')
      .populate('receivedBy', 'fullName email')
      .populate('originalStockRequest', 'requestNumber purpose')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Staff material returns fetched successfully', returns, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Failed to fetch staff returns:', error);
    return sendError(res, 'Failed to fetch staff material returns', 500, error);
  }
};

// Get single staff return by ID
export const getStaffReturnById = async (req, res) => {
  try {
    const returnDoc = await StaffReturn.findById(req.params.id)
      .populate('warehouse')
      .populate('items.item')
      .populate('returnedBy', 'fullName email department')
      .populate('receivedBy', 'fullName email')
      .populate('originalStockRequest', 'requestNumber purpose');

    if (!returnDoc) {
      return sendError(res, 'Staff return not found', 404);
    }

    return sendSuccess(res, 'Staff return details retrieved successfully', returnDoc);
  } catch (error) {
    return sendError(res, 'Failed to retrieve staff return', 500, error);
  }
};

// Storekeeper receives and restocks returned materials
export const receiveStaffReturn = async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    if (!userRoles.some((r) => ['admin', 'storekeeper'].includes(r))) {
      return sendError(res, 'Access denied: Only warehouse storekeepers can receive and restock materials', 403);
    }

    const { receivedItems, note } = req.body;
    const staffReturn = await StaffReturn.findById(req.params.id);

    if (!staffReturn) {
      return sendError(res, 'Staff return not found', 404);
    }

    if (staffReturn.status === 'received' || staffReturn.status === 'completed') {
      return sendError(res, 'This material return has already been received and restocked', 400);
    }

    let allCompleted = true;

    for (const itemEntry of staffReturn.items) {
      let acceptedQty = itemEntry.quantity;
      let rejectedQty = 0;
      let itemCondition = itemEntry.condition || 'good';

      if (receivedItems && Array.isArray(receivedItems)) {
        const match = receivedItems.find(
          (ri) => ri.itemId === itemEntry._id.toString() || ri.itemId === itemEntry.item.toString()
        );
        if (match) {
          acceptedQty = Number(match.acceptedQuantity !== undefined ? match.acceptedQuantity : itemEntry.quantity);
          rejectedQty = Number(match.rejectedQuantity || 0);
          if (match.condition) itemCondition = match.condition;
        }
      }

      itemEntry.acceptedQuantity = acceptedQty;
      itemEntry.rejectedQuantity = rejectedQty;
      itemEntry.condition = itemCondition;

      if (acceptedQty < itemEntry.quantity) {
        allCompleted = false;
      }

      if (acceptedQty > 0) {
        const itemDoc = await InventoryItem.findById(itemEntry.item);
        const unitCost = itemDoc ? itemDoc.unitCost : 0;

        if (itemCondition === 'good') {
          // Reusable item -> Returns directly to warehouse QuantityOnHand
          await recordStockMovementWithBalance({
            movementNumber: generateCode('MOV-STAFF-RET'),
            item: itemEntry.item,
            warehouse: staffReturn.warehouse,
            movementType: 'return',
            quantity: acceptedQty,
            unitCost,
            referenceType: 'staff return',
            referenceId: staffReturn._id,
            reason: itemEntry.reason || 'Staff returned unused material to store',
            note: note || `Received from ${staffReturn.department}`,
            performedBy: req.user?._id
          });
        } else {
          // Damaged or scrap condition -> Logged into damaged inventory
          await recordStockMovementWithBalance({
            movementNumber: generateCode('MOV-STAFF-DMG'),
            item: itemEntry.item,
            warehouse: staffReturn.warehouse,
            movementType: 'damaged',
            quantity: acceptedQty,
            unitCost,
            referenceType: 'staff return',
            referenceId: staffReturn._id,
            reason: itemEntry.reason || 'Staff returned damaged material',
            note: note || `Damaged return from ${staffReturn.department}`,
            performedBy: req.user?._id
          });
        }
      }
    }

    staffReturn.status = allCompleted ? 'received' : 'partially received';
    staffReturn.receivedBy = req.user?._id;
    staffReturn.receivedAt = new Date();
    if (note) staffReturn.note = `${staffReturn.note || ''} | Received: ${note}`;
    await staffReturn.save();

    const populated = await staffReturn.populate([
      { path: 'warehouse', select: 'warehouseName warehouseCode' },
      { path: 'items.item', select: 'itemName itemCode unitOfMeasurement' },
      { path: 'returnedBy', select: 'fullName email department' },
      { path: 'receivedBy', select: 'fullName email' }
    ]);

    return sendSuccess(res, 'Material return accepted and warehouse stock updated', populated);
  } catch (error) {
    console.error('Failed to receive staff return:', error);
    return sendError(res, 'Failed to process staff material return', 500, error);
  }
};

// Reject staff return
export const rejectStaffReturn = async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    if (!userRoles.some((r) => ['admin', 'storekeeper'].includes(r))) {
      return sendError(res, 'Access denied: Only warehouse storekeepers can reject returns', 403);
    }

    const { rejectionReason } = req.body;
    const staffReturn = await StaffReturn.findById(req.params.id);

    if (!staffReturn) {
      return sendError(res, 'Staff return not found', 404);
    }

    staffReturn.status = 'rejected';
    staffReturn.rejectionReason = rejectionReason || 'Rejected by storekeeper';
    staffReturn.receivedBy = req.user?._id;
    staffReturn.receivedAt = new Date();
    await staffReturn.save();

    return sendSuccess(res, 'Staff material return rejected', staffReturn);
  } catch (error) {
    return sendError(res, 'Failed to reject staff material return', 500, error);
  }
};

