import StockRequest from '../models/StockRequest.js';
import InventoryItem from '../models/InventoryItem.js';
import StockBalance from '../models/StockBalance.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  generateCode,
  recordStockMovementWithBalance,
  recordApproval
} from '../utils/inventoryHelper.js';

// Create stock request / material request
export const createStockRequest = async (req, res) => {
  try {
    const {
      department,
      warehouse,
      items,
      purpose,
      requiredDate,
      priority,
      attachments,
      note
    } = req.body;

    if (!department || !warehouse || !items || items.length === 0) {
      return sendError(res, 'Department, warehouse, and at least one item are required', 400);
    }

    const requestNumber = generateCode('REQ');

    const formattedItems = items.map((i) => ({
      item: i.item,
      requestedQuantity: Number(i.requestedQuantity),
      approvedQuantity: 0,
      issuedQuantity: 0,
      unitOfMeasurement: i.unitOfMeasurement || '',
      note: i.note || ''
    }));

    const requesterId = req.user?.employee?._id || req.user?.employee || req.user?._id;

    const stockRequest = await StockRequest.create({
      requestNumber,
      requestedBy: requesterId,
      department,
      warehouse,
      items: formattedItems,
      purpose,
      requiredDate: requiredDate ? new Date(requiredDate) : null,
      priority: priority || 'medium',
      attachments: attachments || [],
      note,
      status: 'pending'
    });

    await recordApproval({
      referenceType: 'stock request',
      referenceId: stockRequest._id,
      action: 'submitted',
      actionBy: req.user?._id,
      comment: `Stock request ${requestNumber} created`
    });

    const populated = await stockRequest.populate([
      { path: 'warehouse', select: 'warehouseName warehouseCode' },
      { path: 'items.item', select: 'itemName itemCode unitOfMeasurement' },
      { path: 'requestedBy', select: 'fullName email department' }
    ]);

    return sendSuccess(res, 'Stock request created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create stock request', 500, error);
  }
};

// Get stock requests
export const getStockRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      department,
      warehouse,
      status,
      priority,
      requestedBy
    } = req.query;

    const userRoles = req.user?.roles || [];
    const canManageAll = userRoles.some((r) => ['admin', 'manager', 'storekeeper'].includes(r));

    const query = {};
    if (department) query.department = department;
    if (warehouse) query.warehouse = warehouse;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (!canManageAll) {
      // Standard employee only sees their own requests
      const empId = req.user?.employee?._id || req.user?.employee;
      query.$or = [
        { requestedBy: req.user._id },
        ...(empId ? [{ requestedBy: empId }] : [])
      ];
    } else if (requestedBy) {
      query.requestedBy = requestedBy;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await StockRequest.countDocuments(query);
    const requests = await StockRequest.find(query)
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('items.item', 'itemName itemCode unitOfMeasurement unitCost')
      .populate('requestedBy', 'fullName email department')
      .populate('approvedBy', 'fullName email')
      .populate('issuedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Stock requests fetched successfully', requests, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch stock requests', 500, error);
  }
};

// Get single stock request by ID
export const getStockRequestById = async (req, res) => {
  try {
    const request = await StockRequest.findById(req.params.id)
      .populate('warehouse')
      .populate('items.item')
      .populate('requestedBy', 'fullName email department')
      .populate('approvedBy', 'fullName email')
      .populate('issuedBy', 'fullName email');

    if (!request) {
      return sendError(res, 'Stock request not found', 404);
    }
    return sendSuccess(res, 'Stock request retrieved successfully', request);
  } catch (error) {
    return sendError(res, 'Failed to retrieve stock request', 500, error);
  }
};

// Approve or reject stock request
export const approveStockRequest = async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    if (!userRoles.some((r) => ['admin', 'manager', 'storekeeper'].includes(r))) {
      return sendError(res, 'Access denied: Only managers or storekeepers can approve stock requests', 403);
    }

    const { status, approvedItems, comment } = req.body; // status: 'approved', 'rejected', 'partially approved'
    const request = await StockRequest.findById(req.params.id);
    if (!request) {
      return sendError(res, 'Stock request not found', 404);
    }

    if (!['approved', 'partially approved', 'rejected'].includes(status)) {
      return sendError(res, 'Status must be approved, partially approved, or rejected', 400);
    }

    if (approvedItems && Array.isArray(approvedItems)) {
      approvedItems.forEach((ai) => {
        const item = request.items.find(
          (i) => i._id.toString() === ai.itemId || i.item.toString() === ai.itemId
        );
        if (item) {
          item.approvedQuantity = Number(ai.approvedQuantity);
        }
      });
    } else if (status === 'approved') {
      request.items.forEach((item) => {
        item.approvedQuantity = item.requestedQuantity;
      });
    }

    request.status = status;
    request.approvedBy = req.user?._id;
    await request.save();

    await recordApproval({
      referenceType: 'stock request',
      referenceId: request._id,
      action: status,
      actionBy: req.user?._id,
      comment: comment || `Stock request ${status}`
    });

    return sendSuccess(res, `Stock request ${status} successfully`, request);
  } catch (error) {
    return sendError(res, 'Failed to update stock request approval status', 500, error);
  }
};

// Issue items for stock request (Storekeeper issues materials)
export const issueStockRequest = async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    if (!userRoles.some((r) => ['admin', 'storekeeper'].includes(r))) {
      return sendError(res, 'Access denied: Only warehouse storekeepers can issue stock materials', 403);
    }

    const { issuedItems, note } = req.body;
    const request = await StockRequest.findById(req.params.id);
    if (!request) {
      return sendError(res, 'Stock request not found', 404);
    }

    if (!['approved', 'partially approved', 'partially issued'].includes(request.status)) {
      return sendError(res, 'Request must be approved before materials can be issued', 400);
    }

    let allCompleted = true;

    for (const itemEntry of request.items) {
      let qtyToIssue = 0;
      if (issuedItems && Array.isArray(issuedItems)) {
        const match = issuedItems.find(
          (ii) => ii.itemId === itemEntry._id.toString() || ii.itemId === itemEntry.item.toString()
        );
        if (match) {
          qtyToIssue = Number(match.issuedQuantity);
        }
      } else {
        // default to remaining approved qty
        qtyToIssue = (itemEntry.approvedQuantity || 0) - (itemEntry.issuedQuantity || 0);
      }

      if (qtyToIssue > 0) {
        // Check stock balance first
        const balance = await StockBalance.findOne({
          item: itemEntry.item,
          warehouse: request.warehouse
        });

        if (!balance || balance.quantityOnHand < qtyToIssue) {
          return sendError(
            res,
            `Insufficient stock for item in warehouse. Available: ${balance ? balance.quantityOnHand : 0}, trying to issue: ${qtyToIssue}`,
            400
          );
        }

        itemEntry.issuedQuantity = (itemEntry.issuedQuantity || 0) + qtyToIssue;

        const itemDoc = await InventoryItem.findById(itemEntry.item);
        const unitCost = itemDoc ? itemDoc.unitCost : 0;

        await recordStockMovementWithBalance({
          movementNumber: generateCode('MOV-ISSUE'),
          item: itemEntry.item,
          warehouse: request.warehouse,
          movementType: 'stock issue',
          quantity: qtyToIssue,
          unitCost,
          referenceType: 'stock request',
          referenceId: request._id,
          reason: request.purpose || 'Material request issuance',
          note: note || `Issued to department: ${request.department}`,
          performedBy: req.user?._id
        });
      }

      if ((itemEntry.issuedQuantity || 0) < (itemEntry.approvedQuantity || 0)) {
        allCompleted = false;
      }
    }

    request.status = allCompleted ? 'completed' : 'partially issued';
    request.issuedBy = req.user?._id;
    request.issuedAt = new Date();
    await request.save();

    return sendSuccess(res, 'Materials issued successfully and stock balance deducted', request);
  } catch (error) {
    return sendError(res, 'Failed to issue stock materials', 500, error);
  }
};

