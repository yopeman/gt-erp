import PurchasePayment from '../models/PurchasePayment.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode } from '../utils/inventoryHelper.js';

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
      notes
    } = req.body;

    if (!supplier || !purchaseOrder || amount === undefined || !paymentMethod) {
      return sendError(res, 'Supplier, purchase order, amount, and payment method are required', 400);
    }

    const paymentNumber = generateCode('PAY');

    const payment = await PurchasePayment.create({
      paymentNumber,
      supplier,
      purchaseOrder,
      goodsReceipt: goodsReceipt || null,
      invoiceNumber,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      amount: Number(amount),
      currency: currency || 'ETB',
      paymentMethod,
      transactionReference,
      bankName,
      paidBy: req.user?._id,
      attachments: attachments || [],
      notes,
      status: 'pending'
    });

    const populated = await payment.populate([
      { path: 'supplier', select: 'supplierName supplierCode' },
      { path: 'purchaseOrder', select: 'purchaseOrderNumber grandTotal status' },
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

// Approve payment
export const approvePurchasePayment = async (req, res) => {
  try {
    const { status = 'paid', notes } = req.body;
    const payment = await PurchasePayment.findById(req.params.id);
    if (!payment) {
      return sendError(res, 'Purchase payment not found', 404);
    }

    payment.status = status;
    payment.approvedBy = req.user?._id;
    if (notes) payment.notes = `${payment.notes || ''} | ${notes}`;
    await payment.save();

    return sendSuccess(res, `Purchase payment ${status} successfully`, payment);
  } catch (error) {
    return sendError(res, 'Failed to approve purchase payment', 500, error);
  }
};

