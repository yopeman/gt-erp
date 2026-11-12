

## 1. General Ledger & Chart of Accounts (COA)

### 1.1 Account (`accounts`)
Master Chart of Accounts (COA) specifying hierarchical financial classification according to standard accounting principles.

- `_id`: ObjectId
- `accountCode`: String (unique, uppercase, indexed, e.g. `1010`, `2010`, `4010`, `5010`)
- `accountName`: String (required, e.g. `Commercial Bank of Ethiopia - Main`, `Accounts Receivable`, `Output VAT 15%`)
- `accountType`: String (enum: `asset`, `liability`, `equity`, `revenue`, `cogs`, `expense`, required, indexed)
- `subType`: String (enum: `cash_and_bank`, `accounts_receivable`, `inventory_asset`, `prepaid_expense`, `fixed_asset`, `accounts_payable`, `accrued_liability`, `tax_payable`, `owner_equity`, `retained_earnings`, `sales_revenue`, `direct_material_cogs`, `direct_labor_cogs`, `machine_overhead_cogs`, `operating_expense`, `administrative_expense`, `financial_expense`, required)
- `currency`: String (default: `ETB`, uppercase)
- `parentAccount`: ObjectId (ref: `Account`, optional, for parent-child grouping)
- `isGroupAccount`: Boolean (default: false, if true it cannot hold direct transaction postings)
- `currentBalance`: Number (default: 0, running balance)
- `normalBalance`: String (enum: `debit`, `credit`, required)
- `isActive`: Boolean (default: true, indexed)
- `description`: String (optional)
- `createdBy`: ObjectId (ref: `User`)
- `createdAt`, `updatedAt`: Timestamps

---

### 1.2 JournalEntry (`journal_entries`)
The core double-entry accounting ledger. Every transaction across Sales, Purchasing, Payroll, Store, and Treasury automatically generates a posted and immutable journal entry.

- `_id`: ObjectId
- `entryNumber`: String (unique, uppercase, indexed, e.g. `JE-2026-00001`)
- `entryDate`: Date (default: `Date.now`, indexed)
- `sourceModule`: String (enum: `sales`, `purchasing`, `payroll`, `treasury`, `inventory`, `expense`, `production`, `tax`, `manual_adjustment`, required, indexed)
- `referenceType`: String (enum: `CustomerInvoice`, `CustomerPayment`, `SupplierBill`, `SupplierPayment`, `PayrollBatch`, `ExpenseVoucher`, `PettyCashVoucher`, `StockMovement`, `ProductionCostRollup`, `TaxSettlement`, `ManualVoucher`)
- `referenceId`: ObjectId (polymorphic ref to triggering document)
- `narration`: String (required, explanation of entry)
- `lines`: [
    - `_id`: ObjectId
    - `account`: ObjectId (ref: `Account`, required)
    - `debit`: Number (min: 0, default: 0)
    - `credit`: Number (min: 0, default: 0)
    - `partyType`: String (enum: `Customer`, `Supplier`, `Employee`, `None`, default: `None`)
    - `partyId`: ObjectId (ref to `Customer`, `Supplier`, or `Employee`)
    - `memo`: String (line-item description)
  ]
- `totalDebit`: Number (required, must strictly equal `totalCredit`)
- `totalCredit`: Number (required, must strictly equal `totalDebit`)
- `status`: String (enum: `draft`, `posted`, `voided`, default: `posted`, indexed)
- `isReconciled`: Boolean (default: false)
- `reconciledDate`: Date
- `postedBy`: ObjectId (ref: `User`, required)
- `voidedBy`: ObjectId (ref: `User`)
- `voidReason`: String
- `voidedAt`: Date
- `createdAt`, `updatedAt`: Timestamps

---

## 2. Treasury, Cash & Bank Management

### 2.1 BankAccount (`bank_accounts`)
Defines business bank accounts, vault accounts, and digital mobile payment wallets (Telebirr, CBE Birr).

- `_id`: ObjectId
- `accountName`: String (required, e.g. `CBE Main Operations`, `Awash Working Capital`, `Telebirr Merchant`)
- `accountNumber`: String (trim, sparse, unique if present)
- `bankName`: String (enum: `Commercial Bank of Ethiopia`, `Awash Bank`, `Dashen Bank`, `Bank of Abyssinia`, `Nib International Bank`, `Cooperative Bank of Oromia`, `Telebirr`, `CBE Birr`, `Cash in Vault`, `Petty Cash Vault`, `Other`, required)
- `branch`: String (optional)
- `glAccount`: ObjectId (ref: `Account`, required, links to GL Asset Account)
- `currency`: String (default: `ETB`, uppercase)
- `openingBalance`: Number (default: 0)
- `currentBalance`: Number (default: 0, auto-updated by payments & disbursements)
- `minimumBalanceAlert`: Number (default: 1000)
- `isPettyCashVault`: Boolean (default: false)
- `signatories`: [
    - `employee`: ObjectId (ref: `Employee`)
    - `role`: String (e.g. `Primary Signatory`, `Secondary Approver`)
  ]
- `status`: String (enum: `active`, `frozen`, `closed`, default: `active`, indexed)
- `notes`: String
- `createdAt`, `updatedAt`: Timestamps

---

### 2.2 PettyCashVoucher (`petty_cash_vouchers`)
Controls the petty cash imprest fund for daily factory floor consumables, transport fares, loading/unloading fees, and emergency cash supplies.

- `_id`: ObjectId
- `voucherNumber`: String (unique, uppercase, indexed, e.g. `PCV-2026-00001`)
- `voucherType`: String (enum: `disbursement`, `replenishment`, required)
- `bankAccount`: ObjectId (ref: `BankAccount`, petty cash source account, required)
- `expenseAccount`: ObjectId (ref: `Account`, GL account to debit, required for disbursements)
- `amount`: Number (required, min: 0.01)
- `expenseCategory`: String (enum: `transport_fare`, `stationery`, `factory_refreshment`, `minor_repairs`, `loading_unloading`, `emergency_supplies`, `other`, required)
- `paidTo`: String (required, recipient name)
- `custodian`: ObjectId (ref: `Employee`, required, responsible petty cash keeper)
- `approvedBy`: ObjectId (ref: `Employee`, department manager / finance approver)
- `receiptAttachmentUrl`: String (uploaded scanned cash receipt)
- `paymentDate`: Date (default: `Date.now`, indexed)
- `status`: String (enum: `draft`, `submitted`, `approved`, `paid`, `reconciled`, `rejected`, default: `paid`, indexed)
- `journalEntry`: ObjectId (ref: `JournalEntry`)
- `notes`: String
- `createdAt`, `updatedAt`: Timestamps

---

### 2.3 BankTransfer (`bank_transfers`)
Manages internal fund movements between bank accounts and petty cash vault replenishments.

- `_id`: ObjectId
- `transferNumber`: String (unique, uppercase, indexed, e.g. `TRF-2026-00001`)
- `fromAccount`: ObjectId (ref: `BankAccount`, required, source account)
- `toAccount`: ObjectId (ref: `BankAccount`, required, destination account)
- `amount`: Number (required, min: 0.01)
- `transferFee`: Number (default: 0, min: 0)
- `transferDate`: Date (default: `Date.now`, indexed)
- `referenceNumber`: String (bank transaction/transfer reference)
- `transferProofUrl`: String (attachment)
- `status`: String (enum: `initiated`, `completed`, `cancelled`, default: `completed`, indexed)
- `journalEntry`: ObjectId (ref: `JournalEntry`)
- `initiatedBy`: ObjectId (ref: `User`, required)
- `approvedBy`: ObjectId (ref: `User`)
- `notes`: String
- `createdAt`, `updatedAt`: Timestamps

---

### 2.4 BankReconciliation (`bank_reconciliations`)
Reconciles bank statements against ERP general ledger records, identifying outstanding checks, deposits in transit, and bank fees.

- `_id`: ObjectId
- `statementReference`: String (unique, indexed, e.g. `RECON-CBE-2026-10`)
- `bankAccount`: ObjectId (ref: `BankAccount`, required)
- `statementStartDate`: Date (required)
- `statementEndDate`: Date (required)
- `statementEndingBalance`: Number (required)
- `glEndingBalance`: Number (required)
- `clearedTransactions`: [
    - `journalEntry`: ObjectId (ref: `JournalEntry`)
    - `referenceNumber`: String
    - `amount`: Number
    - `clearedDate`: Date
  ]
- `unreconciledDifference`: Number (default: 0)
- `status`: String (enum: `in_progress`, `reconciled`, `discrepancy_flagged`, default: `in_progress`)
- `reconciledBy`: ObjectId (ref: `Employee`)
- `approvedBy`: ObjectId (ref: `Employee`)
- `statementAttachmentUrl`: String
- `notes`: String
- `createdAt`, `updatedAt`: Timestamps

---

## 3. Accounts Payable (AP) & Purchasing Credit

### 3.1 SupplierBill (`supplier_bills`)
Official supplier billing document matching Purchase Orders (`PurchaseOrder`) and Goods Receipts (`GoodsReceipt`). Tracks supplier credit liability.

- `_id`: ObjectId
- `billNumber`: String (unique, uppercase, indexed, e.g. `BILL-2026-0001`)
- `supplierInvoiceNumber`: String (required, external invoice/bill number printed by the vendor)
- `supplier`: ObjectId (ref: `Supplier`, required, indexed)
- `purchaseOrder`: ObjectId (ref: `PurchaseOrder`, required, indexed)
- `goodsReceipts`: [ObjectId] (refs: `GoodsReceipt`, warehouse GRV receipts)
- `billDate`: Date (default: `Date.now`)
- `dueDate`: Date (required, calculated from supplier credit days, indexed)
- `items`: [
    - `item`: ObjectId (ref: `InventoryItem`, raw material / spare parts)
    - `description`: String
    - `quantity`: Number (required, min: 1)
    - `unitPrice`: Number (required, min: 0)
    - `subtotal`: Number (required)
  ]
- `financials`:
    - `subtotal`: Number (required, min: 0)
    - `vatRate`: Number (default: 15)
    - `vatAmount`: Number (default: 0, Input VAT claimable from tax authority)
    - `withholdingTaxRate`: Number (default: 2, 2% WHT on qualifying procurement over 10,000 ETB)
    - `withholdingTaxAmount`: Number (default: 0, withheld from supplier payout)
    - `grandTotal`: Number (required, formula: `subtotal + vatAmount - withholdingTaxAmount`)
    - `paidAmount`: Number (default: 0, min: 0)
    - `remainingBalance`: Number (required, min: 0, indexed)
    - `currency`: String (default: `ETB`)
- `paymentStatus`: String (enum: `unpaid`, `partially_paid`, `paid`, default: `unpaid`, indexed)
- `status`: String (enum: `draft`, `verified`, `approved`, `disputed`, `cancelled`, default: `verified`, indexed)
- `journalEntry`: ObjectId (ref: `JournalEntry`)
- `attachments`: [
    - `name`: String
    - `url`: String
  ]
- `verifiedBy`: ObjectId (ref: `Employee`)
- `approvedBy`: ObjectId (ref: `Employee`)
- `notes`: String
- `createdAt`, `updatedAt`: Timestamps

---

### 3.2 SupplierPayment (`supplier_payments`)
Records cash or bank disbursements to suppliers for single or multiple bills, settling accounts payable and updating credit lines.

- `_id`: ObjectId
- `paymentNumber`: String (unique, uppercase, indexed, e.g. `SPAY-2026-0001`)
- `supplier`: ObjectId (ref: `Supplier`, required, indexed)
- `supplierBill`: ObjectId (ref: `SupplierBill`, required, indexed)
- `purchaseOrder`: ObjectId (ref: `PurchaseOrder`, optional)
- `bankAccount`: ObjectId (ref: `BankAccount`, required, funding account)
- `paymentMethod`: String (enum: `bank_transfer`, `cheque`, `cpo`, `cash`, `telebirr`, `credit_offset`, required)
- `paymentDate`: Date (default: `Date.now`, indexed)
- `amount`: Number (required, min: 0.01)
- `referenceNumber`: String (required for bank/telebirr, e.g. bank transaction reference or check number)
- `withholdingReceiptNumber`: String (WHT certificate provided to the supplier)
- `checkDetails`:
    - `checkNumber`: String
    - `bankName`: String
    - `maturityDate`: Date
    - `isCleared`: Boolean (default: true)
- `paidBy`: ObjectId (ref: `Employee`, required)
- `approvedBy`: ObjectId (ref: `Employee`)
- `status`: String (enum: `pending`, `cleared`, `bounced`, `voided`, default: `cleared`, indexed)
- `receiptAttachmentUrl`: String
- `journalEntry`: ObjectId (ref: `JournalEntry`)
- `notes`: String
- `createdAt`, `updatedAt`: Timestamps

---

## 4. Accounts Receivable (AR) & Customer Credit

### 4.1 CreditDebitNote (`credit_debit_notes`)
Handles billing adjustments, customer credit notes for damaged goods or print discrepancies, and debit notes for supplier stock returns.

- `_id`: ObjectId
- `noteNumber`: String (unique, uppercase, indexed, e.g. `CDN-2026-0001`)
- `noteType`: String (enum: `credit_note`, `debit_note`, required, indexed)
- `partyType`: String (enum: `Customer`, `Supplier`, required, indexed)
- `customer`: ObjectId (ref: `Customer`, required if partyType is `Customer`)
- `supplier`: ObjectId (ref: `Supplier`, required if partyType is `Supplier`)
- `relatedInvoice`: ObjectId (ref: `Invoice`, optional, for customer adjustments)
- `relatedBill`: ObjectId (ref: `SupplierBill`, optional, for supplier adjustments)
- `relatedSupplierReturn`: ObjectId (ref: `SupplierReturn`, optional)
- `amount`: Number (required, min: 0.01)
- `vatAdjustment`: Number (default: 0)
- `totalAdjustment`: Number (required)
- `reason`: String (enum: `print_defect`, `goods_returned`, `pricing_error`, `discount_allowance`, `order_cancellation`, `other`, required)
- `detailedExplanation`: String (required)
- `status`: String (enum: `draft`, `approved`, `applied`, `voided`, default: `approved`, indexed)
- `journalEntry`: ObjectId (ref: `JournalEntry`)
- `approvedBy`: ObjectId (ref: `Employee`, required)
- `appliedAt`: Date
- `createdAt`, `updatedAt`: Timestamps

---

### 4.2 Customer Credit Monitoring Strategy
Customer credit exposure is maintained dynamically on `Customer.creditTerms` and evaluated during Sales Order and Invoice generation:
- `creditLimit`: Maximum allowable outstanding balance in ETB.
- `creditTermDays`: Default credit period (e.g. 15, 30, 45, 60 days).
- `currentBalance`: Running cumulative receivables balance.
- `availableCredit`: Evaluated in real time:
  $$\text{Available Credit} = \text{Credit Limit} - \text{Current Balance}$$
- `agingSummary`: Segmented receivables distribution:
  - `current`: 0 to 30 days.
  - `days31To60`: 31 to 60 days.
  - `days61To90`: 61 to 90 days.
  - `over90Days`: Over 90 days (triggers automated credit hold on new sales orders).

---

## 5. Payroll Disbursements & Employee Financials

### 5.1 PayrollPaymentBatch (`payroll_payment_batches`)
Bridges the HR `Payroll` calculations with the Finance treasury. Executes mass salary payouts and books statutory tax/pension obligations.

- `_id`: ObjectId
- `batchNumber`: String (unique, uppercase, indexed, e.g. `PAY-BATCH-2026-10`)
- `month`: Number (required, 1 to 12)
- `year`: Number (required, e.g. 2026)
- `periodStartDate`: Date (required)
- `periodEndDate`: Date (required)
- `disbursementDate`: Date (default: `Date.now`, indexed)
- `bankAccount`: ObjectId (ref: `BankAccount`, required, funding bank account)
- `payrollsIncluded`: [ObjectId] (refs: `Payroll`, HR payroll line items)
- `employeeCount`: Number (required)
- `financialSummary`:
    - `totalBaseSalary`: Number (required)
    - `totalOvertimePay`: Number (default: 0)
    - `totalAllowances`: Number (default: 0)
    - `totalGrossPay`: Number (required)
    - `totalTaxableIncome`: Number (required)
    - `totalEmploymentIncomeTax`: Number (required, statutory tax payable to Ethiopian MOR)
    - `totalEmployeePension`: Number (required, 7% employee pension contribution)
    - `totalEmployerPension`: Number (required, 11% employer pension expense)
    - `totalAdvanceDeductions`: Number (default: 0, employee loan repayments)
    - `totalOtherDeductions`: Number (default: 0)
    - `totalNetSalaryDisbursement`: Number (required, actual money leaving bank account)
- `disbursementMethod`: String (enum: `bank_bulk_transfer`, `cheque`, `telebirr_corporate`, `cash_payout`, default: `bank_bulk_transfer`)
- `bankTransactionReference`: String
- `bankExportGenerated`: Boolean (default: false)
- `journalEntry`: ObjectId (ref: `JournalEntry`)
- `status`: String (enum: `draft`, `approved`, `disbursed`, `reconciled`, `cancelled`, default: `draft`, indexed)
- `preparedBy`: ObjectId (ref: `Employee`, required)
- `approvedBy`: ObjectId (ref: `Employee`)
- `disbursedBy`: ObjectId (ref: `Employee`)
- `notes`: String
- `createdAt`, `updatedAt`: Timestamps

---

### 5.2 EmployeeAdvance (`employee_advances`)
Tracks salary loans, personal advances, and travel expense floats given to employees, with automated deduction schedules during monthly payroll runs.

- `_id`: ObjectId
- `advanceNumber`: String (unique, uppercase, indexed, e.g. `ADV-2026-0001`)
- `employee`: ObjectId (ref: `Employee`, required, indexed)
- `requestDate`: Date (default: `Date.now`)
- `requestedAmount`: Number (required, min: 100)
- `approvedAmount`: Number (required, min: 0)
- `disbursementDate`: Date
- `bankAccount`: ObjectId (ref: `BankAccount`, funding account)
- `repaymentType`: String (enum: `single_payroll`, `installments`, default: `single_payroll`)
- `numberOfInstallments`: Number (default: 1)
- `monthlyDeductionAmount`: Number (required)
- `totalRepaidAmount`: Number (default: 0)
- `remainingBalance`: Number (required, indexed)
- `repaymentHistory`: [
    - `payroll`: ObjectId (ref: `Payroll`)
    - `date`: Date
    - `amount`: Number
    - `deductedInBatch`: String
  ]
- `reason`: String (required)
- `status`: String (enum: `requested`, `approved`, `disbursed`, `repaying`, `fully_repaid`, `written_off`, `rejected`, default: `requested`, indexed)
- `journalEntry`: ObjectId (ref: `JournalEntry`)
- `approvedBy`: ObjectId (ref: `Employee`)
- `createdAt`, `updatedAt`: Timestamps

---

## 6. Operating Expenses & Maintenance Costing

### 6.1 ExpenseVoucher (`expense_vouchers`)
Tracks daily business operating expenses, factory plant overheads, and machine breakdown maintenance repair bills.

- `_id`: ObjectId
- `voucherNumber`: String (unique, uppercase, indexed, e.g. `EXP-2026-0001`)
- `expenseAccount`: ObjectId (ref: `Account`, required, GL expense head, indexed)
- `costCenter`: String (enum: `production_floor`, `sales_and_marketing`, `administration`, `plant_maintenance`, `logistics`, `executive`, required, indexed)
- `machine`: ObjectId (ref: `Machine`, optional, for machine-specific repair costs)
- `machineMaintenanceTicket`: ObjectId (ref: `MachineMaintenance`, optional, ties to shop floor ticket)
- `vendorName`: String (required)
- `vendorTin`: String (optional)
- `description`: String (required)
- `amount`: Number (required, min: 0.01)
- `vatRate`: Number (default: 0)
- `vatAmount`: Number (default: 0)
- `withholdingTaxRate`: Number (default: 0)
- `withholdingTaxAmount`: Number (default: 0)
- `netPaidAmount`: Number (required, formula: `amount + vatAmount - withholdingTaxAmount`)
- `bankAccount`: ObjectId (ref: `BankAccount`, required, payment account)
- `paymentMethod`: String (enum: `bank_transfer`, `cheque`, `cash`, `telebirr`, `petty_cash`, default: `bank_transfer`)
- `referenceNumber`: String (bank/check/telebirr reference)
- `receiptAttachmentUrl`: String (scanned cash receipt / invoice)
- `expenseDate`: Date (default: `Date.now`, indexed)
- `status`: String (enum: `draft`, `submitted`, `approved`, `paid`, `rejected`, default: `draft`, indexed)
- `journalEntry`: ObjectId (ref: `JournalEntry`)
- `recordedBy`: ObjectId (ref: `Employee`, required)
- `approvedBy`: ObjectId (ref: `Employee`)
- `notes`: String
- `createdAt`, `updatedAt`: Timestamps

---

## 7. Ethiopian Tax Compliance & Statutory Filings

### 7.1 TaxPeriodRecord (`tax_period_records`)
Automates monthly tax declarations according to Ethiopian Ministry of Revenues (MOR) regulations.

- `_id`: ObjectId
- `filingCode`: String (unique, uppercase, indexed, e.g. `TAX-2026-10-VAT`)
- `taxPeriod`:
    - `month`: Number (required, 1 to 12)
    - `year`: Number (required, e.g. 2026)
    - `filingDeadline`: Date (typically the 30th day of the following Ethiopian fiscal month)
- `filingType`: String (enum: `vat_monthly_return`, `withholding_tax_return`, `payroll_tax_pension_return`, required, indexed)
- `vatCalculations`:
    - `totalTaxableSales`: Number (default: 0)
    - `outputVatCollected`: Number (default: 0, 15% collected on customer invoices)
    - `totalTaxablePurchases`: Number (default: 0)
    - `inputVatPaid`: Number (default: 0, 15% paid on verified supplier bills)
    - `netVatPayable`: Number (default: 0, positive = payable to MOR, negative = credit carryforward)
    - `carriedForwardCreditUsed`: Number (default: 0)
    - `finalPayableToMor`: Number (default: 0)
- `withholdingCalculations`:
    - `whtDeductedFromSuppliers`: Number (default: 0, 2% payable to MOR)
    - `whtDeductedByCustomers`: Number (default: 0, 2% claimed against corporate income tax)
    - `totalWhtPayable`: Number (default: 0)
- `payrollTaxCalculations`:
    - `totalEmploymentIncomeTax`: Number (default: 0)
    - `totalEmployeePension7`: Number (default: 0)
    - `totalEmployerPension11`: Number (default: 0)
    - `totalPensionPayable18`: Number (default: 0)
- `status`: String (enum: `accumulating`, `computed`, `approved`, `filed_with_mor`, `settled`, default: `accumulating`, indexed)
- `morDeclarationReceiptNumber`: String (official e-filing reference)
- `paymentVoucherRef`: ObjectId (ref: `ExpenseVoucher`, receipt proving payment to MOR)
- `filingDate`: Date
- `filedBy`: ObjectId (ref: `Employee`)
- `notes`: String
- `createdAt`, `updatedAt`: Timestamps

---
