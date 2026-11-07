import api from './api';

export const purchasingService = {
  // Dashboard & Analytics
  getPurchasingDashboard: () => api.get('/purchase-orders/dashboard'),
  getCreditDashboard: () => api.get('/credit-purchases/dashboard'),
  getAgingReport: () => api.get('/credit-purchases/aging-report'),

  // Purchase Requests
  getPurchaseRequests: (params) => api.get('/purchase-requests', { params }),
  getPurchaseRequestById: (id) => api.get(`/purchase-requests/${id}`),
  createPurchaseRequest: (data) => api.post('/purchase-requests', data),
  approvePurchaseRequest: (id, data) => api.post(`/purchase-requests/${id}/approve`, data),
  convertToPurchaseOrder: (id, data) => api.post(`/purchase-requests/${id}/convert-to-po`, data),

  // Purchase Orders
  getPurchaseOrders: (params) => api.get('/purchase-orders', { params }),
  getPurchaseOrderById: (id) => api.get(`/purchase-orders/${id}`),
  createPurchaseOrder: (data) => api.post('/purchase-orders', data),
  updatePurchaseOrder: (id, data) => api.put(`/purchase-orders/${id}`, data),
  approvePurchaseOrder: (id, data) => api.post(`/purchase-orders/${id}/approve`, data),
  sendPurchaseOrderToSupplier: (id, data) => api.post(`/purchase-orders/${id}/send`, data),

  // Suppliers
  getSuppliers: (params) => api.get('/suppliers', { params }),
  getSupplierById: (id) => api.get(`/suppliers/${id}`),
  createSupplier: (data) => api.post('/suppliers', data),
  updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data),
  deleteSupplier: (id) => api.delete(`/suppliers/${id}`),
  addSupplierDocument: (id, data) => api.post(`/suppliers/${id}/documents`, data),
  getSupplierCreditSummary: (id) => api.get(`/suppliers/${id}/credit-summary`),
  getSupplierLedger: (supplierId, params) => api.get(`/credit-purchases/suppliers/${supplierId}/ledger`, { params }),

  // Goods Receipts (GRV)
  getGoodsReceipts: (params) => api.get('/goods-receipts', { params }),
  getGoodsReceiptById: (id) => api.get(`/goods-receipts/${id}`),
  createGoodsReceipt: (data) => api.post('/goods-receipts', data),
  acceptGoodsReceipt: (id, data) => api.post(`/goods-receipts/${id}/accept`, data),

  // Credit Purchases & Accounts Payable
  getCreditPurchases: (params) => api.get('/credit-purchases', { params }),
  settleCreditPurchase: (data) => api.post('/credit-purchases/settle', data),
  extendCreditDueDate: (id, data) => api.patch(`/credit-purchases/${id}/extend-due-date`, data),

  // Purchase Payments
  getPurchasePayments: (params) => api.get('/purchase-payments', { params }),
  getPurchasePaymentById: (id) => api.get(`/purchase-payments/${id}`),
  createPurchasePayment: (data) => api.post('/purchase-payments', data),
  approvePurchasePayment: (id, data) => api.post(`/purchase-payments/${id}/approve`, data),

  // Supplier Returns
  getSupplierReturns: (params) => api.get('/supplier-returns', { params }),
  getSupplierReturnById: (id) => api.get(`/supplier-returns/${id}`),
  createSupplierReturn: (data) => api.post('/supplier-returns', data),
  approveSupplierReturn: (id, data) => api.post(`/supplier-returns/${id}/approve`, data),

  // Supporting lookups
  getItems: (params) => api.get('/inventory-items', { params }),
  getWarehouses: (params) => api.get('/warehouses', { params }),
  getEmployees: (params) => api.get('/employees', { params }),
};

export default purchasingService;

