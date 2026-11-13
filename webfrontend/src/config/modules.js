/**
 * GT ERP Modular System Navigation & Permissions Matrix
 * Directly maps to functional requirements in erp-system-main-modules-functional-requirements.pdf
 */

export const ERP_MODULES = [
  {
    id: 'hr',
    titleKey: 'modules.hr',
    icon: 'Users',
    requiredRoles: [],
    status: 'active',
    submodules: [
      { id: 'dashboard', path: '/hr/dashboard', titleKey: 'nav.hrDashboard', icon: 'LayoutDashboard', requiredRoles: ['admin', 'hr', 'manager'], status: 'active' },
      { id: 'employees', path: '/hr/employees', titleKey: 'nav.employees', icon: 'UserCheck', requiredRoles: ['admin', 'hr', 'manager'], status: 'active' },
      { id: 'attendance', path: '/hr/attendance', titleKey: 'nav.attendance', icon: 'Clock', requiredRoles: ['admin', 'hr', 'manager', 'employee', 'storekeeper', 'purchaser', 'finance'], status: 'active' },
      { id: 'overtimes', path: '/hr/overtimes', titleKey: 'nav.overtime', icon: 'Timer', requiredRoles: ['admin', 'hr', 'manager', 'employee', 'storekeeper', 'purchaser', 'finance'], status: 'active' },
      { id: 'leave-management', path: '/hr/leave', titleKey: 'nav.leave', icon: 'CalendarDays', requiredRoles: ['admin', 'hr', 'manager', 'employee', 'storekeeper', 'purchaser', 'finance'], status: 'active' },
      { id: 'payrolls', path: '/hr/payrolls', titleKey: 'nav.payroll', icon: 'CreditCard', requiredRoles: ['admin', 'hr', 'finance', 'employee', 'storekeeper', 'purchaser', 'manager'], status: 'active' },
      { id: 'recruitment', path: '/hr/recruitment', titleKey: 'nav.recruitment', icon: 'Briefcase', requiredRoles: ['admin', 'hr'], status: 'active' },
      { id: 'careers', path: '/careers', titleKey: 'nav.careers', icon: 'Globe', requiredRoles: [], status: 'active' },
      { id: 'internships', path: '/hr/internships', titleKey: 'nav.internships', icon: 'GraduationCap', requiredRoles: ['admin', 'hr', 'manager'], status: 'active' },
      { id: 'clearances', path: '/hr/clearances', titleKey: 'nav.clearances', icon: 'FileCheck2', requiredRoles: ['admin', 'hr', 'manager', 'storekeeper', 'employee', 'purchaser', 'finance'], status: 'active' },
      { id: 'settings', path: '/hr/settings', titleKey: 'nav.companySettings', icon: 'Building2', requiredRoles: ['admin', 'hr'], status: 'active' },
      { id: 'hr-reports', path: '/hr/reports', titleKey: 'nav.hrReports', icon: 'BarChart3', requiredRoles: ['admin', 'hr', 'manager'], status: 'active' },
    ]
  },
  {
    id: 'admin',
    titleKey: 'modules.admin',
    icon: 'ShieldCheck',
    requiredRoles: ['admin'],
    status: 'active',
    submodules: [
      { id: 'users', path: '/admin/users', titleKey: 'nav.users', icon: 'Shield', requiredRoles: ['admin'], status: 'active' }
    ]
  },
  {
    id: 'store',
    titleKey: 'modules.store',
    icon: 'Package',
    requiredRoles: ['admin', 'storekeeper', 'manager', 'employee'],
    status: 'active',
    phase: 'Phase 2',
    description: 'Inventory, Raw Materials, Stock Movements, Inward GRV, Outward Releases',
    submodules: [
      { id: 'store-dashboard', path: '/store/dashboard', titleKey: 'nav.storeDashboard', icon: 'LayoutDashboard', requiredRoles: ['admin', 'storekeeper', 'manager'], status: 'active' },
      { id: 'store-inventory', path: '/store/inventory', titleKey: 'nav.storeInventory', icon: 'Boxes', requiredRoles: ['admin', 'storekeeper', 'manager', 'purchaser'], status: 'active' },
      { id: 'store-inward', path: '/store/inward', titleKey: 'nav.storeInward', icon: 'ArrowDownToLine', requiredRoles: ['admin', 'storekeeper', 'manager'], status: 'active' },
      { id: 'store-outward', path: '/store/outward', titleKey: 'nav.storeOutward', icon: 'ArrowUpFromLine', requiredRoles: ['admin', 'storekeeper', 'manager', 'employee'], status: 'active' },
      { id: 'store-returns', path: '/store/returns', titleKey: 'nav.storeReturns', icon: 'RotateCcw', requiredRoles: ['admin', 'storekeeper', 'manager', 'employee'], status: 'active' },
      { id: 'store-transfers', path: '/store/transfers', titleKey: 'nav.storeTransfers', icon: 'Repeat', requiredRoles: ['admin', 'storekeeper', 'manager'], status: 'active' },
      { id: 'store-adjustments', path: '/store/adjustments', titleKey: 'nav.storeAdjustments', icon: 'SlidersHorizontal', requiredRoles: ['admin', 'storekeeper', 'manager'], status: 'active' },
      { id: 'store-movements', path: '/store/movements', titleKey: 'nav.storeMovements', icon: 'History', requiredRoles: ['admin', 'storekeeper', 'manager'], status: 'active' },
      { id: 'store-warehouses', path: '/store/warehouses', titleKey: 'nav.storeWarehouses', icon: 'Warehouse', requiredRoles: ['admin', 'storekeeper', 'manager'], status: 'active' },
      { id: 'store-reports', path: '/store/reports', titleKey: 'nav.storeReports', icon: 'BarChart3', requiredRoles: ['admin', 'storekeeper', 'manager', 'employee'], status: 'active' },
    ]
  },
  {
    id: 'purchasing',
    titleKey: 'modules.purchasing',
    icon: 'ShoppingCart',
    requiredRoles: ['admin', 'purchaser', 'manager', 'storekeeper', 'finance'],
    status: 'active',
    phase: 'Phase 2',
    description: 'Purchase Requests, Purchase Orders (PO), Suppliers, Goods Receiving (GRV), Credit & Accounts Payable',
    submodules: [
      { id: 'purchasing-dashboard', path: '/purchasing/dashboard', titleKey: 'nav.purchasingDashboard', icon: 'LayoutDashboard', requiredRoles: ['admin', 'purchaser', 'manager', 'finance'], status: 'active' },
      { id: 'purchasing-requests', path: '/purchasing/requests', titleKey: 'nav.purchaseRequests', icon: 'FileText', requiredRoles: ['admin', 'purchaser', 'manager', 'storekeeper'], status: 'active' },
      { id: 'purchasing-orders', path: '/purchasing/orders', titleKey: 'nav.purchaseOrders', icon: 'ShoppingCart', requiredRoles: ['admin', 'purchaser', 'manager', 'finance'], status: 'active' },
      { id: 'purchasing-suppliers', path: '/purchasing/suppliers', titleKey: 'nav.suppliers', icon: 'Building2', requiredRoles: ['admin', 'purchaser', 'manager', 'finance'], status: 'active' },
      { id: 'purchasing-goods-receipts', path: '/purchasing/goods-receipts', titleKey: 'nav.goodsReceipts', icon: 'ArrowDownToLine', requiredRoles: ['admin', 'purchaser', 'manager', 'storekeeper'], status: 'active' },
      { id: 'purchasing-credit', path: '/purchasing/credit', titleKey: 'nav.creditPurchases', icon: 'CreditCard', requiredRoles: ['admin', 'purchaser', 'manager', 'finance'], status: 'active' },
      { id: 'purchasing-payments', path: '/purchasing/payments', titleKey: 'nav.purchasePayments', icon: 'DollarSign', requiredRoles: ['admin', 'purchaser', 'manager', 'finance'], status: 'active' },
      { id: 'purchasing-returns', path: '/purchasing/returns', titleKey: 'nav.supplierReturns', icon: 'RotateCcw', requiredRoles: ['admin', 'purchaser', 'manager', 'storekeeper'], status: 'active' },
      { id: 'purchasing-reports', path: '/purchasing/reports', titleKey: 'nav.purchasingReports', icon: 'BarChart3', requiredRoles: ['admin', 'purchaser', 'manager', 'storekeeper', 'finance'], status: 'active' },
    ]
  },
  {
    id: 'crm',
    titleKey: 'modules.crm',
    icon: 'TrendingUp',
    requiredRoles: ['admin', 'sales', 'manager', 'finance'],
    status: 'active',
    phase: 'Phase 3',
    description: 'Lead Management, Customer Directory, Scheduled Follow-ups, Quotations & Orders',
    submodules: [
      { id: 'crm-dashboard', path: '/crm/dashboard', titleKey: 'nav.crmDashboard', icon: 'LayoutDashboard', requiredRoles: ['admin', 'sales', 'manager'], status: 'active' },
      { id: 'crm-leads', path: '/crm/leads', titleKey: 'nav.crmLeads', icon: 'Target', requiredRoles: ['admin', 'sales', 'manager'], status: 'active' },
      { id: 'crm-customers', path: '/crm/customers', titleKey: 'nav.crmCustomers', icon: 'Building2', requiredRoles: ['admin', 'sales', 'manager'], status: 'active' },
      { id: 'crm-followups', path: '/crm/followups', titleKey: 'nav.crmFollowups', icon: 'CalendarClock', requiredRoles: ['admin', 'sales', 'manager'], status: 'active' },
      { id: 'crm-services', path: '/crm/services', titleKey: 'nav.crmServices', icon: 'FileText', requiredRoles: ['admin', 'sales', 'manager'], status: 'active' },
      { id: 'crm-orders', path: '/crm/orders', titleKey: 'nav.crmOrders', icon: 'Receipt', requiredRoles: ['admin', 'sales', 'manager'], status: 'active' },
      { id: 'crm-design', path: '/crm/design-proofing', titleKey: 'nav.crmDesign', icon: 'Palette', requiredRoles: ['admin', 'sales', 'manager'], status: 'active' },
      { id: 'crm-proformas', path: '/crm/proformas', titleKey: 'nav.crmProformas', icon: 'FileCheck', requiredRoles: ['admin', 'sales', 'manager'], status: 'active' },
      { id: 'crm-invoices', path: '/crm/invoices', titleKey: 'nav.crmInvoices', icon: 'DollarSign', requiredRoles: ['admin', 'sales', 'manager', 'finance'], status: 'active' },
      { id: 'crm-payments', path: '/crm/payments', titleKey: 'nav.crmPayments', icon: 'CreditCard', requiredRoles: ['admin', 'sales', 'manager', 'finance'], status: 'active' },
      { id: 'crm-reports', path: '/crm/reports', titleKey: 'nav.crmReports', icon: 'BarChart3', requiredRoles: ['admin', 'sales', 'manager', 'finance'], status: 'active' }
    ]
  },
  {
    id: 'production',
    titleKey: 'modules.production',
    icon: 'Factory',
    requiredRoles: ['admin', 'production_manager', 'operator', 'manager'],
    status: 'active',
    phase: 'Phase 4',
    description: 'Machine Management, Maintenance, Production Jobs & Wastage Tracking',
    submodules: [
      { id: 'production-dashboard', path: '/production/dashboard', titleKey: 'nav.productionDashboard', icon: 'LayoutDashboard', requiredRoles: ['admin', 'production_manager', 'operator', 'manager'], status: 'active' },
      { id: 'production-machines', path: '/production/machines', titleKey: 'nav.productionMachines', icon: 'Factory', requiredRoles: ['admin', 'production_manager', 'operator', 'manager'], status: 'active' },
      { id: 'production-checkups', path: '/production/checkups', titleKey: 'nav.productionCheckups', icon: 'ClipboardCheck', requiredRoles: ['admin', 'production_manager', 'operator', 'manager'], status: 'active' },
      { id: 'production-maintenance', path: '/production/maintenance', titleKey: 'nav.productionMaintenance', icon: 'Wrench', requiredRoles: ['admin', 'production_manager', 'operator', 'manager'], status: 'active' },
      { id: 'production-jobs', path: '/production/jobs', titleKey: 'nav.productionJobs', icon: 'Workflow', requiredRoles: ['admin', 'production_manager', 'operator', 'manager'], status: 'active' },
      { id: 'production-wastage', path: '/production/wastage', titleKey: 'nav.productionWastage', icon: 'Trash2', requiredRoles: ['admin', 'production_manager', 'operator', 'manager'], status: 'active' },
      { id: 'production-reports', path: '/production/reports', titleKey: 'nav.productionReports', icon: 'BarChart3', requiredRoles: ['admin', 'production_manager', 'operator', 'manager'], status: 'active' }
    ]
  },
  {
    id: 'finance',
    titleKey: 'modules.finance',
    icon: 'Landmark',
    requiredRoles: ['admin', 'finance', 'manager'],
    status: 'active',
    phase: 'Phase 5',
    description: 'Double-Entry General Ledger, Treasury, Accounts Payable, Payroll Disbursements, Operating Costs & Ethiopian Tax',
    submodules: [
      { id: 'finance-dashboard', path: '/finance/dashboard', titleKey: 'nav.financeDashboard', icon: 'LayoutDashboard', requiredRoles: ['admin', 'finance', 'manager'], status: 'active' },
      { id: 'finance-accounts', path: '/finance/accounts', titleKey: 'nav.financeAccounts', icon: 'BookOpen', requiredRoles: ['admin', 'finance'], status: 'active' },
      { id: 'finance-journals', path: '/finance/journal-entries', titleKey: 'nav.financeJournals', icon: 'FileCheck2', requiredRoles: ['admin', 'finance'], status: 'active' },
      { id: 'finance-treasury', path: '/finance/treasury', titleKey: 'nav.financeTreasury', icon: 'Building2', requiredRoles: ['admin', 'finance', 'manager'], status: 'active' },
      { id: 'finance-bills', path: '/finance/supplier-bills', titleKey: 'nav.financeBills', icon: 'ArrowDownRight', requiredRoles: ['admin', 'finance', 'manager'], status: 'active' },
      { id: 'finance-payroll', path: '/finance/payroll-batches', titleKey: 'nav.financePayroll', icon: 'DollarSign', requiredRoles: ['admin', 'finance'], status: 'active' },
      { id: 'finance-expenses', path: '/finance/expenses', titleKey: 'nav.financeExpenses', icon: 'Receipt', requiredRoles: ['admin', 'finance', 'manager'], status: 'active' },
      { id: 'finance-tax', path: '/finance/tax', titleKey: 'nav.financeTax', icon: 'ShieldCheck', requiredRoles: ['admin', 'finance'], status: 'active' },
      { id: 'finance-reports', path: '/finance/reports', titleKey: 'nav.financeReports', icon: 'BarChart3', requiredRoles: ['admin', 'finance', 'manager'], status: 'active' }
    ]
  },
  {
    id: 'reports',
    titleKey: 'modules.reports',
    icon: 'BarChart3',
    requiredRoles: ['admin', 'manager', 'finance', 'hr', 'purchaser', 'storekeeper', 'sales', 'production_manager'],
    status: 'active',
    phase: 'Phase 6',
    description: 'Centralized Cross-Module Intelligence, Department Analytics & Auditing',
    submodules: [
      { id: 'reports-center', path: '/reports', titleKey: 'nav.reportsCenter', icon: 'LayoutDashboard', requiredRoles: [], status: 'active' },
      { id: 'reports-hr', path: '/hr/reports', titleKey: 'nav.hrReports', icon: 'Users', requiredRoles: ['admin', 'hr', 'manager'], status: 'active' },
      { id: 'reports-store', path: '/store/reports', titleKey: 'nav.storeReports', icon: 'Package', requiredRoles: ['admin', 'storekeeper', 'manager', 'employee'], status: 'active' },
      { id: 'reports-purchasing', path: '/purchasing/reports', titleKey: 'nav.purchasingReports', icon: 'ShoppingCart', requiredRoles: ['admin', 'purchaser', 'manager', 'storekeeper', 'finance'], status: 'active' },
      { id: 'reports-crm', path: '/crm/reports', titleKey: 'nav.crmReports', icon: 'TrendingUp', requiredRoles: ['admin', 'sales', 'manager', 'finance'], status: 'active' },
      { id: 'reports-production', path: '/production/reports', titleKey: 'nav.productionReports', icon: 'Factory', requiredRoles: ['admin', 'production_manager', 'operator', 'manager'], status: 'active' },
      { id: 'reports-finance', path: '/finance/reports', titleKey: 'nav.financeReports', icon: 'Landmark', requiredRoles: ['admin', 'finance', 'manager'], status: 'active' }
    ]
  }
];
