import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Design from '../models/Design.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode } from '../utils/inventoryHelper.js';

// Create a new sales order
export const createOrder = async (req, res) => {
  try {
    const {
      customer,
      salesRepresentative,
      quotationRef,
      priority,
      deliveryDeadline,
      items,
      notes,
      assignedDesigner,
      status = 'confirmed'
    } = req.body;

    if (!customer || !salesRepresentative || !deliveryDeadline) {
      return sendError(res, 'Customer, sales representative, and delivery deadline are required', 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'At least one order line item is required', 400);
    }

    const orderNumber = req.body.orderNumber?.trim() || generateCode('SO');

    const existing = await Order.findOne({ orderNumber });
    if (existing) {
      return sendError(res, 'Order number already exists', 400);
    }

    // Process line items & calculate estimated costs
    let calculatedSubtotal = 0;
    const processedItems = items.map((item) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unitPrice || 0);
      const subtotal = quantity * unitPrice;
      calculatedSubtotal += subtotal;

      const estimated = item.estimatedCost || {};
      const totalEstimatedCost =
        Number(estimated.materialCost || 0) +
        Number(estimated.machineCost || 0) +
        Number(estimated.laborCost || 0) +
        Number(estimated.finishingCost || 0) +
        Number(estimated.overheadCost || 0);

      return {
        service: item.service,
        productTitle: item.productTitle?.trim() || 'Printing Job',
        quantity,
        unitOfMeasurement: item.unitOfMeasurement || 'copy',
        specifications: item.specifications || {},
        unitPrice,
        subtotal,
        estimatedCost: {
          materialCost: Number(estimated.materialCost || 0),
          machineCost: Number(estimated.machineCost || 0),
          laborCost: Number(estimated.laborCost || 0),
          finishingCost: Number(estimated.finishingCost || 0),
          overheadCost: Number(estimated.overheadCost || 0),
          totalEstimatedCost
        }
      };
    });

    const discountAmount = Number(req.body.financials?.discountAmount || 0);
    const vatRate = Number(req.body.financials?.vatRate !== undefined ? req.body.financials.vatRate : 15);
    const taxableAmount = Math.max(0, calculatedSubtotal - discountAmount);
    const vatAmount = (taxableAmount * vatRate) / 100;
    const grandTotal = taxableAmount + vatAmount;

    const order = await Order.create({
      orderNumber,
      customer,
      salesRepresentative,
      quotationRef: quotationRef || null,
      priority: priority || 'medium',
      orderDate: new Date(),
      deliveryDeadline: new Date(deliveryDeadline),
      items: processedItems,
      financials: {
        subtotal: calculatedSubtotal,
        discountAmount,
        vatRate,
        vatAmount,
        grandTotal,
        currency: 'ETB'
      },
      status: status || 'confirmed',
      paymentStatus: 'unpaid',
      notes: notes?.trim() || '',
      createdBy: req.user?._id || null
    });

    // Auto-create initial Pre-press Design record if designer assigned or for custom printing
    if (assignedDesigner) {
      const designNumber = generateCode('DSG');
      const design = await Design.create({
        designNumber,
        order: order._id,
        assignedDesigner,
        status: 'in_design',
        specifications: {
          bleedMm: 3,
          colorProfile: 'CMYK',
          resolutionDpi: 300
        }
      });
      order.design = design._id;
      order.status = 'design_in_progress';
      await order.save();
    }

    const populated = await Order.findById(order._id)
      .populate('customer', 'customerNumber name companyName tinNumber creditTerms')
      .populate('salesRepresentative', 'firstName lastName employeeId position department')
      .populate('items.service', 'name serviceCode category')
      .populate('design');

    return sendSuccess(res, 'Order created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create order', 500, error);
  }
};

// Get orders with filters, search, pagination
export const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      customer,
      salesRepresentative,
      status,
      priority,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { 'items.productTitle': { $regex: search, $options: 'i' } }
      ];
    }

    if (customer && customer !== 'all') query.customer = customer;
    if (salesRepresentative && salesRepresentative !== 'all') query.salesRepresentative = salesRepresentative;
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'customerNumber name companyName tinNumber creditTerms')
        .populate('salesRepresentative', 'firstName lastName employeeId position department')
        .populate('items.service', 'name serviceCode category')
        .populate('design')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(query)
    ]);

    return sendSuccess(res, 'Orders retrieved successfully', {
      orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch orders', 500, error);
  }
};

// Get single order by ID
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('customer', 'customerNumber name companyName tinNumber vatNumber billingAddress shippingAddress creditTerms')
      .populate('salesRepresentative', 'firstName lastName employeeId position department email phone')
      .populate('items.service', 'name serviceCode category standardSpecifications workflowTemplate')
      .populate('design')
      .populate('productionJob')
      .populate('invoice')
      .populate('createdBy', 'fullName email');

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    return sendSuccess(res, 'Order retrieved successfully', order);
  } catch (error) {
    return sendError(res, 'Failed to fetch order', 500, error);
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, actualDeliveryDate } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (actualDeliveryDate) order.actualDeliveryDate = new Date(actualDeliveryDate);

    if (status === 'delivered' && !order.actualDeliveryDate) {
      order.actualDeliveryDate = new Date();
    }

    await order.save();

    const populated = await Order.findById(order._id)
      .populate('customer', 'customerNumber name companyName')
      .populate('salesRepresentative', 'firstName lastName')
      .populate('design');

    return sendSuccess(res, 'Order status updated successfully', populated);
  } catch (error) {
    return sendError(res, 'Failed to update order status', 500, error);
  }
};

// Update order general details
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority, deliveryDeadline, notes, salesRepresentative } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    if (priority) order.priority = priority;
    if (deliveryDeadline) order.deliveryDeadline = new Date(deliveryDeadline);
    if (notes !== undefined) order.notes = notes.trim();
    if (salesRepresentative) order.salesRepresentative = salesRepresentative;

    await order.save();

    const populated = await Order.findById(order._id)
      .populate('customer', 'customerNumber name companyName')
      .populate('salesRepresentative', 'firstName lastName');

    return sendSuccess(res, 'Order updated successfully', populated);
  } catch (error) {
    return sendError(res, 'Failed to update order', 500, error);
  }
};

// Delete order (allowed only if draft or unconfirmed)
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    if (order.status !== 'draft' && order.status !== 'cancelled') {
      return sendError(res, 'Only draft or cancelled orders can be deleted', 400);
    }

    await Order.findByIdAndDelete(id);

    return sendSuccess(res, 'Order deleted successfully', { id });
  } catch (error) {
    return sendError(res, 'Failed to delete order', 500, error);
  }
};

// Order Pipeline Statistics
export const getOrderStatistics = async (req, res) => {
  try {
    const [
      totalOrders,
      confirmed,
      inDesign,
      inProduction,
      completed,
      delivered,
      revenueResult
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'confirmed' }),
      Order.countDocuments({ status: { $in: ['design_in_progress', 'design_approved'] } }),
      Order.countDocuments({ status: { $in: ['in_production', 'finishing', 'qc_completed'] } }),
      Order.countDocuments({ status: 'completed' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$financials.grandTotal' } } }
      ])
    ]);

    const stats = {
      totalOrders,
      activeOrders: confirmed + inDesign + inProduction,
      stageCounts: {
        confirmed,
        inDesign,
        inProduction,
        delivered,
        completed
      },
      totalRevenue: revenueResult[0]?.totalRevenue || 0
    };

    return sendSuccess(res, 'Order statistics retrieved successfully', stats);
  } catch (error) {
    return sendError(res, 'Failed to get order statistics', 500, error);
  }
};

