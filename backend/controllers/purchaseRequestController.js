import PurchaseRequest from '../models/PurchaseRequest.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode, recordApproval } from '../utils/inventoryHelper.js';
import { sendNotificationToRoles, sendNotificationToUser } from '../utils/notificationService.js';

// Create purchase request
export const createPurchaseRequest = async (req, res) => {
  try {
    const {
      department,
      warehouse,
      items,
      purpose,
      priority,
      requiredDate,
      currency,
      attachments,
      note
    } = req.body;

    if (!department || !items || items.length === 0) {
      return sendError(res, 'Department and at least one item are required', 400);
    }

    const requestNumber = generateCode('PR');

    const formattedItems = items.map((i) => ({
      item: i.item || null,
      itemName: i.itemName || '',
      description: i.description || '',
      requestedQuantity: Number(i.requestedQuantity),
      unitOfMeasurement: i.unitOfMeasurement || 'piece',
      estimatedUnitPrice: Number(i.estimatedUnitPrice || 0),
      estimatedTotal: Number(i.requestedQuantity) * Number(i.estimatedUnitPrice || 0),
      preferredSupplier: i.preferredSupplier || null,
      note: i.note || ''
    }));

    const estimatedTotalAmount = formattedItems.reduce((sum, item) => sum + item.estimatedTotal, 0);

    const requesterId = req.user?.employee?._id || req.user?.employee || req.user?._id;
    const requestedByModel = req.user?.employee ? 'Employee' : 'User';

    const purchaseRequest = await PurchaseRequest.create({
      requestNumber,
      requestedBy: requesterId,
      requestedByModel,
      department,
      warehouse: warehouse || null,
      items: formattedItems,
      purpose,
      priority: priority || 'medium',
      requiredDate: requiredDate ? new Date(requiredDate) : null,
      estimatedTotalAmount,
      currency: currency || 'ETB',
      attachments: attachments || [],
      note,
      status: 'pending'
    });

    await recordApproval({
      referenceType: 'purchase request',
      referenceId: purchaseRequest._id,
      action: 'submitted',
      actionBy: req.user?._id,
      actionByModel: 'User',
      comment: `Purchase request ${requestNumber} submitted`
    });

    const populated = await purchaseRequest.populate([
      { path: 'warehouse', select: 'warehouseName warehouseCode' },
      { path: 'items.item', select: 'itemName itemCode' },
      { path: 'items.preferredSupplier', select: 'supplierName supplierCode' },
      { path: 'requestedBy', select: 'fullName email department' }
    ]);

    // Automatic notification to Managers, Approvers, and Procurement
    try {
      const requesterName = populated.requestedBy?.fullName || 'A staff member';
      await sendNotificationToRoles({
        roles: ['admin', 'manager', 'procurement'],
        title: 'New Purchase Request',
        body: `${requesterName} submitted ${requestNumber} for ${department} (${purchaseRequest.currency} ${estimatedTotalAmount.toLocaleString()}).`,
        type: 'approval',
        data: {
          purchaseRequestId: String(purchaseRequest._id),
          requestNumber,
          link: '/procurement/purchase-requests'
        }
      });
    } catch (notifErr) {
      console.warn('Purchase request notification error:', notifErr.message);
    }

    return sendSuccess(res, 'Purchase request created successfully', populated, 201);
  } catch (error) {
    console.error('Failed to create purchase request:', error);
    return sendError(res, 'Failed to create purchase request', 500, error);
  }
};

// Get purchase requests
export const getPurchaseRequests = async (req, res) => {
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
    const canManageAll = userRoles.some((r) => ['admin', 'manager', 'purchaser', 'storekeeper', 'finance'].includes(r));

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
    const total = await PurchaseRequest.countDocuments(query);
    const requests = await PurchaseRequest.find(query)
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('items.item', 'itemName itemCode unitOfMeasurement')
      .populate('items.preferredSupplier', 'supplierName supplierCode')
      .populate('requestedBy', 'fullName email department')
      .populate('approvedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Purchase requests fetched successfully', requests, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch purchase requests', 500, error);
  }
};

// Get single purchase request by ID
export const getPurchaseRequestById = async (req, res) => {
  try {
    const request = await PurchaseRequest.findById(req.params.id)
      .populate('warehouse')
      .populate('items.item')
      .populate('items.preferredSupplier')
      .populate('requestedBy', 'fullName email department')
      .populate('approvedBy', 'fullName email');

    if (!request) {
      return sendError(res, 'Purchase request not found', 404);
    }
    return sendSuccess(res, 'Purchase request retrieved successfully', request);
  } catch (error) {
    return sendError(res, 'Failed to retrieve purchase request', 500, error);
  }
};

// Approve or reject purchase request
export const handleApproval = async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    if (!userRoles.some((r) => ['admin', 'manager', 'purchaser'].includes(r))) {
      return sendError(res, 'Access denied: Only managers or purchasers can approve purchase requests', 403);
    }

    const { status, comment, rejectionReason } = req.body; // status: 'approved' or 'rejected'
    const request = await PurchaseRequest.findById(req.params.id);
    if (!request) {
      return sendError(res, 'Purchase request not found', 404);
    }

    if (!['approved', 'rejected', 'partially approved'].includes(status)) {
      return sendError(res, 'Status must be approved, partially approved, or rejected', 400);
    }

    request.status = status;
    request.approvedBy = req.user?._id;
    request.approvedAt = new Date();
    if (rejectionReason) request.rejectionReason = rejectionReason;
    await request.save();

    await recordApproval({
      referenceType: 'purchase request',
      referenceId: request._id,
      action: status,
      actionBy: req.user?._id,
      comment: comment || `Purchase request ${status}`
    });

    // Automatic notification to the requester
    try {
      if (request.requestedBy) {
        const notifTitle = `Purchase Request ${request.requestNumber} ${status.toUpperCase()}`;
        const notifBody = status === 'approved'
          ? `Your purchase request ${request.requestNumber} has been approved.`
          : `Your purchase request ${request.requestNumber} was ${status}. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`;

        await sendNotificationToUser({
          userId: request.requestedBy,
          title: notifTitle,
          body: notifBody,
          type: 'approval',
          data: {
            purchaseRequestId: String(request._id),
            requestNumber: request.requestNumber,
            status,
            link: '/procurement/purchase-requests'
          }
        });
      }
    } catch (notifErr) {
      console.warn('Purchase request approval notification error:', notifErr.message);
    }

    return sendSuccess(res, `Purchase request ${status} successfully`, request);
  } catch (error) {
    return sendError(res, 'Failed to approve purchase request', 500, error);
  }
};

// Convert approved purchase request to purchase order draft
export const convertToPurchaseOrder = async (req, res) => {
  try {
    const { supplier, warehouse, deliveryAddress, paymentTerms } = req.body;
    const request = await PurchaseRequest.findById(req.params.id);

    if (!request) {
      return sendError(res, 'Purchase request not found', 404);
    }

    if (request.status !== 'approved') {
      return sendError(res, 'Only approved purchase requests can be converted to purchase orders', 400);
    }

    const targetSupplier = supplier || request.items[0]?.preferredSupplier;
    const targetWarehouse = warehouse || request.warehouse;

    if (!targetSupplier || !targetWarehouse) {
      return sendError(res, 'Supplier and Warehouse are required to create a purchase order', 400);
    }

    const poNumber = generateCode('PO');
    const poItems = request.items.map((i) => ({
      item: i.item,
      description: i.description || i.itemName,
      quantity: i.requestedQuantity,
      receivedQuantity: 0,
      unitOfMeasurement: i.unitOfMeasurement,
      unitPrice: i.estimatedUnitPrice || 0,
      discount: 0,
      taxPercentage: 0,
      totalPrice: i.estimatedTotal || 0
    }));

    const purchaseOrder = await PurchaseOrder.create({
      purchaseOrderNumber: poNumber,
      purchaseRequest: request._id,
      supplier: targetSupplier,
      warehouse: targetWarehouse,
      items: poItems,
      subtotal: request.estimatedTotalAmount,
      grandTotal: request.estimatedTotalAmount,
      currency: request.currency,
      paymentTerms: paymentTerms || 'cash',
      deliveryAddress,
      createdBy: req.user?._id,
      status: 'draft'
    });

    request.status = 'converted to purchase order';
    await request.save();

    return sendSuccess(res, 'Purchase order draft created from purchase request successfully', purchaseOrder, 201);
  } catch (error) {
    return sendError(res, 'Failed to convert purchase request to purchase order', 500, error);
  }
};

