import PurchaseOrder from '../models/PurchaseOrder.js';
import GoodsReceipt from '../models/GoodsReceipt.js';
import StockRequest from '../models/StockRequest.js';
import StaffReturn from '../models/StaffReturn.js';
import StockMovement from '../models/StockMovement.js';
import StockAdjustment from '../models/StockAdjustment.js';
import StockBalance from '../models/StockBalance.js';
import InventoryItem from '../models/InventoryItem.js';
import Supplier from '../models/Supplier.js';
import Warehouse from '../models/Warehouse.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Helper to compute date range from timeframe parameter
 */
const parseDateRange = (timeframe, customStart, customEnd) => {
  const now = new Date();
  let start = new Date();
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (timeframe) {
    case 'daily':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;

    case 'weekly':
      // Last 7 days
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      break;

    case 'monthly':
      // Start of current month
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;

    case 'yearly':
      // Start of current year
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;

    case 'custom':
      if (customStart) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      if (customEnd) {
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      }
      break;

    default:
      // Default to monthly
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  return { start, end };
};

/**
 * Get Comprehensive Operations & Financial Report
 * Dedicated multi-actor analytics with Daily / Weekly / Monthly / Yearly / Custom filtering
 */
export const getComprehensiveReport = async (req, res) => {
  try {
    const {
      timeframe = 'monthly',
      startDate,
      endDate,
      actor = 'all', // 'all' | 'storekeeper' | 'purchaser' | 'employee' | 'manager'
      warehouse,
      department,
      vatStatus // 'all' | 'with_vat' | 'without_vat'
    } = req.query;

    const { start, end } = parseDateRange(timeframe, startDate, endDate);

    const userRoles = req.user?.roles || [];
    const isPureEmployee =
      userRoles.includes('employee') &&
      !userRoles.some((r) => ['admin', 'manager', 'storekeeper', 'purchaser', 'finance'].includes(r));

    // Common Date Filter
    const dateQuery = { $gte: start, $lte: end };

    // ==========================================
    // 1. PURCHASING & PROCUREMENT AGGREGATION
    // ==========================================
    const poQuery = {
      orderDate: dateQuery,
      status: { $nin: ['cancelled', 'rejected'] }
    };
    if (warehouse) poQuery.warehouse = warehouse;
    if (vatStatus === 'with_vat') poQuery.taxAmount = { $gt: 0 };
    if (vatStatus === 'without_vat') poQuery.taxAmount = { $lte: 0 };

    const purchaseOrders = await PurchaseOrder.find(poQuery)
      .populate('supplier', 'supplierName supplierCode')
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('items.item', 'itemName itemCode')
      .sort({ orderDate: -1 })
      .lean();

    let totalSpend = 0;
    let totalVatAmount = 0;
    let withVatCount = 0;
    let withVatSpend = 0;
    let withoutVatCount = 0;
    let withoutVatSpend = 0;
    let totalCreditSpend = 0;
    let totalCashSpend = 0;
    const spendBySupplierMap = {};

    purchaseOrders.forEach((po) => {
      const gTotal = Number(po.grandTotal || 0);
      const tax = Number(po.taxAmount || 0);

      totalSpend += gTotal;
      totalVatAmount += tax;

      if (tax > 0) {
        withVatCount++;
        withVatSpend += gTotal;
      } else {
        withoutVatCount++;
        withoutVatSpend += gTotal;
      }

      if (po.paymentType === 'credit') {
        totalCreditSpend += gTotal;
      } else {
        totalCashSpend += gTotal;
      }

      const suppName = po.supplier?.supplierName || 'Unknown Supplier';
      spendBySupplierMap[suppName] = (spendBySupplierMap[suppName] || 0) + gTotal;
    });

    const spendBySupplier = Object.entries(spendBySupplierMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    // ==========================================
    // 2. GOODS RECEIPTS (INWARD GRN) AGGREGATION
    // ==========================================
    const grQuery = { receiptDate: dateQuery };
    if (warehouse) grQuery.warehouse = warehouse;

    const goodsReceipts = await GoodsReceipt.find(grQuery)
      .populate('supplier', 'supplierName')
      .populate('warehouse', 'warehouseName')
      .populate('items.item', 'itemName itemCode')
      .lean();

    let totalGrnCount = goodsReceipts.length;
    let totalAcceptedItemsQty = 0;
    let totalDamagedItemsQty = 0;

    goodsReceipts.forEach((gr) => {
      (gr.items || []).forEach((itm) => {
        totalAcceptedItemsQty += Number(itm.acceptedQuantity || itm.receivedQuantity || 0);
        totalDamagedItemsQty += Number(itm.damagedQuantity || 0);
      });
    });

    // ==========================================
    // 3. MATERIAL REQUISITIONS (OUTWARD SIV)
    // ==========================================
    const reqQuery = { createdAt: dateQuery };
    if (warehouse) reqQuery.warehouse = warehouse;
    if (department) reqQuery.department = department;

    if (isPureEmployee) {
      const empId = req.user?.employee?._id || req.user?.employee;
      reqQuery.$or = [
        { requestedBy: req.user._id },
        ...(empId ? [{ requestedBy: empId }] : [])
      ];
    }

    const stockRequests = await StockRequest.find(reqQuery)
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('items.item', 'itemName itemCode')
      .populate('requestedBy', 'fullName email department')
      .sort({ createdAt: -1 })
      .lean();

    let totalRequestsCount = stockRequests.length;
    let approvedRequestsCount = 0;
    let completedRequestsCount = 0;
    let pendingRequestsCount = 0;
    let totalIssuedItemsQty = 0;
    const consumptionByDeptMap = {};
    const consumptionByItemMap = {};

    stockRequests.forEach((reqItem) => {
      if (reqItem.status === 'completed') completedRequestsCount++;
      else if (reqItem.status === 'approved' || reqItem.status === 'partially issued') approvedRequestsCount++;
      else if (reqItem.status === 'pending') pendingRequestsCount++;

      const dept = reqItem.department || 'General';
      (reqItem.items || []).forEach((i) => {
        const issuedQty = Number(i.issuedQuantity || (reqItem.status === 'completed' ? i.approvedQuantity : 0));
        totalIssuedItemsQty += issuedQty;
        consumptionByDeptMap[dept] = (consumptionByDeptMap[dept] || 0) + issuedQty;

        const itName = i.item?.itemName || 'Material';
        consumptionByItemMap[itName] = (consumptionByItemMap[itName] || 0) + issuedQty;
      });
    });

    const consumptionByDept = Object.entries(consumptionByDeptMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity);

    const topConsumedItems = Object.entries(consumptionByItemMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    // ==========================================
    // 4. STAFF MATERIAL RETURNS (SRV)
    // ==========================================
    const staffReturnQuery = { createdAt: dateQuery };
    if (warehouse) staffReturnQuery.warehouse = warehouse;
    if (department) staffReturnQuery.department = department;

    if (isPureEmployee) {
      const empId = req.user?.employee?._id || req.user?.employee;
      staffReturnQuery.$or = [
        { returnedBy: req.user._id },
        ...(empId ? [{ returnedBy: empId }] : [])
      ];
    }

    const staffReturns = await StaffReturn.find(staffReturnQuery)
      .populate('warehouse', 'warehouseName')
      .populate('items.item', 'itemName itemCode')
      .populate('returnedBy', 'fullName department')
      .populate('originalStockRequest', 'requestNumber')
      .sort({ createdAt: -1 })
      .lean();

    let totalReturnsCount = staffReturns.length;
    let restockedReturnsCount = 0;
    let goodReturnedQty = 0;
    let damagedReturnedQty = 0;
    let scrapReturnedQty = 0;

    staffReturns.forEach((ret) => {
      if (ret.status === 'received') restockedReturnsCount++;
      (ret.items || []).forEach((itm) => {
        const q = Number(itm.acceptedQuantity || itm.quantity || 0);
        if (itm.condition === 'good') goodReturnedQty += q;
        else if (itm.condition === 'damaged') damagedReturnedQty += q;
        else if (itm.condition === 'scrap') scrapReturnedQty += q;
      });
    });

    // ==========================================
    // 5. STOCK MOVEMENTS LEDGER SUMMARY
    // ==========================================
    const movementQuery = { movementDate: dateQuery };
    if (warehouse) movementQuery.warehouse = warehouse;

    const movements = await StockMovement.find(movementQuery)
      .populate('item', 'itemName itemCode')
      .populate('warehouse', 'warehouseName')
      .sort({ movementDate: -1 })
      .limit(200)
      .lean();

    const movementsByType = {
      purchaseReceipt: 0,
      stockIssue: 0,
      stockReturn: 0,
      transfer: 0,
      adjustment: 0,
      damaged: 0
    };

    movements.forEach((m) => {
      switch (m.movementType) {
        case 'purchase receipt':
          movementsByType.purchaseReceipt++;
          break;
        case 'stock issue':
          movementsByType.stockIssue++;
          break;
        case 'return':
          movementsByType.stockReturn++;
          break;
        case 'stock transfer in':
        case 'stock transfer out':
          movementsByType.transfer++;
          break;
        case 'adjustment':
          movementsByType.adjustment++;
          break;
        case 'damaged':
          movementsByType.damaged++;
          break;
      }
    });

    // ==========================================
    // 6. INVENTORY VALUATION & AUDIT STATUS
    // ==========================================
    const balances = await StockBalance.find(warehouse ? { warehouse } : {})
      .populate('item', 'unitCost itemName itemCode minStockLevel')
      .populate('warehouse', 'warehouseName')
      .lean();

    let totalValuation = 0;
    let lowStockCount = 0;

    balances.forEach((b) => {
      const q = Number(b.quantityOnHand || 0);
      const cost = Number(b.item?.unitCost || 0);
      totalValuation += q * cost;
      if (b.item?.minStockLevel && q <= b.item.minStockLevel) {
        lowStockCount++;
      }
    });

    // Construct unified activity log for data grid & export
    const unifiedLog = [];

    // Add Purchase Orders to log
    purchaseOrders.slice(0, 100).forEach((po) => {
      unifiedLog.push({
        id: po._id,
        date: po.orderDate || po.createdAt,
        type: 'Purchase Order',
        referenceNumber: po.purchaseOrderNumber,
        actor: po.supplier?.supplierName || 'Supplier',
        department: 'Purchasing',
        warehouse: po.warehouse?.warehouseName || 'Warehouse',
        status: po.status,
        amount: po.grandTotal,
        vatStatus: po.taxAmount > 0 ? `With VAT (${po.taxAmount.toLocaleString()} ETB)` : 'Without VAT (0%)',
        details: `${po.items?.length || 0} line item(s)`
      });
    });

    // Add Material Requests to log
    stockRequests.slice(0, 100).forEach((sr) => {
      unifiedLog.push({
        id: sr._id,
        date: sr.createdAt,
        type: 'Material Requisition (SIV)',
        referenceNumber: sr.requestNumber,
        actor: sr.requestedBy?.fullName || 'Employee',
        department: sr.department,
        warehouse: sr.warehouse?.warehouseName || 'Warehouse',
        status: sr.status,
        amount: null,
        vatStatus: 'N/A',
        details: sr.purpose || `${sr.items?.length || 0} item(s)`
      });
    });

    // Add Staff Returns to log
    staffReturns.slice(0, 100).forEach((ret) => {
      unifiedLog.push({
        id: ret._id,
        date: ret.createdAt,
        type: 'Staff Material Return (SRV)',
        referenceNumber: ret.returnNumber,
        actor: ret.returnedBy?.fullName || 'Staff Member',
        department: ret.department,
        warehouse: ret.warehouse?.warehouseName || 'Warehouse',
        status: ret.status,
        amount: null,
        vatStatus: 'N/A',
        details: ret.reason || `${ret.items?.length || 0} returned item(s)`
      });
    });

    // Sort unified log descending by date
    unifiedLog.sort((a, b) => new Date(b.date) - new Date(a.date));

    return sendSuccess(res, 'Comprehensive operational report generated successfully', {
      timeframe,
      range: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      actorScope: actor,
      summary: {
        totalSpend,
        totalVatAmount,
        totalPOs: purchaseOrders.length,
        withVatCount,
        withVatSpend,
        withoutVatCount,
        withoutVatSpend,
        totalCreditSpend,
        totalCashSpend,
        totalGrnCount,
        totalAcceptedItemsQty,
        totalDamagedItemsQty,
        totalRequestsCount,
        approvedRequestsCount,
        completedRequestsCount,
        pendingRequestsCount,
        totalIssuedItemsQty,
        totalReturnsCount,
        restockedReturnsCount,
        goodReturnedQty,
        damagedReturnedQty,
        scrapReturnedQty,
        totalValuation,
        lowStockCount,
        movementsCount: movements.length
      },
      analytics: {
        spendBySupplier,
        consumptionByDept,
        topConsumedItems,
        movementsByType
      },
      unifiedLog
    });
  } catch (error) {
    console.error('Failed to generate comprehensive report:', error);
    return sendError(res, 'Failed to generate operational report', 500, error);
  }
};

