import api from './api';

export const reportService = {
  getComprehensiveReport: (params) => api.get('/reports/comprehensive', { params }),
  getHrReport: (params) => api.get('/reports/hr', { params }),
  getCrmReport: (params) => api.get('/reports/crm', { params }),
  getProductionReport: (params) => api.get('/reports/production', { params }),
  getFinanceReport: (params) => api.get('/reports/finance', { params })
};

export default reportService;
