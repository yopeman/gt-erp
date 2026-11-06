import PurchasePayment from '../models/PurchasePayment.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode } from '../utils/inventoryHelper.js';

// Helper to apply or reverse payment impact on Purchase Order and Supplier Credit Balance
export const syncPaymentWithPOAndSupplier = async (payment, isReversal = false) => {
  const po = await PurchaseOrder.findById(payment.purchaseOrder);
  if (po) {
    const paymentAmount = Number(payment.amount || 0);
    if (!isReversal) {
      po.paidAmount = (po.paidAmount || 0) + paymentAmount;
    } else {
      po.paidAmount = Math.max(0, (po.paidAmount || 0) - paymentAmount);
    }

    po.balanceDue = Math.max(0, (po.grandTotal || 0) - po.paidAmount);

    if (po.balanceDue === 0 && po.grandTotal > 0) {
      po.paymentStatus = 'paid';
    } else if (po.paidAmount > 0) {
      po.paymentStatus = 'partially paid';
    } else if (po.paymentDueDate && new Date(po.paymentDueDate) < new Date()) {
      po.paymentStatus = 'overdue';
    } else {
      po.paymentStatus = 'unpaid';
    }

    await po.save();
  }

  // Update supplier currentCreditBalance
  if (payment.supplier) {
    const delta = isReversal ? Number(payment.amount || 0) : -Number(payment.amount || 0);
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      payment.supplier,
      { $inc: { currentCreditBalance: delta } },
      { new: true }
    );
    if (updatedSupplier && updatedSupplier.currentCreditBalance < 0) {
      updatedSupplier.currentCreditBalance = 0;
      await updatedSupplier.save();
    }
  }
};

// Create purchase payment
export const createPurchasePayment = async (req, res) => {
  try {
    const {
      supplier,
      purchaseOrder,
      goodsReceipt,
      invoiceNumber,
      paymentDate,
      amount,
      currency,
      paymentMethod,
      transactionReference,
      bankName,
      attachments,
      notes,
      status = 'paid'
    } = req.body;

    if (!supplier || !purchaseOrder || amount === undefined || !paymentMethod) {
      return sendError(res, 'Supplier, purchase order, amount, and payment method are required', 400);
    }

    const po = await PurchaseOrder.findById(purchaseOrder);
    if (!po) {
      return sendError(res, 'Purchase order not found', 404);
    }

    const payAmount = Number(amount);
    if (payAmount <= 0) {
      return sendError(res, 'Payment amount must be greater than 0', 400);
    }

    const paymentNumber = generateCode('PAY');

    const payment = await PurchasePayment.create({
      paymentNumber,
      supplier,
      purchaseOrder,
      goodsReceipt: goodsReceipt || null,
      invoiceNumber,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      amount: payAmount,
      currency: currency || po.currency || 'ETB',
      paymentMethod,
      transactionReference,
      bankName,
      paidBy: req.user?._id,
      approvedBy: status === 'paid' ? req.user?._id : null,
      attachments: attachments || [],
      notes,
      status
    });

    // If recorded directly as paid, immediately reflect on PO and supplier credit balance
    if (status === 'paid') {
      await syncPaymentWithPOAndSupplier(payment, false);
    }

    const populated = await payment.populate([
      { path: 'supplier', select: 'supplierName supplierCode currentCreditBalance' },
      { path: 'purchaseOrder', select: 'purchaseOrderNumber grandTotal paidAmount balanceDue paymentStatus status' },
      { path: 'paidBy', select: 'fullName email' }
    ]);

    return sendSuccess(res, 'Purchase payment recorded successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to record purchase payment', 500, error);
  }
};

// Get purchase payments
export const getPurchasePayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      supplier,
      purchaseOrder,
      paymentMethod,
      status,
      startDate,
      endDate
    } = req.query;

    const query = {};
    if (supplier) query.supplier = supplier;
    if (purchaseOrder) query.purchaseOrder = purchaseOrder;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await PurchasePayment.countDocuments(query);
    const payments = await PurchasePayment.find(query)
      .populate('supplier', 'supplierName supplierCode')
      .populate('purchaseOrder', 'purchaseOrderNumber grandTotal')
      .populate('paidBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Purchase payments fetched successfully', payments, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch purchase payments', 500, error);
  }
};

// Get single payment by ID
export const getPurchasePaymentById = async (req, res) => {
  try {
    const payment = await PurchasePayment.findById(req.params.id)
      .populate('supplier')
      .populate('purchaseOrder')
      .populate('goodsReceipt')
      .populate('paidBy', 'fullName email')
      .populate('approvedBy', 'fullName email');

    if (!payment) {
      return sendError(res, 'Purchase payment not found', 404);
    }
    return sendSuccess(res, 'Purchase payment retrieved successfully', payment);
  } catch (error) {
    return sendError(res, 'Failed to retrieve purchase payment', 500, error);
  }
};

// Approve or update payment status
export const approvePurchasePayment = async (req, res) => {
  try {
    const { status = 'paid', notes } = req.body;
    const payment = await PurchasePayment.findById(req.params.id);
    if (!payment) {
      return sendError(res, 'Purchase payment not found', 404);
    }

    const previousStatus = payment.status;

    // Apply or reverse balance synchronization based on state transition
    if (previousStatus !== 'paid' && status === 'paid') {
      await syncPaymentWithPOAndSupplier(payment, false);
    } else if (previousStatus === 'paid' && (status === 'cancelled' || status === 'rejected')) {
      await syncPaymentWithPOAndSupplier(payment, true);
    }

    payment.status = status;
    payment.approvedBy = req.user?._id;
    if (notes) payment.notes = `${payment.notes || ''} | ${notes}`;
    await payment.save();

    const populated = await payment.populate([
      { path: 'supplier', select: 'supplierName supplierCode currentCreditBalance' },
      { path: 'purchaseOrder', select: 'purchaseOrderNumber grandTotal paidAmount balanceDue paymentStatus status' },
      { path: 'paidBy', select: 'fullName email' },
      { path: 'approvedBy', select: 'fullName email' }
    ]);

    return sendSuccess(res, `Purchase payment ${status} successfully`, populated);
  } catch (error) {
    return sendError(res, 'Failed to approve purchase payment', 500, error);
  }
};

