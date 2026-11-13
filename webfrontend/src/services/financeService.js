import { api } from './api';

export const financeService = {
  // 1. Chart of Accounts (COA)
  getAccounts: (params) => api.get('/finance/accounts', { params }),
  getAccountById: (id) => api.get(`/finance/accounts/${id}`),
  createAccount: (data) => api.post('/finance/accounts', data),
  updateAccount: (id, data) => api.put(`/finance/accounts/${id}`, data),
  deleteAccount: (id) => api.delete(`/finance/accounts/${id}`),

  // 2. Journal Entries
  getJournalEntries: (params) => api.get('/finance/journal-entries', { params }),
  getJournalEntryById: (id) => api.get(`/finance/journal-entries/${id}`),
  createJournalEntry: (data) => api.post('/finance/journal-entries', data),
  updateJournalEntry: (id, data) => api.put(`/finance/journal-entries/${id}`, data),
  deleteJournalEntry: (id) => api.delete(`/finance/journal-entries/${id}`),

  // 3. Bank Accounts & Treasury
  getBankAccounts: (params) => api.get('/finance/bank-accounts', { params }),
  getBankAccountById: (id) => api.get(`/finance/bank-accounts/${id}`),
  createBankAccount: (data) => api.post('/finance/bank-accounts', data),
  updateBankAccount: (id, data) => api.put(`/finance/bank-accounts/${id}`, data),
  deleteBankAccount: (id) => api.delete(`/finance/bank-accounts/${id}`),

  // 4. Petty Cash Vouchers
  getPettyCashVouchers: (params) => api.get('/finance/petty-cash-vouchers', { params }),
  getPettyCashVoucherById: (id) => api.get(`/finance/petty-cash-vouchers/${id}`),
  createPettyCashVoucher: (data) => api.post('/finance/petty-cash-vouchers', data),
  updatePettyCashVoucher: (id, data) => api.put(`/finance/petty-cash-vouchers/${id}`, data),
  deletePettyCashVoucher: (id) => api.delete(`/finance/petty-cash-vouchers/${id}`),

  // 5. Bank Transfers
  getBankTransfers: (params) => api.get('/finance/bank-transfers', { params }),
  getBankTransferById: (id) => api.get(`/finance/bank-transfers/${id}`),
  createBankTransfer: (data) => api.post('/finance/bank-transfers', data),
  updateBankTransfer: (id, data) => api.put(`/finance/bank-transfers/${id}`, data),
  deleteBankTransfer: (id) => api.delete(`/finance/bank-transfers/${id}`),

  // 6. Bank Reconciliations
  getBankReconciliations: (params) => api.get('/finance/bank-reconciliations', { params }),
  getBankReconciliationById: (id) => api.get(`/finance/bank-reconciliations/${id}`),
  createBankReconciliation: (data) => api.post('/finance/bank-reconciliations', data),
  updateBankReconciliation: (id, data) => api.put(`/finance/bank-reconciliations/${id}`, data),
  deleteBankReconciliation: (id) => api.delete(`/finance/bank-reconciliations/${id}`),

  // 7. Supplier Bills (AP)
  getSupplierBills: (params) => api.get('/finance/supplier-bills', { params }),
  getSupplierBillById: (id) => api.get(`/finance/supplier-bills/${id}`),
  createSupplierBill: (data) => api.post('/finance/supplier-bills', data),
  updateSupplierBill: (id, data) => api.put(`/finance/supplier-bills/${id}`, data),
  deleteSupplierBill: (id) => api.delete(`/finance/supplier-bills/${id}`),

  // 8. Supplier Payments
  getSupplierPayments: (params) => api.get('/finance/supplier-payments', { params }),
  getSupplierPaymentById: (id) => api.get(`/finance/supplier-payments/${id}`),
  createSupplierPayment: (data) => api.post('/finance/supplier-payments', data),
  updateSupplierPayment: (id, data) => api.put(`/finance/supplier-payments/${id}`, data),
  deleteSupplierPayment: (id) => api.delete(`/finance/supplier-payments/${id}`),

  // 9. Credit / Debit Notes (AR / AP adjustments)
  getCreditDebitNotes: (params) => api.get('/finance/credit-debit-notes', { params }),
  getCreditDebitNoteById: (id) => api.get(`/finance/credit-debit-notes/${id}`),
  createCreditDebitNote: (data) => api.post('/finance/credit-debit-notes', data),
  updateCreditDebitNote: (id, data) => api.put(`/finance/credit-debit-notes/${id}`, data),
  applyCreditDebitNote: (id) => api.post(`/finance/credit-debit-notes/${id}/apply`),
  deleteCreditDebitNote: (id) => api.delete(`/finance/credit-debit-notes/${id}`),

  // 10. Payroll Payment Batches
  getPayrollBatches: (params) => api.get('/finance/payroll-batches', { params }),
  getPayrollBatchById: (id) => api.get(`/finance/payroll-batches/${id}`),
  createPayrollBatch: (data) => api.post('/finance/payroll-batches', data),
  updatePayrollBatch: (id, data) => api.put(`/finance/payroll-batches/${id}`, data),
  disbursePayrollBatch: (id, data) => api.post(`/finance/payroll-batches/${id}/disburse`, data),
  deletePayrollBatch: (id) => api.delete(`/finance/payroll-batches/${id}`),

  // 11. Employee Advances
  getEmployeeAdvances: (params) => api.get('/finance/employee-advances', { params }),
  getEmployeeAdvanceById: (id) => api.get(`/finance/employee-advances/${id}`),
  createEmployeeAdvance: (data) => api.post('/finance/employee-advances', data),
  updateEmployeeAdvance: (id, data) => api.put(`/finance/employee-advances/${id}`, data),
  approveEmployeeAdvance: (id, data) => api.post(`/finance/employee-advances/${id}/approve`, data),
  disburseEmployeeAdvance: (id, data) => api.post(`/finance/employee-advances/${id}/disburse`, data),
  recordAdvanceRepayment: (id, data) => api.post(`/finance/employee-advances/${id}/repayment`, data),
  deleteEmployeeAdvance: (id) => api.delete(`/finance/employee-advances/${id}`),

  // 12. Operating Expense Vouchers
  getExpenseVouchers: (params) => api.get('/finance/expense-vouchers', { params }),
  getExpenseVoucherById: (id) => api.get(`/finance/expense-vouchers/${id}`),
  createExpenseVoucher: (data) => api.post('/finance/expense-vouchers', data),
  updateExpenseVoucher: (id, data) => api.put(`/finance/expense-vouchers/${id}`, data),
  approveAndPayExpenseVoucher: (id, data) => api.post(`/finance/expense-vouchers/${id}/approve-pay`, data),
  deleteExpenseVoucher: (id) => api.delete(`/finance/expense-vouchers/${id}`),

  // 13. Ethiopian Tax Filings (MOR)
  getTaxRecords: (params) => api.get('/finance/tax-records', { params }),
  getTaxRecordById: (id) => api.get(`/finance/tax-records/${id}`),
  createTaxRecord: (data) => api.post('/finance/tax-records', data),
  updateTaxRecord: (id, data) => api.put(`/finance/tax-records/${id}`, data),
  computeTaxRecord: (id) => api.post(`/finance/tax-records/${id}/compute`),
  deleteTaxRecord: (id) => api.delete(`/finance/tax-records/${id}`)
};

export default financeService;

