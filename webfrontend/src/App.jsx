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
import StockTransfers from './pages/store/StockTransfers';
import StockAdjustments from './pages/store/StockAdjustments';
import StockMovements from './pages/store/StockMovements';
import Warehouses from './pages/store/Warehouses';

// Public Careers & Job Application Pages
import PublicJobs from './pages/careers/PublicJobs';
import PublicJobDetail from './pages/careers/PublicJobDetail';

// Public Employee ID Card Verification (accessible via QR code scan)
import PublicIdCardVerification from './pages/public/PublicIdCardVerification';

// Future Modules (Sections 1, 3, 4, 5, 6 - non-blocking modular placeholders)
import UpcomingModule from './pages/modules/UpcomingModule';

function IndexRedirect() {
  const { user } = useAuth();
  if (user?.roles?.includes('storekeeper') && !user?.roles?.includes('admin') && !user?.roles?.includes('hr')) {
    return <Navigate to="/store/dashboard" replace />;
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
          <Route path="hr/dashboard" element={<HrDashboard />} />
          <Route path="hr/employees" element={<Employees />} />
          <Route path="hr/attendance" element={<Attendance />} />
          <Route path="hr/leave" element={<LeaveManagement />} />
          <Route path="hr/leave-requests" element={<LeaveManagement initialTab="requests" />} />
          <Route path="hr/leave-balances" element={<LeaveManagement initialTab="balances" />} />
          <Route path="hr/overtimes" element={<Overtime />} />
          <Route path="hr/payrolls" element={<Payroll />} />
          <Route path="hr/recruitment" element={<Recruitment />} />
          <Route path="hr/internships" element={<Internships />} />
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
          <Route path="store" element={<Navigate to="/store/dashboard" replace />} />
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
              <ProtectedRoute roles={['admin', 'storekeeper', 'manager']}>
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
              <ProtectedRoute roles={['admin', 'storekeeper', 'manager']}>
                <StockOutward />
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

          {/* Non-Blocking Planned Modules */}
          <Route path="purchasing/*" element={<UpcomingModule moduleId="purchasing" />} />
          <Route path="production/*" element={<UpcomingModule moduleId="production" />} />
          <Route path="crm/*" element={<UpcomingModule moduleId="crm" />} />
          <Route path="finance/*" element={<UpcomingModule moduleId="finance" />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/hr/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
