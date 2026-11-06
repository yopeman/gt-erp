import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode, recordApproval } from '../utils/inventoryHelper.js';

// Create purchase order
export const createPurchaseOrder = async (req, res) => {
  try {
    const {
      purchaseRequest,
      supplier,
      warehouse,
      items,
      discountAmount = 0,
      taxAmount = 0,
      shippingCost = 0,
      otherExpenses = 0,
      currency,
      paymentTerms,
      paymentType,
      creditPeriodDays,
      paymentDueDate,
      orderDate,
      expectedDeliveryDate,
      deliveryAddress,
      notes,
      documents
    } = req.body;

    if (!supplier || !warehouse || !items || items.length === 0) {
      return sendError(res, 'Supplier, warehouse, and at least one item are required', 400);
    }

    const supplierDoc = await Supplier.findById(supplier);
    if (!supplierDoc) {
      return sendError(res, 'Supplier not found', 404);
    }

    const purchaseOrderNumber = generateCode('PO');

    const formattedItems = items.map((i) => {
      const qty = Number(i.quantity);
      const price = Number(i.unitPrice);
      const discount = Number(i.discount || 0);
      const tax = Number(i.taxPercentage || 0);
      const discounted = qty * price - discount;
      const total = discounted + (discounted * tax) / 100;

      return {
        item: i.item,
        description: i.description || '',
        quantity: qty,
        receivedQuantity: 0,
        unitOfMeasurement: i.unitOfMeasurement || 'piece',
        unitPrice: price,
        discount,
        taxPercentage: tax,
        totalPrice: Math.max(0, total)
      };
    });

    const subtotal = formattedItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const grandTotal = Math.max(
      0,
      subtotal - Number(discountAmount) + Number(taxAmount) + Number(shippingCost) + Number(otherExpenses)
    );

    const resolvedPaymentType = paymentType || (supplierDoc.paymentTerms === 'credit' ? 'credit' : 'cash');
    const resolvedCreditPeriod = Number(creditPeriodDays || supplierDoc.creditPeriodDays || 30);
    const orderDateObj = orderDate ? new Date(orderDate) : new Date();

    let resolvedDueDate = paymentDueDate ? new Date(paymentDueDate) : null;
    if (resolvedPaymentType === 'credit' && !resolvedDueDate) {
      resolvedDueDate = new Date(orderDateObj.getTime() + resolvedCreditPeriod * 24 * 60 * 60 * 1000);
    }

    let creditLimitExceeded = false;
    if (resolvedPaymentType === 'credit' && supplierDoc.creditLimit > 0) {
      const projectedBalance = (supplierDoc.currentCreditBalance || 0) + grandTotal;
      if (projectedBalance > supplierDoc.creditLimit) {
        creditLimitExceeded = true;
      }
    }

    const purchaseOrder = await PurchaseOrder.create({
      purchaseOrderNumber,
      purchaseRequest: purchaseRequest || null,
      supplier,
      warehouse,
      items: formattedItems,
      subtotal,
      discountAmount,
      taxAmount,
      shippingCost,
      otherExpenses,
      grandTotal,
      currency: currency || 'ETB',
      paymentTerms: paymentTerms || (resolvedPaymentType === 'credit' ? `Net ${resolvedCreditPeriod} days` : 'Cash on delivery'),
      paymentType: resolvedPaymentType,
      creditPeriodDays: resolvedCreditPeriod,
      paymentDueDate: resolvedDueDate,
      creditLimitExceeded,
      paidAmount: 0,
      balanceDue: grandTotal,
      paymentStatus: 'unpaid',
      orderDate: orderDateObj,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      deliveryAddress,
      notes,
      documents: documents || [],
      createdBy: req.user?._id,
      status: 'draft'
    });

    await recordApproval({
      referenceType: 'purchase order',
      referenceId: purchaseOrder._id,
      action: 'submitted',
      actionBy: req.user?._id,
      comment: `Purchase order ${purchaseOrderNumber} created`
    });

    const populated = await purchaseOrder.populate([
      { path: 'supplier', select: 'supplierName supplierCode contactPerson email phoneNumber' },
      { path: 'warehouse', select: 'warehouseName warehouseCode branch' },
      { path: 'items.item', select: 'itemName itemCode unitOfMeasurement' },
      { path: 'createdBy', select: 'fullName email' }
    ]);

    return sendSuccess(res, 'Purchase order created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create purchase order', 500, error);
  }
};

// Get purchase orders
export const getPurchaseOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      supplier,
      warehouse,
      status,
      paymentType,
      paymentStatus,
      overdueOnly,
      startDate,
      endDate
    } = req.query;

    const query = {};
    if (supplier) query.supplier = supplier;
    if (warehouse) query.warehouse = warehouse;
    if (status) query.status = status;
    if (paymentType) query.paymentType = paymentType;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (overdueOnly === 'true') {
      query.paymentDueDate = { $lt: new Date() };
      query.balanceDue = { $gt: 0 };
    }

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await PurchaseOrder.countDocuments(query);
    const orders = await PurchaseOrder.find(query)
      .populate('supplier', 'supplierName supplierCode contactPerson creditLimit currentCreditBalance')
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('items.item', 'itemName itemCode unitOfMeasurement')
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Purchase orders fetched successfully', orders, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch purchase orders', 500, error);
  }
};

// Get single purchase order by ID
export const getPurchaseOrderById = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier')
      .populate('warehouse')
      .populate('items.item')
      .populate('purchaseRequest')
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email');

    if (!order) {
      return sendError(res, 'Purchase order not found', 404);
    }
    return sendSuccess(res, 'Purchase order retrieved successfully', order);
  } catch (error) {
    return sendError(res, 'Failed to retrieve purchase order', 500, error);
  }
};

// Update purchase order
export const updatePurchaseOrder = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return sendError(res, 'Purchase order not found', 404);
    }

    if (order.status !== 'draft' && order.status !== 'pending') {
      return sendError(res, `Cannot update purchase order with status "${order.status}"`, 400);
    }

    Object.assign(order, req.body);
    await order.save();

    return sendSuccess(res, 'Purchase order updated successfully', order);
  } catch (error) {
    return sendError(res, 'Failed to update purchase order', 500, error);
  }
};

// Approve purchase order
export const approvePurchaseOrder = async (req, res) => {
  try {
    const { comment } = req.body;
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return sendError(res, 'Purchase order not found', 404);
    }

    if (order.status === 'approved') {
      return sendError(res, 'Purchase order is already approved', 400);
    }

    order.status = 'approved';
    order.approvedBy = req.user?._id;
    order.approvedAt = new Date();
    await order.save();

    // If order was placed on credit, synchronize supplier's credit balance
    if (order.paymentType === 'credit') {
      await Supplier.findByIdAndUpdate(order.supplier, {
        $inc: { currentCreditBalance: order.grandTotal }
      });
    }

    await recordApproval({
      referenceType: 'purchase order',
      referenceId: order._id,
      action: 'approved',
      actionBy: req.user?._id,
      comment: comment || 'Purchase order approved'
    });

    return sendSuccess(res, 'Purchase order approved successfully', order);
  } catch (error) {
    return sendError(res, 'Failed to approve purchase order', 500, error);
  }
};

// Mark as sent to supplier
export const sendPurchaseOrderToSupplier = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return sendError(res, 'Purchase order not found', 404);
    }

    if (order.status !== 'approved') {
      return sendError(res, 'Only approved purchase orders can be sent to suppliers', 400);
    }

    order.status = 'sent';
    await order.save();

    return sendSuccess(res, 'Purchase order marked as sent to supplier', order);
  } catch (error) {
    return sendError(res, 'Failed to send purchase order', 500, error);
  }
};

