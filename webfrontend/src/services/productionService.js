import api from './api';

export const productionService = {
  // Production Analytics & Dashboard (Phase 4D)
  getProductionDashboardMetrics: () => api.get('/production-jobs/metrics'),

  // Machine Management (Phase 4A)
  getMachines: (params) => api.get('/machines', { params }),
  getMachineById: (id) => api.get(`/machines/${id}`),
  createMachine: (data) => api.post('/machines', data),
  updateMachine: (id, data) => api.put(`/machines/${id}`, data),
  updateMachineStatus: (id, status) => api.patch(`/machines/${id}/status`, { status }),
  deleteMachine: (id) => api.delete(`/machines/${id}`),
  getMachineStats: () => api.get('/machines/stats'),

  // Machine Checkups (Phase 4A)
  getCheckups: (params) => api.get('/machine-checkups', { params }),
  getCheckupById: (id) => api.get(`/machine-checkups/${id}`),
  createCheckup: (data) => api.post('/machine-checkups', data),
  deleteCheckup: (id) => api.delete(`/machine-checkups/${id}`),

  // Machine Maintenance & Breakdown Tickets (Phase 4A)
  getMaintenances: (params) => api.get('/machine-maintenances', { params }),
  getMaintenanceById: (id) => api.get(`/machine-maintenances/${id}`),
  createMaintenance: (data) => api.post('/machine-maintenances', data),
  updateMaintenance: (id, data) => api.put(`/machine-maintenances/${id}`, data),
  startMaintenance: (id) => api.patch(`/machine-maintenances/${id}/start`),
  completeMaintenance: (id, data) => api.post(`/machine-maintenances/${id}/complete`, data),
  deleteMaintenance: (id) => api.delete(`/machine-maintenances/${id}`),

  // Production Jobs & Floor Stages (Phase 4B)
  getProductionJobs: (params) => api.get('/production-jobs', { params }),
  getProductionJobById: (id) => api.get(`/production-jobs/${id}`),
  createProductionJob: (data) => api.post('/production-jobs', data),
  updateProductionJob: (id, data) => api.put(`/production-jobs/${id}`, data),
  startStage: (id, stageId, data) => api.post(`/production-jobs/${id}/stages/${stageId}/start`, data),
  completeStage: (id, stageId, data) => api.post(`/production-jobs/${id}/stages/${stageId}/complete`, data),
  signoffQC: (id, stageId, data) => api.post(`/production-jobs/${id}/stages/${stageId}/qc`, data),
  deleteProductionJob: (id) => api.delete(`/production-jobs/${id}`),

  // Material Consumption & Spoilage Wastage (Phase 4C)
  getWastages: (params) => api.get('/production-wastages', { params }),
  getWastageById: (id) => api.get(`/production-wastages/${id}`),
  createWastage: (data) => api.post('/production-wastages', data),
  approveWastage: (id, data) => api.patch(`/production-wastages/${id}/approve`, data),
  deleteWastage: (id) => api.delete(`/production-wastages/${id}`),

  // Shared Reference Lookups
  getWarehouses: (params) => api.get('/warehouses', { params }),
  getEmployees: (params) => api.get('/employees', { params }),
  getInventoryItems: (params) => api.get('/inventory-items', { params }),
  getOrders: (params) => api.get('/orders', { params }),
  getCustomers: (params) => api.get('/customers', { params }),
  getServices: (params) => api.get('/services', { params })
};

export default productionService;
