import express from 'express';

// HR Module Routes
import userRoutes from './userRoutes.js';
import employeeRoutes from './employeeRoutes.js';
import leaveRequestRoutes from './leaveRequestRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import overtimeRoutes from './overtimeRoutes.js';
import payrollRoutes from './payrollRoutes.js';
import jobPositionRoutes from './jobPositionRoutes.js';
import jobApplicationRoutes from './jobApplicationRoutes.js';
import internshipRoutes from './internshipRoutes.js';
import clearanceRoutes from './clearanceRoutes.js';
import leaveBalanceRoutes from './leaveBalanceRoutes.js';
import companySettingRoutes from './companySettingRoutes.js';

// Store & Inventory Module Routes
import warehouseRoutes from './warehouseRoutes.js';
import inventoryCategoryRoutes from './inventoryCategoryRoutes.js';
import inventoryItemRoutes from './inventoryItemRoutes.js';
import stockBalanceRoutes from './stockBalanceRoutes.js';
import stockMovementRoutes from './stockMovementRoutes.js';
import stockAdjustmentRoutes from './stockAdjustmentRoutes.js';
import stockTransferRoutes from './stockTransferRoutes.js';
import stockRequestRoutes from './stockRequestRoutes.js';

// Purchase Management Module Routes
import supplierRoutes from './supplierRoutes.js';
import purchaseRequestRoutes from './purchaseRequestRoutes.js';
import purchaseOrderRoutes from './purchaseOrderRoutes.js';
import goodsReceiptRoutes from './goodsReceiptRoutes.js';
import purchasePaymentRoutes from './purchasePaymentRoutes.js';
import supplierReturnRoutes from './supplierReturnRoutes.js';

// System Support Routes
import approvalHistoryRoutes from './approvalHistoryRoutes.js';
import inventoryAuditLogRoutes from './inventoryAuditLogRoutes.js';

const router = express.Router();

// HR Module
router.use('/users', userRoutes);
router.use('/employees', employeeRoutes);
router.use('/leave-requests', leaveRequestRoutes);
router.use('/attendances', attendanceRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/overtimes', overtimeRoutes);
router.use('/overtime', overtimeRoutes);
router.use('/payrolls', payrollRoutes);
router.use('/payroll', payrollRoutes);
router.use('/job-positions', jobPositionRoutes);
router.use('/job-applications', jobApplicationRoutes);
router.use('/internships', internshipRoutes);
router.use('/clearances', clearanceRoutes);
router.use('/leave-balances', leaveBalanceRoutes);
router.use('/company-settings', companySettingRoutes);
router.use('/company-setting', companySettingRoutes);

// Store & Inventory Module
router.use('/warehouses', warehouseRoutes);
router.use('/inventory-categories', inventoryCategoryRoutes);
router.use('/inventory-items', inventoryItemRoutes);
router.use('/stock-balances', stockBalanceRoutes);
router.use('/stock-movements', stockMovementRoutes);
router.use('/stock-adjustments', stockAdjustmentRoutes);
router.use('/stock-transfers', stockTransferRoutes);
router.use('/stock-requests', stockRequestRoutes);

// Purchase Management Module
router.use('/suppliers', supplierRoutes);
router.use('/purchase-requests', purchaseRequestRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/goods-receipts', goodsReceiptRoutes);
router.use('/purchase-payments', purchasePaymentRoutes);
router.use('/supplier-returns', supplierReturnRoutes);

// System Support
router.use('/approval-history', approvalHistoryRoutes);
router.use('/approval-histories', approvalHistoryRoutes);
router.use('/inventory-audit-logs', inventoryAuditLogRoutes);

export default router;
