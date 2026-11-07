import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import GoodsReceipt from '../models/GoodsReceipt.js';
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

// Executive Purchasing Dashboard & Analytics
export const getPurchasingDashboard = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 1. Purchase Orders stats
    const poStats = await PurchaseOrder.aggregate([
      {
        $facet: {
          overall: [
            { $match: { status: { $ne: 'cancelled' } } },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalPurchasesValue: { $sum: '$grandTotal' },
                totalPaid: { $sum: '$paidAmount' },
                totalBalanceDue: { $sum: '$balanceDue' }
              }
            }
          ],
          thisMonth: [
            { $match: { status: { $ne: 'cancelled' }, orderDate: { $gte: startOfMonth } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                spend: { $sum: '$grandTotal' }
              }
            }
          ],
          lastMonth: [
            { $match: { status: { $ne: 'cancelled' }, orderDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                spend: { $sum: '$grandTotal' }
              }
            }
          ],
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$grandTotal' }
              }
            }
          ],
          creditPayables: [
            { $match: { paymentType: 'credit', status: { $nin: ['cancelled', 'rejected'] } } },
            {
              $group: {
                _id: null,
                totalCreditOrders: { $sum: 1 },
                totalCreditAmount: { $sum: '$grandTotal' },
                outstandingCredit: { $sum: '$balanceDue' }
              }
            }
          ],
          overdueCredit: [
            {
              $match: {
                paymentType: 'credit',
                status: { $nin: ['cancelled', 'rejected'] },
                balanceDue: { $gt: 0 },
                paymentDueDate: { $lt: now }
              }
            },
            {
              $group: {
                _id: null,
                overdueCount: { $sum: 1 },
                overdueAmount: { $sum: '$balanceDue' }
              }
            }
          ]
        }
      }
    ]);

    // 2. Purchase Requests stats
    const prStats = await PurchaseRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          estimatedTotal: { $sum: '$estimatedTotalAmount' }
        }
      }
    ]);

    // 3. Goods Receipts stats (pending inspection, total)
    const grStats = await GoodsReceipt.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 4. Supplier count
    const totalSuppliers = await Supplier.countDocuments({ isDeleted: false });
    const activeSuppliers = await Supplier.countDocuments({ isDeleted: false, status: 'active' });

    // 5. Recent Purchase Orders
    const recentOrders = await PurchaseOrder.find()
      .populate('supplier', 'supplierName supplierCode')
      .populate('warehouse', 'warehouseName')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(6);

    // 6. Recent Purchase Requests
    const recentRequests = await PurchaseRequest.find()
      .populate('warehouse', 'warehouseName')
      .populate('requestedBy', 'fullName email department')
      .sort({ createdAt: -1 })
      .limit(6);

    // 7. Top Suppliers by Purchase Volume
    const topSuppliers = await PurchaseOrder.aggregate([
      { $match: { status: { $nin: ['cancelled', 'rejected'] } } },
      {
        $group: {
          _id: '$supplier',
          totalOrders: { $sum: 1 },
          totalSpend: { $sum: '$grandTotal' }
        }
      },
      { $sort: { totalSpend: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      { $unwind: '$supplier' },
      {
        $project: {
          supplierId: '$_id',
          supplierName: '$supplier.supplierName',
          supplierCode: '$supplier.supplierCode',
          totalOrders: 1,
          totalSpend: 1
        }
      }
    ]);

    // Format results cleanly
    const poFacet = poStats[0] || {};
    const overall = poFacet.overall?.[0] || { totalOrders: 0, totalPurchasesValue: 0, totalPaid: 0, totalBalanceDue: 0 };
    const thisMonth = poFacet.thisMonth?.[0] || { count: 0, spend: 0 };
    const lastMonth = poFacet.lastMonth?.[0] || { count: 0, spend: 0 };
    const credit = poFacet.creditPayables?.[0] || { totalCreditOrders: 0, totalCreditAmount: 0, outstandingCredit: 0 };
    const overdue = poFacet.overdueCredit?.[0] || { overdueCount: 0, overdueAmount: 0 };

    const prMap = {};
    let totalPRs = 0;
    (prStats || []).forEach((item) => {
      prMap[item._id] = item.count;
      totalPRs += item.count;
    });

    const grMap = {};
    let totalGRs = 0;
    (grStats || []).forEach((item) => {
      grMap[item._id] = item.count;
      totalGRs += item.count;
    });

    const poStatusMap = {};
    (poFacet.byStatus || []).forEach((item) => {
      poStatusMap[item._id] = item.count;
    });

    return sendSuccess(res, 'Purchasing dashboard metrics retrieved successfully', {
      totalPurchasesValue: overall.totalPurchasesValue,
      totalOrdersCount: overall.totalOrders,
      totalPaid: overall.totalPaid,
      totalBalanceDue: overall.totalBalanceDue,
      thisMonthSpend: thisMonth.spend,
      thisMonthOrdersCount: thisMonth.count,
      lastMonthSpend: lastMonth.spend,
      lastMonthOrdersCount: lastMonth.count,
      creditOverview: {
        totalCreditOrders: credit.totalCreditOrders,
        totalCreditAmount: credit.totalCreditAmount,
        outstandingCredit: credit.outstandingCredit,
        overdueCount: overdue.overdueCount,
        overdueAmount: overdue.overdueAmount
      },
      purchaseOrdersByStatus: poStatusMap,
      purchaseRequests: {
        total: totalPRs,
        pending: prMap['pending'] || 0,
        approved: prMap['approved'] || 0,
        rejected: prMap['rejected'] || 0,
        converted: prMap['converted to purchase order'] || 0
      },
      goodsReceipts: {
        total: totalGRs,
        pendingInspection: grMap['pending inspection'] || 0,
        completed: grMap['completed'] || 0
      },
      suppliers: {
        total: totalSuppliers,
        active: activeSuppliers
      },
      topSuppliers,
      recentOrders,
      recentRequests
    });
  } catch (error) {
    return sendError(res, 'Failed to retrieve purchasing dashboard metrics', 500, error);
  }
};

