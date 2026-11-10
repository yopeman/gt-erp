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
      { id: 'dashboard', path: '/hr/dashboard', titleKey: 'nav.hrDashboard', icon: 'LayoutDashboard', requiredRoles: ['admin', 'hr', 'manager', 'employee'], status: 'active' },
      { id: 'employees', path: '/hr/employees', titleKey: 'nav.employees', icon: 'UserCheck', requiredRoles: ['admin', 'hr', 'manager', 'storekeeper'], status: 'active' },
      { id: 'attendance', path: '/hr/attendance', titleKey: 'nav.attendance', icon: 'Clock', requiredRoles: ['admin', 'hr', 'manager', 'employee'], status: 'active' },
      { id: 'overtimes', path: '/hr/overtimes', titleKey: 'nav.overtime', icon: 'Timer', requiredRoles: ['admin', 'hr', 'manager', 'employee'], status: 'active' },
      { id: 'leave-management', path: '/hr/leave', titleKey: 'nav.leave', icon: 'CalendarDays', requiredRoles: ['admin', 'hr', 'manager', 'employee'], status: 'active' },
      { id: 'payrolls', path: '/hr/payrolls', titleKey: 'nav.payroll', icon: 'CreditCard', requiredRoles: ['admin', 'hr', 'finance', 'employee'], status: 'active' },
      { id: 'recruitment', path: '/hr/recruitment', titleKey: 'nav.recruitment', icon: 'Briefcase', requiredRoles: ['admin', 'hr'], status: 'active' },
      { id: 'careers', path: '/careers', titleKey: 'nav.careers', icon: 'Globe', requiredRoles: [], status: 'active' },
      { id: 'internships', path: '/hr/internships', titleKey: 'nav.internships', icon: 'GraduationCap', requiredRoles: ['admin', 'hr', 'manager'], status: 'active' },
      { id: 'clearances', path: '/hr/clearances', titleKey: 'nav.clearances', icon: 'FileCheck2', requiredRoles: ['admin', 'hr', 'manager', 'storekeeper', 'employee'], status: 'active' },
      { id: 'settings', path: '/hr/settings', titleKey: 'nav.companySettings', icon: 'Building2', requiredRoles: ['admin', 'hr'], status: 'active' },
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
      { id: 'store-inventory', path: '/store/inventory', titleKey: 'nav.storeInventory', icon: 'Boxes', requiredRoles: ['admin', 'storekeeper', 'manager'], status: 'active' },
      { id: 'store-inward', path: '/store/inward', titleKey: 'nav.storeInward', icon: 'ArrowDownToLine', requiredRoles: ['admin', 'storekeeper', 'manager'], status: 'active' },
      { id: 'store-outward', path: '/store/outward', titleKey: 'nav.storeOutward', icon: 'ArrowUpFromLine', requiredRoles: ['admin', 'storekeeper', 'manager', 'employee'], status: 'active' },
      { id: 'store-returns', path: '/store/returns', titleKey: 'nav.storeReturns', icon: 'RotateCcw', requiredRoles: ['admin', 'storekeeper', 'manager', 'employee'], status: 'active' },
      { id: 'store-transfers', path: '/store/transfers', titleKey: 'nav.storeTransfers', icon: 'Repeat', requiredRoles: ['admin', 'storekeeper', 'manager'], status: 'active' },
      { id: 'store-adjustments', path: '/store/adjustments', titleKey: 'nav.storeAdjustments', icon: 'SlidersHorizontal', requiredRoles: ['admin', 'storekeeper', 'manager'], status: 'active' },
      { id: 'store-movements', path: '/store/movements', titleKey: 'nav.storeMovements', icon: 'History', requiredRoles: ['admin', 'storekeeper', 'manager'], status: 'active' },
      { id: 'store-warehouses', path: '/store/warehouses', titleKey: 'nav.storeWarehouses', icon: 'Warehouse', requiredRoles: ['admin', 'storekeeper', 'manager'], status: 'active' },
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
    ]
  },
  {
    id: 'production',
    titleKey: 'modules.production',
    icon: 'Factory',
    requiredRoles: ['admin', 'production_manager', 'operator'],
    status: 'upcoming',
    phase: 'Phase 4',
    description: 'Machine Management, Maintenance, Raw Material Requests, Wastage Tracking',
    submodules: [
      { id: 'production-dashboard', path: '/production/dashboard', titleKey: 'nav.dashboard', icon: 'LayoutDashboard', status: 'upcoming' },
      { id: 'production-machines', path: '/production/machines', titleKey: 'Machines & Maintenance', icon: 'Cog', status: 'upcoming' },
      { id: 'production-jobs', path: '/production/jobs', titleKey: 'Production Jobs & Wastage', icon: 'Workflow', status: 'upcoming' }
    ]
  },
  {
    id: 'crm',
    titleKey: 'modules.crm',
    icon: 'TrendingUp',
    requiredRoles: ['admin', 'sales', 'manager'],
    status: 'upcoming',
    phase: 'Phase 3',
    description: 'Lead Management, Customer Quotations, Printing Order Workflow, Invoices',
    submodules: [
      { id: 'crm-dashboard', path: '/crm/dashboard', titleKey: 'nav.dashboard', icon: 'LayoutDashboard', status: 'upcoming' },
      { id: 'crm-customers', path: '/crm/customers', titleKey: 'Customers & Leads', icon: 'UserPlus', status: 'upcoming' },
      { id: 'crm-orders', path: '/crm/orders', titleKey: 'Printing Orders & Proforma', icon: 'Receipt', status: 'upcoming' }
    ]
  },
  {
    id: 'finance',
    titleKey: 'modules.finance',
    icon: 'Landmark',
    requiredRoles: ['admin', 'finance'],
    status: 'upcoming',
    phase: 'Phase 5',
    description: 'Income, Expenses, Tax, Order Costing & Profitability, Financial Statements',
    submodules: [
      { id: 'finance-dashboard', path: '/finance/dashboard', titleKey: 'nav.dashboard', icon: 'LayoutDashboard', status: 'upcoming' },
      { id: 'finance-expenses', path: '/finance/expenses', titleKey: 'Income & Expenses', icon: 'Wallet', status: 'upcoming' },
      { id: 'finance-profitability', path: '/finance/profitability', titleKey: 'Cost & Profitability', icon: 'PieChart', status: 'upcoming' }
    ]
  }
];
