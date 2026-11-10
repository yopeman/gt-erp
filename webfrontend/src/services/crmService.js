import api from './api';

export const crmService = {
  // Dashboard & Metrics
  getLeadStatistics: () => api.get('/leads/statistics'),
  getCustomerMetrics: () => api.get('/customers/metrics'),
  getFollowupMetrics: () => api.get('/followups/metrics'),

  // Leads
  getLeads: (params) => api.get('/leads', { params }),
  getLeadById: (id) => api.get(`/leads/${id}`),
  createLead: (data) => api.post('/leads', data),
  updateLead: (id, data) => api.put(`/leads/${id}`, data),
  deleteLead: (id) => api.delete(`/leads/${id}`),
  addDiscussion: (id, data) => api.post(`/leads/${id}/discussions`, data),
  convertLeadToCustomer: (id, data) => api.post(`/leads/${id}/convert`, data),

  // Customers
  getCustomers: (params) => api.get('/customers', { params }),
  getCustomerById: (id) => api.get(`/customers/${id}`),
  createCustomer: (data) => api.post('/customers', data),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/customers/${id}`),
  updateCreditTerms: (id, data) => api.patch(`/customers/${id}/credit-terms`, data),

  // Follow-ups
  getFollowups: (params) => api.get('/followups', { params }),
  getFollowupById: (id) => api.get(`/followups/${id}`),
  createFollowup: (data) => api.post('/followups', data),
  updateFollowup: (id, data) => api.put(`/followups/${id}`, data),
  completeFollowup: (id, data) => api.post(`/followups/${id}/complete`, data),
  deleteFollowup: (id) => api.delete(`/followups/${id}`),

  // Printing Services Catalog (Phase 3B)
  getServices: (params) => api.get('/services', { params }),
  getServiceById: (id) => api.get(`/services/${id}`),
  createService: (data) => api.post('/services', data),
  updateService: (id, data) => api.put(`/services/${id}`, data),
  deleteService: (id) => api.delete(`/services/${id}`),

  // Sales Orders (Phase 3B)
  getOrders: (params) => api.get('/orders', { params }),
  getOrderById: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateOrder: (id, data) => api.put(`/orders/${id}`, data),
  updateOrderStatus: (id, data) => api.patch(`/orders/${id}/status`, data),
  deleteOrder: (id) => api.delete(`/orders/${id}`),
  getOrderStatistics: () => api.get('/orders/statistics'),

  // Pre-press Design Proofing (Phase 3B)
  getDesigns: (params) => api.get('/designs', { params }),
  getDesignByOrder: (orderId) => api.get(`/designs/order/${orderId}`),
  createDesign: (data) => api.post('/designs', data),
  addDesignVersion: (id, data) => api.post(`/designs/${id}/versions`, data),
  reviewDesignVersion: (id, versionId, data) => api.patch(`/designs/${id}/versions/${versionId}/review`, data),

  // Proforma Invoices / Quotations (Phase 3C)
  getProformas: (params) => api.get('/proformas', { params }),
  getProformaById: (id) => api.get(`/proformas/${id}`),
  createProforma: (data) => api.post('/proformas', data),
  createProformaFromOrder: (orderId, data) => api.post(`/proformas/from-order/${orderId}`, data),
  updateProformaStatus: (id, data) => api.patch(`/proformas/${id}/status`, data),
  deleteProforma: (id) => api.delete(`/proformas/${id}`),

  // Tax Invoices (Phase 3C)
  getInvoices: (params) => api.get('/invoices', { params }),
  getInvoiceById: (id) => api.get(`/invoices/${id}`),
  createInvoice: (data) => api.post('/invoices', data),
  createInvoiceFromOrder: (orderId, data) => api.post(`/invoices/from-order/${orderId}`, data),
  getInvoiceMetrics: () => api.get('/invoices/metrics'),

  // Customer Payments & Collections (Phase 3C)
  getCustomerPayments: (params) => api.get('/customer-payments', { params }),
  getCustomerPaymentById: (id) => api.get(`/customer-payments/${id}`),
  recordCustomerPayment: (data) => api.post('/customer-payments', data),

  // Lookups
  getEmployees: (params) => api.get('/employees', { params })
};

export default crmService;

