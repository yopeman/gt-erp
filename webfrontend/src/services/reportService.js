import api from './api';

export const reportService = {
  getComprehensiveReport: (params) => api.get('/reports/comprehensive', { params })
};

export default reportService;

