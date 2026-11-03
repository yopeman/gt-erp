import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Auth
import Login from './pages/auth/Login';

// HR Module Pages (Section 2 of requirements PDF)
import HrDashboard from './pages/hr/HrDashboard';
import Employees from './pages/hr/Employees';
import Attendance from './pages/hr/Attendance';
import LeaveManagement from './pages/hr/LeaveManagement';
import LeaveRequests from './pages/hr/LeaveRequests';
import LeaveBalances from './pages/hr/LeaveBalances';
import Overtime from './pages/hr/Overtime';
import Payroll from './pages/hr/Payroll';
import Recruitment from './pages/hr/Recruitment';
import Internships from './pages/hr/Internships';
import Clearances from './pages/hr/Clearances';

// Admin Pages (Section 7.1)
import UsersPage from './pages/admin/Users';

// Public Careers & Job Application Pages
import PublicJobs from './pages/careers/PublicJobs';
import PublicJobDetail from './pages/careers/PublicJobDetail';

// Future Modules (Sections 1, 3, 4, 5, 6 - non-blocking modular placeholders)
import UpcomingModule from './pages/modules/UpcomingModule';

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

        {/* Protected ERP Shell */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Default redirect to HR dashboard */}
          <Route index element={<Navigate to="/hr/dashboard" replace />} />

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

          {/* Central Admin Subroutes */}
          <Route
            path="admin/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          {/* Non-Blocking Planned Modules */}
          <Route path="store/*" element={<UpcomingModule moduleId="store" />} />
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
