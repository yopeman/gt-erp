import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Auth
import Login from './pages/auth/Login';

// HR Module Pages (Section 2 of requirements PDF)
import HrDashboard from './pages/hr/HrDashboard';
import Employees from './pages/hr/Employees';
import Attendance from './pages/hr/Attendance';
import LeaveManagement from './pages/hr/LeaveManagement';
import Overtime from './pages/hr/Overtime';
import Payroll from './pages/hr/Payroll';
import Recruitment from './pages/hr/Recruitment';
import Internships from './pages/hr/Internships';
import Clearances from './pages/hr/Clearances';
import CompanySettings from './pages/hr/CompanySettings';

// Admin Pages (Section 7.1)
import UsersPage from './pages/admin/Users';

// Store & Inventory Module Pages (Section 1 of requirements PDF)
import StoreDashboard from './pages/store/StoreDashboard';
import StoreInventory from './pages/store/StoreInventory';
import StockInward from './pages/store/StockInward';
import StockOutward from './pages/store/StockOutward';
import StaffReturns from './pages/store/StaffReturns';
import StockTransfers from './pages/store/StockTransfers';
import StockAdjustments from './pages/store/StockAdjustments';
import StockMovements from './pages/store/StockMovements';
import Warehouses from './pages/store/Warehouses';

// Purchasing & Procurement Module Pages (Section 4 of requirements PDF)
import PurchasingDashboard from './pages/purchasing/PurchasingDashboard';
import PurchaseRequests from './pages/purchasing/PurchaseRequests';
import PurchaseOrders from './pages/purchasing/PurchaseOrders';
import Suppliers from './pages/purchasing/Suppliers';
import GoodsReceipts from './pages/purchasing/GoodsReceipts';
import CreditPurchases from './pages/purchasing/CreditPurchases';
import PurchasePayments from './pages/purchasing/PurchasePayments';
import SupplierReturns from './pages/purchasing/SupplierReturns';

// CRM & Sales Module Pages (Phases 3A, 3B & 3C)
import CrmDashboard from './pages/crm/CrmDashboard';
import Leads from './pages/crm/Leads';
import Customers from './pages/crm/Customers';
import Followups from './pages/crm/Followups';
import Services from './pages/crm/Services';
import Orders from './pages/crm/Orders';
import DesignProofing from './pages/crm/DesignProofing';
import Proformas from './pages/crm/Proformas';
import Invoices from './pages/crm/Invoices';
import Payments from './pages/crm/Payments';

// Machine & Production Operations Module Pages (Phases 4A, 4B, 4C & 4D)
import ProductionDashboard from './pages/production/ProductionDashboard';
import Machines from './pages/production/Machines';
import MachineCheckups from './pages/production/MachineCheckups';
import MachineMaintenance from './pages/production/MachineMaintenance';
import ProductionJobs from './pages/production/ProductionJobs';
import ProductionWastage from './pages/production/ProductionWastage';

// Dedicated Reports & Analytics Center
import ReportsCenter from './pages/reports/ReportsCenter';

// Finance & Accounting Module Pages (Phase 5)
import FinanceDashboard from './pages/finance/FinanceDashboard';
import ChartOfAccounts from './pages/finance/ChartOfAccounts';
import JournalEntries from './pages/finance/JournalEntries';
import TreasuryBanking from './pages/finance/TreasuryBanking';
import SupplierBills from './pages/finance/SupplierBills';
import PayrollBatches from './pages/finance/PayrollBatches';
import OperatingExpenses from './pages/finance/OperatingExpenses';
import TaxCompliance from './pages/finance/TaxCompliance';

// Public Careers & Job Application Pages
import PublicJobs from './pages/careers/PublicJobs';
import PublicJobDetail from './pages/careers/PublicJobDetail';

// Public Employee ID Card Verification (accessible via QR code scan)
import PublicIdCardVerification from './pages/public/PublicIdCardVerification';

// Future Modules (Sections 1, 3, 4, 5, 6 - non-blocking modular placeholders)
import UpcomingModule from './pages/modules/UpcomingModule';

function StoreRedirect() {
  const { hasRole } = useAuth();
  if (hasRole(['admin', 'storekeeper', 'manager'])) {
    return <Navigate to="/store/dashboard" replace />;
  }
  return <Navigate to="/store/outward" replace />;
}

function PurchasingRedirect() {
  const { hasRole } = useAuth();
  if (hasRole(['admin', 'purchaser', 'manager', 'finance'])) {
    return <Navigate to="/purchasing/dashboard" replace />;
  }
  return <Navigate to="/purchasing/requests" replace />;
}

function IndexRedirect() {
  const { user } = useAuth();
  if (user?.roles?.includes('purchaser') && !user?.roles?.includes('admin') && !user?.roles?.includes('hr')) {
    return <Navigate to="/purchasing/dashboard" replace />;
  }
  if (user?.roles?.includes('storekeeper') && !user?.roles?.includes('admin') && !user?.roles?.includes('hr')) {
    return <Navigate to="/store/dashboard" replace />;
  }
  if (user?.roles?.includes('sales') && !user?.roles?.includes('admin') && !user?.roles?.includes('hr')) {
    return <Navigate to="/crm/dashboard" replace />;
  }
  if ((user?.roles?.includes('production_manager') || user?.roles?.includes('operator')) && !user?.roles?.includes('admin') && !user?.roles?.includes('hr')) {
    return <Navigate to="/production/dashboard" replace />;
  }
  if (user?.roles?.includes('employee') && !user?.roles?.includes('admin') && !user?.roles?.includes('hr') && !user?.roles?.includes('manager')) {
    return <Navigate to="/store/outward" replace />;
  }
  return <Navigate to="/hr/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login & Public Careers Board */}
        <Route path="/login" element={<Login />} />
        <Route path="/careers" element={<PublicJobs />} />
        <Route path="/careers/:id" element={<PublicJobDetail />} />
        <Route path="/jobs" element={<Navigate to="/careers" replace />} />
        <Route path="/jobs/:id" element={<PublicJobDetail />} />

        {/* Public Employee ID Verification */}
        <Route path="/verify-id/:id" element={<PublicIdCardVerification />} />
        <Route path="/id-card/:id" element={<PublicIdCardVerification />} />
        <Route path="/id/:id" element={<PublicIdCardVerification />} />

        {/* Protected ERP Shell */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Smart Landing Redirect */}
          <Route index element={<IndexRedirect />} />

          {/* HR Module Subroutes */}
          <Route
            path="hr/dashboard"
            element={
              <ProtectedRoute roles={['admin', 'hr', 'manager']}>
                <HrDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="hr/employees"
            element={
              <ProtectedRoute roles={['admin', 'hr', 'manager']}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route path="hr/attendance" element={<Attendance />} />
          <Route path="hr/leave" element={<LeaveManagement />} />
          <Route path="hr/leave-requests" element={<LeaveManagement initialTab="requests" />} />
          <Route path="hr/leave-balances" element={<LeaveManagement initialTab="balances" />} />
          <Route path="hr/overtimes" element={<Overtime />} />
          <Route
            path="hr/payrolls"
            element={
              <ProtectedRoute roles={['admin', 'hr', 'finance', 'employee', 'storekeeper', 'purchaser', 'manager']}>
                <Payroll />
              </ProtectedRoute>
            }
          />
          <Route
            path="hr/recruitment"
            element={
              <ProtectedRoute roles={['admin', 'hr']}>
                <Recruitment />
              </ProtectedRoute>
            }
          />
          <Route
            path="hr/internships"
            element={
              <ProtectedRoute roles={['admin', 'hr', 'manager']}>
                <Internships />
              </ProtectedRoute>
            }
          />
          <Route path="hr/clearances" element={<Clearances />} />
          <Route
            path="hr/settings"
            element={
              <ProtectedRoute roles={['admin', 'hr']}>
                <CompanySettings />
              </ProtectedRoute>
            }
          />

          {/* Central Admin Subroutes */}
          <Route
            path="admin/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          {/* Store & Inventory Module Subroutes (Section 1) */}
          <Route path="store" element={<StoreRedirect />} />
          <Route
            path="store/dashboard"
            element={
              <ProtectedRoute roles={['admin', 'storekeeper', 'manager']}>
                <StoreDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="store/inventory"
            element={
              <ProtectedRoute roles={['admin', 'storekeeper', 'manager', 'purchaser']}>
                <StoreInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="store/inward"
            element={
              <ProtectedRoute roles={['admin', 'storekeeper', 'manager']}>
                <StockInward />
              </ProtectedRoute>
            }
          />
          <Route
            path="store/outward"
            element={
              <ProtectedRoute roles={['admin', 'storekeeper', 'manager', 'employee']}>
                <StockOutward />
              </ProtectedRoute>
            }
          />
          <Route
            path="store/returns"
            element={
              <ProtectedRoute roles={['admin', 'storekeeper', 'manager', 'employee']}>
                <StaffReturns />
              </ProtectedRoute>
            }
          />
          <Route
            path="store/transfers"
            element={
              <ProtectedRoute roles={['admin', 'storekeeper', 'manager']}>
                <StockTransfers />
              </ProtectedRoute>
            }
          />
          <Route
            path="store/adjustments"
            element={
              <ProtectedRoute roles={['admin', 'storekeeper', 'manager']}>
                <StockAdjustments />
              </ProtectedRoute>
            }
          />
          <Route
            path="store/movements"
            element={
              <ProtectedRoute roles={['admin', 'storekeeper', 'manager']}>
                <StockMovements />
              </ProtectedRoute>
            }
          />
          <Route
            path="store/warehouses"
            element={
              <ProtectedRoute roles={['admin', 'storekeeper', 'manager']}>
                <Warehouses />
              </ProtectedRoute>
            }
          />
          <Route
            path="store/reports"
            element={
              <ProtectedRoute roles={['admin', 'storekeeper', 'manager', 'employee']}>
                <ReportsCenter />
              </ProtectedRoute>
            }
          />

          {/* Purchasing & Procurement Module Subroutes (Section 4) */}
          <Route path="purchasing" element={<PurchasingRedirect />} />
          <Route
            path="purchasing/dashboard"
            element={
              <ProtectedRoute roles={['admin', 'purchaser', 'manager', 'finance']}>
                <PurchasingDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchasing/requests"
            element={
              <ProtectedRoute roles={['admin', 'purchaser', 'manager', 'storekeeper']}>
                <PurchaseRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchasing/orders"
            element={
              <ProtectedRoute roles={['admin', 'purchaser', 'manager', 'finance']}>
                <PurchaseOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchasing/suppliers"
            element={
              <ProtectedRoute roles={['admin', 'purchaser', 'manager', 'finance']}>
                <Suppliers />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchasing/goods-receipts"
            element={
              <ProtectedRoute roles={['admin', 'purchaser', 'manager', 'storekeeper']}>
                <GoodsReceipts />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchasing/credit"
            element={
              <ProtectedRoute roles={['admin', 'purchaser', 'manager', 'finance']}>
                <CreditPurchases />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchasing/payments"
            element={
              <ProtectedRoute roles={['admin', 'purchaser', 'manager', 'finance']}>
                <PurchasePayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchasing/returns"
            element={
              <ProtectedRoute roles={['admin', 'purchaser', 'manager', 'storekeeper']}>
                <SupplierReturns />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchasing/reports"
            element={
              <ProtectedRoute roles={['admin', 'purchaser', 'manager', 'storekeeper', 'finance']}>
                <ReportsCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute>
                <ReportsCenter />
              </ProtectedRoute>
            }
          />

          {/* CRM & Sales Module Subroutes (Phase 3A) */}
          <Route path="crm" element={<Navigate to="/crm/dashboard" replace />} />
          <Route
            path="crm/dashboard"
            element={
              <ProtectedRoute roles={['admin', 'sales', 'manager']}>
                <CrmDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="crm/leads"
            element={
              <ProtectedRoute roles={['admin', 'sales', 'manager']}>
                <Leads />
              </ProtectedRoute>
            }
          />
          <Route
            path="crm/customers"
            element={
              <ProtectedRoute roles={['admin', 'sales', 'manager']}>
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="crm/followups"
            element={
              <ProtectedRoute roles={['admin', 'sales', 'manager']}>
                <Followups />
              </ProtectedRoute>
            }
          />
          <Route
            path="crm/services"
            element={
              <ProtectedRoute roles={['admin', 'sales', 'manager']}>
                <Services />
              </ProtectedRoute>
            }
          />
          <Route
            path="crm/orders"
            element={
              <ProtectedRoute roles={['admin', 'sales', 'manager']}>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="crm/design-proofing"
            element={
              <ProtectedRoute roles={['admin', 'sales', 'manager']}>
                <DesignProofing />
              </ProtectedRoute>
            }
          />
          <Route
            path="crm/proformas"
            element={
              <ProtectedRoute roles={['admin', 'sales', 'manager']}>
                <Proformas />
              </ProtectedRoute>
            }
          />
          <Route
            path="crm/invoices"
            element={
              <ProtectedRoute roles={['admin', 'sales', 'manager', 'finance']}>
                <Invoices />
              </ProtectedRoute>
            }
          />
          <Route
            path="crm/payments"
            element={
              <ProtectedRoute roles={['admin', 'sales', 'manager', 'finance']}>
                <Payments />
              </ProtectedRoute>
            }
          />

          {/* Machine & Production Operations Module Subroutes (Phases 4A, 4B, 4C & 4D) */}
          <Route path="production" element={<Navigate to="/production/dashboard" replace />} />
          <Route
            path="production/dashboard"
            element={
              <ProtectedRoute roles={['admin', 'production_manager', 'operator', 'manager']}>
                <ProductionDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="production/machines"
            element={
              <ProtectedRoute roles={['admin', 'production_manager', 'operator', 'manager']}>
                <Machines />
              </ProtectedRoute>
            }
          />
          <Route
            path="production/checkups"
            element={
              <ProtectedRoute roles={['admin', 'production_manager', 'operator', 'manager']}>
                <MachineCheckups />
              </ProtectedRoute>
            }
          />
          <Route
            path="production/maintenance"
            element={
              <ProtectedRoute roles={['admin', 'production_manager', 'operator', 'manager']}>
                <MachineMaintenance />
              </ProtectedRoute>
            }
          />
          <Route
            path="production/jobs"
            element={
              <ProtectedRoute roles={['admin', 'production_manager', 'operator', 'manager']}>
                <ProductionJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="production/wastage"
            element={
              <ProtectedRoute roles={['admin', 'production_manager', 'operator', 'manager']}>
                <ProductionWastage />
              </ProtectedRoute>
            }
          />

          {/* Finance & General Ledger Module Routes (Phase 5) */}
          <Route path="finance" element={<Navigate to="/finance/dashboard" replace />} />
          <Route
            path="finance/dashboard"
            element={
              <ProtectedRoute roles={['admin', 'finance', 'manager']}>
                <FinanceDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="finance/accounts"
            element={
              <ProtectedRoute roles={['admin', 'finance']}>
                <ChartOfAccounts />
              </ProtectedRoute>
            }
          />
          <Route
            path="finance/journal-entries"
            element={
              <ProtectedRoute roles={['admin', 'finance']}>
                <JournalEntries />
              </ProtectedRoute>
            }
          />
          <Route
            path="finance/treasury"
            element={
              <ProtectedRoute roles={['admin', 'finance', 'manager']}>
                <TreasuryBanking />
              </ProtectedRoute>
            }
          />
          <Route
            path="finance/supplier-bills"
            element={
              <ProtectedRoute roles={['admin', 'finance', 'manager']}>
                <SupplierBills />
              </ProtectedRoute>
            }
          />
          <Route
            path="finance/payroll-batches"
            element={
              <ProtectedRoute roles={['admin', 'finance']}>
                <PayrollBatches />
              </ProtectedRoute>
            }
          />
          <Route
            path="finance/expenses"
            element={
              <ProtectedRoute roles={['admin', 'finance', 'manager']}>
                <OperatingExpenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="finance/tax"
            element={
              <ProtectedRoute roles={['admin', 'finance']}>
                <TaxCompliance />
              </ProtectedRoute>
            }
          />

          {/* Non-Blocking Planned Modules */}
          <Route path="production/*" element={<UpcomingModule moduleId="production" />} />
          <Route path="crm/*" element={<UpcomingModule moduleId="crm" />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/hr/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
