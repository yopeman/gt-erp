import api from './api';

export const storeService = {
  // Inventory Items
  getItems: (params) => api.get('/inventory-items', { params }),
  getItemById: (id) => api.get(`/inventory-items/${id}`),
  createItem: (data) => api.post('/inventory-items', data),
  updateItem: (id, data) => api.put(`/inventory-items/${id}`, data),
  deleteItem: (id) => api.delete(`/inventory-items/${id}`),

  // Warehouses
  getWarehouses: (params) => api.get('/warehouses', { params }),
  getWarehouseById: (id) => api.get(`/warehouses/${id}`),
  createWarehouse: (data) => api.post('/warehouses', data),
  updateWarehouse: (id, data) => api.put(`/warehouses/${id}`, data),
  deleteWarehouse: (id) => api.delete(`/warehouses/${id}`),

  // Inventory Categories
  getCategories: (params) => api.get('/inventory-categories', { params }),
  getCategoryById: (id) => api.get(`/inventory-categories/${id}`),
  createCategory: (data) => api.post('/inventory-categories', data),
  updateCategory: (id, data) => api.put(`/inventory-categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/inventory-categories/${id}`),

  // Stock Balances
  getStockBalances: (params) => api.get('/stock-balances', { params }),
  getStockBalanceById: (id) => api.get(`/stock-balances/${id}`),
  getStockByWarehouse: (warehouseId) => api.get(`/stock-balances/warehouse/${warehouseId}`),
  getStockByItem: (itemId) => api.get(`/stock-balances/item/${itemId}`),

  // Stock Inward (Goods Receipts / GRV)
  getGoodsReceipts: (params) => api.get('/goods-receipts', { params }),
  getGoodsReceiptById: (id) => api.get(`/goods-receipts/${id}`),
  createGoodsReceipt: (data) => api.post('/goods-receipts', data),
  acceptGoodsReceipt: (id, data) => api.post(`/goods-receipts/${id}/accept`, data),

  // Stock Outward (Stock Requests / Material Releases / SIV)
  getStockRequests: (params) => api.get('/stock-requests', { params }),
  getStockRequestById: (id) => api.get(`/stock-requests/${id}`),
  createStockRequest: (data) => api.post('/stock-requests', data),
  approveStockRequest: (id, data) => api.post(`/stock-requests/${id}/approve`, data),
  issueStockRequest: (id, data) => api.post(`/stock-requests/${id}/issue`, data),

  // Stock Transfers
  getStockTransfers: (params) => api.get('/stock-transfers', { params }),
  getStockTransferById: (id) => api.get(`/stock-transfers/${id}`),
  createStockTransfer: (data) => api.post('/stock-transfers', data),
  approveStockTransfer: (id, data) => api.post(`/stock-transfers/${id}/approve`, data),
  dispatchStockTransfer: (id, data) => api.post(`/stock-transfers/${id}/dispatch`, data),
  receiveStockTransfer: (id, data) => api.post(`/stock-transfers/${id}/receive`, data),

  // Stock Adjustments
  getStockAdjustments: (params) => api.get('/stock-adjustments', { params }),
  getStockAdjustmentById: (id) => api.get(`/stock-adjustments/${id}`),
  createStockAdjustment: (data) => api.post('/stock-adjustments', data),
  approveStockAdjustment: (id, data) => api.post(`/stock-adjustments/${id}/approve`, data),

  // Stock Movements Ledger
  getStockMovements: (params) => api.get('/stock-movements', { params }),
  createStockMovement: (data) => api.post('/stock-movements', data),

  // Related data for select dropdowns
  getPurchaseOrders: (params) => api.get('/purchase-orders', { params }),
  getSuppliers: (params) => api.get('/suppliers', { params }),
  getEmployees: (params) => api.get('/employees', { params }),
};

export default storeService;

