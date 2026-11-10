import CustomerPayment from '../models/CustomerPayment.js';
import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode } from '../utils/inventoryHelper.js';

// Record a customer payment against an official invoice
export const recordCustomerPayment = async (req, res) => {
  try {
    const {
      invoiceId,
      amount,
      paymentMethod,
      referenceNumber,
      bankDetails,
      receiptAttachmentUrl,
      notes,
      paymentDate
    } = req.body;

    if (!invoiceId || !amount || !paymentMethod) {
      return sendError(res, 'Invoice ID, payment amount, and payment method are required', 400);
    }

    const paymentAmount = Number(amount);
    if (paymentAmount <= 0) {
      return sendError(res, 'Payment amount must be greater than zero', 400);
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    if (invoice.paymentStatus === 'paid' || invoice.remainingBalance <= 0) {
      return sendError(res, 'This invoice has already been fully settled', 400);
    }

    const receiptNumber = req.body.receiptNumber?.trim() || generateCode('RCPT');

    // Create Payment Receipt
    const payment = await CustomerPayment.create({
      receiptNumber,
      customer: invoice.customer,
      invoice: invoice._id,
      order: invoice.order || null,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      amount: paymentAmount,
      paymentMethod,
      referenceNumber: referenceNumber?.trim() || '',
      bankDetails: bankDetails || {},
      receiptAttachmentUrl: receiptAttachmentUrl?.trim() || '',
      status: 'verified',
      receivedBy: req.user?.employee || req.user?._id,
      notes: notes?.trim() || ''
    });

    // Update Invoice financials
    invoice.paidAmount += paymentAmount;
    invoice.remainingBalance = Math.max(0, invoice.grandTotal - invoice.paidAmount);
    invoice.paymentStatus = invoice.remainingBalance === 0 ? 'paid' : 'partially_paid';
    await invoice.save();

    // If order is linked, synchronize order paymentStatus
    if (invoice.order) {
      await Order.findByIdAndUpdate(invoice.order, {
        paymentStatus: invoice.paymentStatus
      });
    }

    // Decrement customer's outstanding receivables balance
    await Customer.findByIdAndUpdate(invoice.customer, {
      $inc: { 'creditTerms.currentBalance': -paymentAmount }
    });

    const populated = await CustomerPayment.findById(payment._id)
      .populate('customer', 'customerNumber name companyName')
      .populate('invoice', 'invoiceNumber grandTotal remainingBalance paymentStatus')
      .populate('receivedBy', 'firstName lastName employeeId');

    return sendSuccess(res, 'Customer payment recorded successfully', {
      payment: populated,
      invoiceUpdated: {
        invoiceNumber: invoice.invoiceNumber,
        paidAmount: invoice.paidAmount,
        remainingBalance: invoice.remainingBalance,
        paymentStatus: invoice.paymentStatus
      }
    }, 201);
  } catch (error) {
    return sendError(res, 'Failed to record customer payment', 500, error);
  }
};

// Get customer payments list
export const getCustomerPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      customer,
      invoice,
      paymentMethod,
      search = '',
      sortBy = 'paymentDate',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (customer && customer !== 'all') query.customer = customer;
    if (invoice) query.invoice = invoice;
    if (paymentMethod && paymentMethod !== 'all') query.paymentMethod = paymentMethod;

    if (search) {
      query.$or = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [payments, total] = await Promise.all([
      CustomerPayment.find(query)
        .populate('customer', 'customerNumber name companyName tinNumber')
        .populate('invoice', 'invoiceNumber grandTotal remainingBalance')
        .populate('receivedBy', 'firstName lastName employeeId')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      CustomerPayment.countDocuments(query)
    ]);

    return sendSuccess(res, 'Customer payments retrieved successfully', {
      payments,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch customer payments', 500, error);
  }
};

// Get payment receipt by ID
export const getCustomerPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await CustomerPayment.findById(id)
      .populate('customer', 'customerNumber name companyName tinNumber vatNumber billingAddress')
      .populate('invoice', 'invoiceNumber issueDate grandTotal paidAmount remainingBalance')
      .populate('receivedBy', 'firstName lastName employeeId position email phone');

    if (!payment) {
      return sendError(res, 'Payment receipt not found', 404);
    }

    return sendSuccess(res, 'Payment receipt retrieved successfully', payment);
  } catch (error) {
    return sendError(res, 'Failed to fetch payment receipt', 500, error);
  }
};

