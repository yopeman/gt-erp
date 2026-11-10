import Proforma from '../models/Proforma.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode } from '../utils/inventoryHelper.js';

// Create proforma quotation
export const createProforma = async (req, res) => {
  try {
    const {
      customer,
      order,
      validUntil,
      items,
      discountAmount = 0,
      vatRate = 15,
      termsAndConditions,
      preparedBy
    } = req.body;

    if (!customer || !validUntil || !items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Customer, validity date, and at least one line item are required', 400);
    }

    const proformaNumber = req.body.proformaNumber?.trim() || generateCode('PRF');

    const existing = await Proforma.findOne({ proformaNumber });
    if (existing) {
      return sendError(res, 'Proforma number already exists', 400);
    }

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

    const proforma = await Proforma.create({
      proformaNumber,
      customer,
      order: order || null,
      issueDate: new Date(),
      validUntil: new Date(validUntil),
      items: processedItems,
      subtotal: calculatedSubtotal,
      discountAmount: totalDiscount,
      vatRate,
      vatAmount,
      grandTotal,
      currency: 'ETB',
      termsAndConditions: termsAndConditions?.trim() || undefined,
      status: 'draft',
      preparedBy: preparedBy || req.user?.employee || null
    });

    const populated = await Proforma.findById(proforma._id)
      .populate('customer', 'customerNumber name companyName tinNumber vatNumber')
      .populate('preparedBy', 'firstName lastName employeeId position');

    return sendSuccess(res, 'Proforma quotation created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create proforma quotation', 500, error);
  }
};

// Create proforma directly from an existing sales order
export const createProformaFromOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { validDays = 15 } = req.body;

    const order = await Order.findById(orderId).populate('customer');
    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    const proformaNumber = generateCode('PRF');
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + Number(validDays));

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

    const proforma = await Proforma.create({
      proformaNumber,
      order: order._id,
      customer: order.customer._id,
      issueDate: new Date(),
      validUntil,
      items,
      subtotal: order.financials.subtotal,
      discountAmount: order.financials.discountAmount || 0,
      vatRate: order.financials.vatRate || 15,
      vatAmount: order.financials.vatAmount,
      grandTotal: order.financials.grandTotal,
      status: 'sent_to_customer',
      preparedBy: order.salesRepresentative
    });

    order.quotationRef = proforma._id;
    await order.save();

    const populated = await Proforma.findById(proforma._id)
      .populate('customer', 'customerNumber name companyName tinNumber')
      .populate('order', 'orderNumber priority status');

    return sendSuccess(res, 'Proforma generated from order successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to generate proforma from order', 500, error);
  }
};

// Get proformas with filters
export const getProformas = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      customer,
      status,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (customer && customer !== 'all') query.customer = customer;
    if (status && status !== 'all') query.status = status;

    if (search) {
      query.$or = [
        { proformaNumber: { $regex: search, $options: 'i' } },
        { 'items.itemDescription': { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [proformas, total] = await Promise.all([
      Proforma.find(query)
        .populate('customer', 'customerNumber name companyName tinNumber')
        .populate('order', 'orderNumber status')
        .populate('preparedBy', 'firstName lastName employeeId')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Proforma.countDocuments(query)
    ]);

    return sendSuccess(res, 'Proformas retrieved successfully', {
      proformas,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch proformas', 500, error);
  }
};

// Get single proforma by ID
export const getProformaById = async (req, res) => {
  try {
    const { id } = req.params;

    const proforma = await Proforma.findById(id)
      .populate('customer', 'customerNumber name companyName tinNumber vatNumber billingAddress')
      .populate('order', 'orderNumber priority status deliveryDeadline')
      .populate('preparedBy', 'firstName lastName employeeId position email phone');

    if (!proforma) {
      return sendError(res, 'Proforma not found', 404);
    }

    return sendSuccess(res, 'Proforma retrieved successfully', proforma);
  } catch (error) {
    return sendError(res, 'Failed to fetch proforma', 500, error);
  }
};

// Update proforma status
export const updateProformaStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const proforma = await Proforma.findById(id);
    if (!proforma) {
      return sendError(res, 'Proforma not found', 404);
    }

    if (status) proforma.status = status;
    await proforma.save();

    return sendSuccess(res, 'Proforma status updated successfully', proforma);
  } catch (error) {
    return sendError(res, 'Failed to update proforma status', 500, error);
  }
};

// Delete draft proforma
export const deleteProforma = async (req, res) => {
  try {
    const { id } = req.params;

    const proforma = await Proforma.findById(id);
    if (!proforma) {
      return sendError(res, 'Proforma not found', 404);
    }

    if (proforma.status !== 'draft' && proforma.status !== 'rejected') {
      return sendError(res, 'Only draft or rejected proformas can be deleted', 400);
    }

    await Proforma.findByIdAndDelete(id);

    return sendSuccess(res, 'Proforma deleted successfully', { id });
  } catch (error) {
    return sendError(res, 'Failed to delete proforma', 500, error);
  }
};

