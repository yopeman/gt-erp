// backend/routes/financeRoutes.js
import express from 'express';

// GL & Chart of Accounts
import * as accountCtrl from '../controllers/accountController.js';
import * as journalCtrl from '../controllers/journalEntryController.js';

// Treasury, Cash & Bank
import * as bankAcctCtrl from '../controllers/bankAccountController.js';
import * as pcvCtrl from '../controllers/pettyCashVoucherController.js';
import * as transferCtrl from '../controllers/bankTransferController.js';
import * as reconCtrl from '../controllers/bankReconciliationController.js';

// Accounts Payable
import * as billCtrl from '../controllers/supplierBillController.js';
import * as spayCtrl from '../controllers/supplierPaymentController.js';

// Accounts Receivable
import * as cdnCtrl from '../controllers/creditDebitNoteController.js';

// Payroll Disbursements
import * as batchCtrl from '../controllers/payrollPaymentBatchController.js';
import * as advCtrl from '../controllers/employeeAdvanceController.js';

// Operating Expenses
import * as expCtrl from '../controllers/expenseVoucherController.js';

// Tax Compliance
import * as taxCtrl from '../controllers/taxPeriodRecordController.js';

const router = express.Router();

// ─── 1. Chart of Accounts ───────────────────────────────────────────────────
router.get('/accounts', accountCtrl.listAccounts);
router.post('/accounts', accountCtrl.createAccount);
router.get('/accounts/:id', accountCtrl.getAccount);
router.put('/accounts/:id', accountCtrl.updateAccount);
router.delete('/accounts/:id', accountCtrl.deleteAccount);

// ─── 2. Journal Entries ─────────────────────────────────────────────────────
router.get('/journal-entries', journalCtrl.listJournalEntries);
router.post('/journal-entries', journalCtrl.createJournalEntry);
router.get('/journal-entries/:id', journalCtrl.getJournalEntry);
router.put('/journal-entries/:id', journalCtrl.updateJournalEntry);
router.delete('/journal-entries/:id', journalCtrl.deleteJournalEntry);

// ─── 3. Bank Accounts ──────────────────────────────────────────────────────
router.get('/bank-accounts', bankAcctCtrl.listBankAccounts);
router.post('/bank-accounts', bankAcctCtrl.createBankAccount);
router.get('/bank-accounts/:id', bankAcctCtrl.getBankAccount);
router.put('/bank-accounts/:id', bankAcctCtrl.updateBankAccount);
router.delete('/bank-accounts/:id', bankAcctCtrl.deleteBankAccount);

// ─── 4. Petty Cash Vouchers ────────────────────────────────────────────────
router.get('/petty-cash-vouchers', pcvCtrl.listVouchers);
router.post('/petty-cash-vouchers', pcvCtrl.createVoucher);
router.get('/petty-cash-vouchers/:id', pcvCtrl.getVoucher);
router.put('/petty-cash-vouchers/:id', pcvCtrl.updateVoucher);
router.delete('/petty-cash-vouchers/:id', pcvCtrl.deleteVoucher);

// ─── 5. Bank Transfers ─────────────────────────────────────────────────────
router.get('/bank-transfers', transferCtrl.listTransfers);
router.post('/bank-transfers', transferCtrl.createTransfer);
router.get('/bank-transfers/:id', transferCtrl.getTransfer);
router.put('/bank-transfers/:id', transferCtrl.updateTransfer);
router.delete('/bank-transfers/:id', transferCtrl.deleteTransfer);

// ─── 6. Bank Reconciliations ────────────────────────────────────────────────
router.get('/bank-reconciliations', reconCtrl.listReconciliations);
router.post('/bank-reconciliations', reconCtrl.createReconciliation);
router.get('/bank-reconciliations/:id', reconCtrl.getReconciliation);
router.put('/bank-reconciliations/:id', reconCtrl.updateReconciliation);
router.delete('/bank-reconciliations/:id', reconCtrl.deleteReconciliation);

// ─── 7. Supplier Bills ─────────────────────────────────────────────────────
router.get('/supplier-bills', billCtrl.listBills);
router.post('/supplier-bills', billCtrl.createBill);
router.get('/supplier-bills/:id', billCtrl.getBill);
router.put('/supplier-bills/:id', billCtrl.updateBill);
router.delete('/supplier-bills/:id', billCtrl.deleteBill);

// ─── 8. Supplier Payments ──────────────────────────────────────────────────
router.get('/supplier-payments', spayCtrl.listPayments);
router.post('/supplier-payments', spayCtrl.createPayment);
router.get('/supplier-payments/:id', spayCtrl.getPayment);
router.put('/supplier-payments/:id', spayCtrl.updatePayment);
router.delete('/supplier-payments/:id', spayCtrl.deletePayment);

// ─── 9. Credit / Debit Notes ───────────────────────────────────────────────
router.get('/credit-debit-notes', cdnCtrl.listNotes);
router.post('/credit-debit-notes', cdnCtrl.createNote);
router.get('/credit-debit-notes/:id', cdnCtrl.getNote);
router.put('/credit-debit-notes/:id', cdnCtrl.updateNote);
router.post('/credit-debit-notes/:id/apply', cdnCtrl.applyNote);
router.delete('/credit-debit-notes/:id', cdnCtrl.deleteNote);

// ─── 10. Payroll Payment Batches ────────────────────────────────────────────
router.get('/payroll-batches', batchCtrl.listBatches);
router.post('/payroll-batches', batchCtrl.createBatch);
router.get('/payroll-batches/:id', batchCtrl.getBatch);
router.put('/payroll-batches/:id', batchCtrl.updateBatch);
router.post('/payroll-batches/:id/disburse', batchCtrl.disburseBatch);
router.delete('/payroll-batches/:id', batchCtrl.deleteBatch);

// ─── 11. Employee Advances ─────────────────────────────────────────────────
router.get('/employee-advances', advCtrl.listAdvances);
router.post('/employee-advances', advCtrl.createAdvance);
router.get('/employee-advances/:id', advCtrl.getAdvance);
router.put('/employee-advances/:id', advCtrl.updateAdvance);
router.post('/employee-advances/:id/approve', advCtrl.approveAdvance);
router.post('/employee-advances/:id/disburse', advCtrl.disburseAdvance);
router.post('/employee-advances/:id/repayment', advCtrl.recordRepayment);
router.delete('/employee-advances/:id', advCtrl.deleteAdvance);

// ─── 12. Expense Vouchers ──────────────────────────────────────────────────
router.get('/expense-vouchers', expCtrl.listVouchers);
router.post('/expense-vouchers', expCtrl.createVoucher);
router.get('/expense-vouchers/:id', expCtrl.getVoucher);
router.put('/expense-vouchers/:id', expCtrl.updateVoucher);
router.post('/expense-vouchers/:id/approve-pay', expCtrl.approveAndPay);
router.delete('/expense-vouchers/:id', expCtrl.deleteVoucher);

// ─── 13. Tax Period Records ────────────────────────────────────────────────
router.get('/tax-records', taxCtrl.listRecords);
router.post('/tax-records', taxCtrl.createRecord);
router.get('/tax-records/:id', taxCtrl.getRecord);
router.put('/tax-records/:id', taxCtrl.updateRecord);
router.post('/tax-records/:id/compute', taxCtrl.computeTaxes);
router.delete('/tax-records/:id', taxCtrl.deleteRecord);

export default router;

