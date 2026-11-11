import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import CustomerPayment from '../models/CustomerPayment.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode } from '../utils/inventoryHelper.js';

// Generate official tax invoice from an approved/completed sales order
export const createInvoiceFromOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { dueDate, withholdingTaxAmount = 0 } = req.body;

    const order = await Order.findById(orderId).populate('customer');
    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    if (order.invoice) {
      return sendError(res, 'An official invoice has already been issued for this order', 400);
    }

    const invoiceNumber = generateCode('INV');
    const customer = order.customer;

    // Calculate due date based on customer credit terms if not supplied
    let calculatedDueDate = dueDate ? new Date(dueDate) : new Date();
    if (!dueDate) {
      const termDays = customer.creditTerms?.creditTermDays || 30;
      calculatedDueDate.setDate(calculatedDueDate.getDate() + termDays);
    }

    const items = order.items.map((it) => {
      const quantity = it.quantity;
      const unitPrice = it.unitPrice;
      const taxRate = order.financials.vatRate || 15;
      const taxable = quantity * unitPrice;
      const taxAmount = (taxable * taxRate) / 100;

      return {
        itemDescription: `${it.productTitle} (${it.specifications?.paperType || 'Standard Paper'}, ${it.specifications?.colorFormat || '4/4'})`,
        quantity,
        unitPrice,
        discount: 0,
        taxRate,
        taxAmount,
        subtotal: taxable + taxAmount
      };
    });

    const subtotal = order.financials.subtotal;
    const discountAmount = order.financials.discountAmount || 0;
    const vatRate = order.financials.vatRate || 15;
    const vatAmount = order.financials.vatAmount;
    const grandTotal = order.financials.grandTotal;

    const invoice = await Invoice.create({
      invoiceNumber,
      order: order._id,
      customer: customer._id,
      issueDate: new Date(),
      dueDate: calculatedDueDate,
      customerTin: customer.tinNumber || '',
      customerVat: customer.vatNumber || '',
      items,
      subtotal,
      discountAmount,
      vatRate,
      vatAmount,
      withholdingTaxAmount: Number(withholdingTaxAmount || 0),
      grandTotal,
      paidAmount: 0,
      remainingBalance: grandTotal,
      paymentStatus: 'unpaid',
      status: 'issued',
      preparedBy: order.salesRepresentative
    });

    // Update order reference
    order.invoice = invoice._id;
    await order.save();

    // Increment customer outstanding receivables
    await Customer.findByIdAndUpdate(customer._id, {
      $inc: { 'creditTerms.currentBalance': grandTotal }
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('customer', 'customerNumber name companyName tinNumber vatNumber creditTerms')
      .populate('order', 'orderNumber priority status');

    return sendSuccess(res, 'Official tax invoice issued successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create invoice from order', 500, error);
  }
};

// Create direct invoice
export const createInvoice = async (req, res) => {
  try {
    const {
      customer,
      order,
      dueDate,
      items,
      discountAmount = 0,
      withholdingTaxAmount = 0,
      vatRate = 15
    } = req.body;

    if (!customer || !dueDate || !items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Customer, due date, and at least one item are required', 400);
    }

    const customerDoc = await Customer.findById(customer);
    if (!customerDoc) {
      return sendError(res, 'Customer not found', 404);
    }

    const invoiceNumber = req.body.invoiceNumber?.trim() || generateCode('INV');

    let calculatedSubtotal = 0;
    const processedItems = items.map((it) => {
      const quantity = Number(it.quantity || 1);
      const unitPrice = Number(it.unitPrice || 0);
      const discount = Number(it.discount || 0);
      const itemTaxRate = Number(it.taxRate !== undefined ? it.taxRate : vatRate);
      const taxable = Math.max(0, (quantity * unitPrice) - discount);
      const taxAmount = (taxable * itemTaxRate) / 100;
      const subtotal = taxable + taxAmount;
      calculatedSubtotal += taxable;

      return {
        itemDescription: it.itemDescription?.trim() || 'Printing Service',
        quantity,
        unitPrice,
        discount,
        taxRate: itemTaxRate,
        taxAmount,
        subtotal
      };
    });

    const totalDiscount = Number(discountAmount || 0);
    const taxableBase = Math.max(0, calculatedSubtotal - totalDiscount);
    const vatAmount = (taxableBase * vatRate) / 100;
    const grandTotal = taxableBase + vatAmount;

    const invoice = await Invoice.create({
      invoiceNumber,
      customer,
      order: order || null,
      issueDate: new Date(),
      dueDate: new Date(dueDate),
      customerTin: customerDoc.tinNumber || '',
      customerVat: customerDoc.vatNumber || '',
      items: processedItems,
      subtotal: calculatedSubtotal,
      discountAmount: totalDiscount,
      vatRate,
      vatAmount,
      withholdingTaxAmount: Number(withholdingTaxAmount || 0),
      grandTotal,
      paidAmount: 0,
      remainingBalance: grandTotal,
      paymentStatus: 'unpaid',
      status: 'issued',
      preparedBy: req.user?.employee || null
    });

    // Update customer credit balance
    await Customer.findByIdAndUpdate(customer, {
      $inc: { 'creditTerms.currentBalance': grandTotal }
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('customer', 'customerNumber name companyName tinNumber vatNumber');

    return sendSuccess(res, 'Tax invoice created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create invoice', 500, error);
  }
};

// Get invoices with search & filters
export const getInvoices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      customer,
      paymentStatus,
      status,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (customer && customer !== 'all') query.customer = customer;
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;
    if (status && status !== 'all') query.status = status;

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerTin: { $regex: search, $options: 'i' } },
        { 'items.itemDescription': { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('customer', 'customerNumber name companyName tinNumber')
        .populate('order', 'orderNumber status deliveryDeadline')
        .populate('preparedBy', 'fullName employeeCode firstName lastName employeeId')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Invoice.countDocuments(query)
    ]);

    return sendSuccess(res, 'Invoices retrieved successfully', {
      invoices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch invoices', 500, error);
  }
};

// Get single invoice by ID with linked payment receipts
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id)
      .populate('customer', 'customerNumber name companyName tinNumber vatNumber billingAddress creditTerms')
      .populate('order', 'orderNumber priority status deliveryDeadline items')
      .populate('preparedBy', 'fullName employeeCode firstName lastName employeeId position email phone');

    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    // Fetch payment receipt history for this invoice
    const payments = await CustomerPayment.find({ invoice: id })
      .populate('receivedBy', 'fullName employeeCode firstName lastName employeeId')
      .sort({ paymentDate: -1 });

    return sendSuccess(res, 'Invoice retrieved successfully', {
      ...invoice.toObject(),
      payments
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch invoice', 500, error);
  }
};

// Invoice Metrics
export const getInvoiceMetrics = async (req, res) => {
  try {
    const now = new Date();

    const [totals, overdueCount] = await Promise.all([
      Invoice.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            totalInvoiced: { $sum: '$grandTotal' },
            totalPaid: { $sum: '$paidAmount' },
            totalReceivables: { $sum: '$remainingBalance' }
          }
        }
      ]),
      Invoice.countDocuments({
        dueDate: { $lt: now },
        paymentStatus: { $ne: 'paid' },
        status: { $ne: 'cancelled' }
      })
    ]);

    const result = totals[0] || { totalInvoiced: 0, totalPaid: 0, totalReceivables: 0 };

    return sendSuccess(res, 'Invoice metrics retrieved successfully', {
      totalInvoiced: result.totalInvoiced,
      totalPaid: result.totalPaid,
      totalReceivables: result.totalReceivables,
      overdueInvoicesCount: overdueCount
    });
  } catch (error) {
    return sendError(res, 'Failed to get invoice metrics', 500, error);
  }
};

