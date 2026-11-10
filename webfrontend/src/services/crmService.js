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

  // Lookups
  getEmployees: (params) => api.get('/employees', { params })
};

export default crmService;

