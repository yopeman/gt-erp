import PurchaseOrder from '../models/PurchaseOrder.js';
import PurchasePayment from '../models/PurchasePayment.js';
import Supplier from '../models/Supplier.js';
import SupplierReturn from '../models/SupplierReturn.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode, recordApproval } from '../utils/inventoryHelper.js';
import { syncPaymentWithPOAndSupplier } from './purchasePaymentController.js';

/**
 * Get all credit purchases with filtering, pagination, and overdue status
 */
export const getCreditPurchases = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      supplier,
      warehouse,
      paymentStatus,
      overdueOnly,
      dueBefore,
      dueAfter,
      search,
      sortBy = 'paymentDueDate',
      sortOrder = 'asc'
    } = req.query;

    const query = {
      paymentType: 'credit',
      status: { $nin: ['cancelled', 'rejected'] }
    };

    if (supplier) query.supplier = supplier;
    if (warehouse) query.warehouse = warehouse;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const now = new Date();

    if (overdueOnly === 'true') {
      query.paymentDueDate = { $lt: now };
      query.balanceDue = { $gt: 0 };
    } else {
      if (dueBefore || dueAfter) {
        query.paymentDueDate = {};
        if (dueBefore) query.paymentDueDate.$lte = new Date(dueBefore);
        if (dueAfter) query.paymentDueDate.$gte = new Date(dueAfter);
      }
    }

    if (search) {
      query.$or = [
        { purchaseOrderNumber: { $regex: search, $options: 'i' } },
        { paymentTerms: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOption = {};
    sortOption[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await PurchaseOrder.countDocuments(query);

    const orders = await PurchaseOrder.find(query)
      .populate('supplier', 'supplierName supplierCode contactPerson phoneNumber creditLimit currentCreditBalance')
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit, 10));

    // Enhance records with real-time overdue calculations
    const enrichedOrders = orders.map((order) => {
      const orderObj = order.toObject();
      const isDue = orderObj.paymentDueDate ? new Date(orderObj.paymentDueDate) < now : false;
      const hasBalance = (orderObj.balanceDue || 0) > 0;
      const isOverdue = isDue && hasBalance;

      let overdueDays = 0;
      let remainingDays = 0;

      if (orderObj.paymentDueDate) {
        const diffTime = now.getTime() - new Date(orderObj.paymentDueDate).getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && hasBalance) {
          overdueDays = diffDays;
        } else if (diffDays <= 0 && hasBalance) {
          remainingDays = Math.abs(diffDays);
        }
      }

      return {
        ...orderObj,
        isOverdue,
        overdueDays,
        remainingDays
      };
    });

    // Summary of the current filter
    const stats = await PurchaseOrder.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$paidAmount' },
          totalBalanceDue: { $sum: '$balanceDue' }
        }
      }
    ]);

    const summary = stats[0] || { totalPurchases: 0, totalPaid: 0, totalBalanceDue: 0 };

    return sendSuccess(res, 'Credit purchases retrieved successfully', enrichedOrders, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      },
      summary
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch credit purchases', 500, error);
  }
};

/**
 * Get executive credit purchasing & accounts payable dashboard summary
 */
export const getCreditPurchasingDashboard = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const matchActiveCredit = {
      paymentType: 'credit',
      status: { $nin: ['cancelled', 'rejected'] }
    };

    // Overall Totals
    const overallStats = await PurchaseOrder.aggregate([
      { $match: matchActiveCredit },
      {
        $group: {
          _id: null,
          totalCreditPurchases: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$paidAmount' },
          totalOutstandingPayable: { $sum: '$balanceDue' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Overdue Totals
    const overdueStats = await PurchaseOrder.aggregate([
      {
        $match: {
          ...matchActiveCredit,
          balanceDue: { $gt: 0 },
          paymentDueDate: { $lt: now }
        }
      },
      {
        $group: {
          _id: null,
          totalOverdue: { $sum: '$balanceDue' },
          overdueCount: { $sum: 1 }
        }
      }
    ]);

    // Due in 7 Days
    const dueIn7Stats = await PurchaseOrder.aggregate([
      {
        $match: {
          ...matchActiveCredit,
          balanceDue: { $gt: 0 },
          paymentDueDate: { $gte: now, $lte: sevenDaysFromNow }
        }
      },
      {
        $group: {
          _id: null,
          totalDueIn7Days: { $sum: '$balanceDue' },
          countDueIn7Days: { $sum: 1 }
        }
      }
    ]);

    // Due in 30 Days
    const dueIn30Stats = await PurchaseOrder.aggregate([
      {
        $match: {
          ...matchActiveCredit,
          balanceDue: { $gt: 0 },
          paymentDueDate: { $gte: now, $lte: thirtyDaysFromNow }
        }
      },
      {
        $group: {
          _id: null,
          totalDueIn30Days: { $sum: '$balanceDue' },
          countDueIn30Days: { $sum: 1 }
        }
      }
    ]);

    // Top 5 Suppliers with highest outstanding payable
    const topSuppliers = await PurchaseOrder.aggregate([
      {
        $match: {
          ...matchActiveCredit,
          balanceDue: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$supplier',
          totalBalanceDue: { $sum: '$balanceDue' },
          ordersCount: { $sum: 1 }
        }
      },
      { $sort: { totalBalanceDue: -1 } },
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
          creditLimit: '$supplier.creditLimit',
          totalBalanceDue: 1,
          ordersCount: 1
        }
      }
    ]);

    // Suppliers exceeding or near credit limit (>= 90% utilization)
    const suppliersWithLimit = await Supplier.find({
      isDeleted: false,
      creditLimit: { $gt: 0 }
    }).select('supplierName supplierCode creditLimit currentCreditBalance');

    const highUtilizationSuppliers = suppliersWithLimit
      .map((s) => {
        const balance = s.currentCreditBalance || 0;
        const limit = s.creditLimit;
        const utilization = (balance / limit) * 100;
        return {
          supplierId: s._id,
          supplierName: s.supplierName,
          supplierCode: s.supplierCode,
          creditLimit: limit,
          currentCreditBalance: balance,
          utilizationPercentage: Number(utilization.toFixed(1)),
          isExceeded: balance > limit
        };
      })
      .filter((s) => s.utilizationPercentage >= 80)
      .sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);

    const overall = overallStats[0] || {
      totalCreditPurchases: 0,
      totalPaid: 0,
      totalOutstandingPayable: 0,
      count: 0
    };
    const overdue = overdueStats[0] || { totalOverdue: 0, overdueCount: 0 };
    const dueIn7 = dueIn7Stats[0] || { totalDueIn7Days: 0, countDueIn7Days: 0 };
    const dueIn30 = dueIn30Stats[0] || { totalDueIn30Days: 0, countDueIn30Days: 0 };

    return sendSuccess(res, 'Credit purchasing dashboard metrics retrieved', {
      totalCreditPurchases: overall.totalCreditPurchases,
      totalPaid: overall.totalPaid,
      totalOutstandingPayable: overall.totalOutstandingPayable,
      totalCreditOrdersCount: overall.count,
      totalOverdueAmount: overdue.totalOverdue,
      overdueOrdersCount: overdue.overdueCount,
      dueIn7DaysAmount: dueIn7.totalDueIn7Days,
      dueIn7DaysCount: dueIn7.countDueIn7Days,
      dueIn30DaysAmount: dueIn30.totalDueIn30Days,
      dueIn30DaysCount: dueIn30.countDueIn30Days,
      topSuppliersByPayable: topSuppliers,
      highUtilizationSuppliers
    });
  } catch (error) {
    return sendError(res, 'Failed to retrieve credit purchasing dashboard', 500, error);
  }
};

/**
 * Get standard Accounts Payable (AP) Aging Report
 * Buckets: Current (not due), 1-30 days, 31-60 days, 61-90 days, 90+ days
 */
export const getAccountsPayableAgingReport = async (req, res) => {
  try {
    const now = new Date();

    const unpaidCreditOrders = await PurchaseOrder.find({
      paymentType: 'credit',
      status: { $nin: ['cancelled', 'rejected'] },
      balanceDue: { $gt: 0 }
    }).populate('supplier', 'supplierName supplierCode creditLimit currentCreditBalance paymentTerms');

    const supplierMap = {};

    let grandTotalCurrent = 0;
    let grandTotal1To30 = 0;
    let grandTotal31To60 = 0;
    let grandTotal61To90 = 0;
    let grandTotalOver90 = 0;
    let grandTotalOutstanding = 0;

    for (const order of unpaidCreditOrders) {
      if (!order.supplier) continue;
      const suppId = order.supplier._id.toString();

      if (!supplierMap[suppId]) {
        supplierMap[suppId] = {
          supplierId: order.supplier._id,
          supplierName: order.supplier.supplierName,
          supplierCode: order.supplier.supplierCode,
          creditLimit: order.supplier.creditLimit || 0,
          current: 0,
          days1To30: 0,
          days31To60: 0,
          days61To90: 0,
          daysOver90: 0,
          totalOutstanding: 0,
          invoicesCount: 0
        };
      }

      const balance = Number(order.balanceDue || 0);
      supplierMap[suppId].totalOutstanding += balance;
      supplierMap[suppId].invoicesCount += 1;
      grandTotalOutstanding += balance;

      let daysPastDue = 0;
      if (order.paymentDueDate) {
        const diffMs = now.getTime() - new Date(order.paymentDueDate).getTime();
        daysPastDue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      if (daysPastDue <= 0) {
        supplierMap[suppId].current += balance;
        grandTotalCurrent += balance;
      } else if (daysPastDue <= 30) {
        supplierMap[suppId].days1To30 += balance;
        grandTotal1To30 += balance;
      } else if (daysPastDue <= 60) {
        supplierMap[suppId].days31To60 += balance;
        grandTotal31To60 += balance;
      } else if (daysPastDue <= 90) {
        supplierMap[suppId].days61To90 += balance;
        grandTotal61To90 += balance;
      } else {
        supplierMap[suppId].daysOver90 += balance;
        grandTotalOver90 += balance;
      }
    }

    const agingData = Object.values(supplierMap).sort(
      (a, b) => b.totalOutstanding - a.totalOutstanding
    );

    return sendSuccess(res, 'Accounts payable aging report generated successfully', {
      grandTotals: {
        current: grandTotalCurrent,
        days1To30: grandTotal1To30,
        days31To60: grandTotal31To60,
        days61To90: grandTotal61To90,
        daysOver90: grandTotalOver90,
        totalOutstanding: grandTotalOutstanding
      },
      suppliers: agingData
    });
  } catch (error) {
    return sendError(res, 'Failed to generate accounts payable aging report', 500, error);
  }
};

/**
 * Get comprehensive supplier credit ledger / statement of account
 */
export const getSupplierCreditLedger = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { startDate, endDate } = req.query;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return sendError(res, 'Supplier not found', 404);
    }

    const poQuery = {
      supplier: supplierId,
      paymentType: 'credit',
      status: { $nin: ['cancelled', 'rejected'] }
    };

    const paymentQuery = {
      supplier: supplierId,
      status: 'paid'
    };

    const returnQuery = {
      supplier: supplierId,
      status: { $in: ['returned', 'refunded'] }
    };

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      poQuery.orderDate = dateFilter;
      paymentQuery.paymentDate = dateFilter;
      returnQuery.returnDate = dateFilter;
    }

    const [orders, payments, returns] = await Promise.all([
      PurchaseOrder.find(poQuery).select(
        'purchaseOrderNumber orderDate grandTotal paidAmount balanceDue paymentStatus paymentDueDate status'
      ),
      PurchasePayment.find(paymentQuery).select(
        'paymentNumber paymentDate amount paymentMethod transactionReference purchaseOrder notes'
      ),
      SupplierReturn.find(returnQuery).select('returnNumber returnDate refundAmount items notes')
    ]);

    // Build timeline ledger entries
    const ledger = [];

    // 1. Credit Purchases (Billed/Invoiced to payables)
    orders.forEach((o) => {
      ledger.push({
        date: o.orderDate,
        type: 'PURCHASE_ORDER',
        referenceNumber: o.purchaseOrderNumber,
        referenceId: o._id,
        description: `Credit Purchase Order ${o.purchaseOrderNumber}`,
        dueDate: o.paymentDueDate,
        debit: o.grandTotal, // Increases amount we owe
        credit: 0,
        balanceDue: o.balanceDue,
        status: o.paymentStatus
      });
    });

    // 2. Payments (Settlements reducing payables)
    payments.forEach((p) => {
      ledger.push({
        date: p.paymentDate,
        type: 'PAYMENT',
        referenceNumber: p.paymentNumber,
        referenceId: p._id,
        description: `Payment via ${p.paymentMethod} (Ref: ${p.transactionReference || 'N/A'})`,
        dueDate: null,
        debit: 0,
        credit: p.amount, // Decreases amount we owe
        status: 'paid'
      });
    });

    // 3. Returns (Debit Notes reducing payables)
    returns.forEach((r) => {
      const returnAmount =
        Number(r.refundAmount || 0) > 0
          ? Number(r.refundAmount)
          : (r.items || []).reduce((sum, item) => sum + item.quantity * (item.unitCost || 0), 0);

      ledger.push({
        date: r.returnDate,
        type: 'SUPPLIER_RETURN',
        referenceNumber: r.returnNumber,
        referenceId: r._id,
        description: `Supplier Return / Debit Note ${r.returnNumber}`,
        dueDate: null,
        debit: 0,
        credit: returnAmount,
        status: 'returned'
      });
    });

    // Sort chronologically
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    const ledgerWithRunningBalance = ledger.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return {
        ...entry,
        runningBalance: Math.max(0, runningBalance)
      };
    });

    // Keep supplier cached balance in sync
    supplier.currentCreditBalance = Math.max(0, runningBalance);
    await supplier.save();

    const limit = Number(supplier.creditLimit || 0);

    return sendSuccess(res, 'Supplier credit ledger retrieved successfully', {
      supplier: {
        _id: supplier._id,
        supplierName: supplier.supplierName,
        supplierCode: supplier.supplierCode,
        creditLimit: limit,
        creditPeriodDays: supplier.creditPeriodDays || 30,
        currentCreditBalance: supplier.currentCreditBalance,
        availableCredit: limit > 0 ? Math.max(0, limit - supplier.currentCreditBalance) : null
      },
      ledger: ledgerWithRunningBalance
    });
  } catch (error) {
    return sendError(res, 'Failed to retrieve supplier credit ledger', 500, error);
  }
};

/**
 * Settle a credit purchase directly
 */
export const settleCreditPurchase = async (req, res) => {
  try {
    const {
      purchaseOrderId,
      amount,
      paymentMethod = 'bank transfer',
      transactionReference,
      bankName,
      paymentDate,
      notes
    } = req.body;

    if (!purchaseOrderId || !amount) {
      return sendError(res, 'Purchase order ID and amount are required for settlement', 400);
    }

    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) {
      return sendError(res, 'Purchase order not found', 404);
    }

    if (po.paymentType !== 'credit') {
      return sendError(res, 'Only credit purchase orders can be settled here', 400);
    }

    const payAmount = Number(amount);
    if (payAmount <= 0) {
      return sendError(res, 'Settlement amount must be positive', 400);
    }

    if (payAmount > (po.balanceDue || 0)) {
      return sendError(
        res,
        `Payment amount (${payAmount}) exceeds the outstanding balance (${po.balanceDue})`,
        400
      );
    }

    const paymentNumber = generateCode('PAY-SETTLE');

    const payment = await PurchasePayment.create({
      paymentNumber,
      supplier: po.supplier,
      purchaseOrder: po._id,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      amount: payAmount,
      currency: po.currency || 'ETB',
      paymentMethod,
      transactionReference,
      bankName,
      paidBy: req.user?._id,
      approvedBy: req.user?._id,
      notes: notes || `Settlement for credit PO ${po.purchaseOrderNumber}`,
      status: 'paid'
    });

    // Synchronize balance on PO and Supplier
    await syncPaymentWithPOAndSupplier(payment, false);

    const updatedPo = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'supplierName supplierCode currentCreditBalance')
      .populate('createdBy', 'fullName email');

    return sendSuccess(res, 'Credit purchase settled successfully', {
      payment,
      purchaseOrder: updatedPo
    }, 201);
  } catch (error) {
    return sendError(res, 'Failed to settle credit purchase', 500, error);
  }
};

/**
 * Extend or update credit due date
 */
export const extendCreditDueDate = async (req, res) => {
  try {
    const { id } = req.params;
    const { newDueDate, reason } = req.body;

    if (!newDueDate) {
      return sendError(res, 'New due date is required', 400);
    }

    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return sendError(res, 'Purchase order not found', 404);
    }

    const previousDueDate = po.paymentDueDate;
    po.paymentDueDate = new Date(newDueDate);

    // Re-evaluate payment status
    if (po.balanceDue === 0 && po.grandTotal > 0) {
      po.paymentStatus = 'paid';
    } else if (po.paidAmount > 0) {
      po.paymentStatus = 'partially paid';
    } else if (new Date(po.paymentDueDate) < new Date() && po.balanceDue > 0) {
      po.paymentStatus = 'overdue';
    } else {
      po.paymentStatus = 'unpaid';
    }

    await po.save();

    await recordApproval({
      referenceType: 'purchase order',
      referenceId: po._id,
      action: 'due date extended',
      actionBy: req.user?._id,
      comment: `Credit due date extended from ${previousDueDate ? new Date(previousDueDate).toLocaleDateString() : 'N/A'} to ${new Date(newDueDate).toLocaleDateString()}. Reason: ${reason || 'Negotiated extension'}`
    });

    return sendSuccess(res, 'Credit due date extended successfully', po);
  } catch (error) {
    return sendError(res, 'Failed to extend credit due date', 500, error);
  }
};

