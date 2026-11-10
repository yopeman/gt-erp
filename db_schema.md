# Database Schema (MongoDB / Mongoose) for GT ERP
## Phase 3: CRM, Order & Sales Management
## Phase 4: Machine & Production Operations

---

## 1. CRM, Order & Sales Management Module

### 1.1 Leads (`leads`)
Tracks potential client inquiries, leads, and quotes before conversion into formal customers or orders.

- `_id`: ObjectId
- `leadNumber`: String (unique, uppercase, indexed, e.g. `LED-2026-0001`)
- `name`: String (required, contact person name)
- `companyName`: String (optional)
- `phone`: String (required)
- `email`: String (optional, lowercase)
- `source`: String (enum: `walk_in`, `social_media`, `referral`, `website`, `tender`, `exhibition`, `phone_inquiry`, `other`)
- `category`: String (enum: `individual`, `corporate`, `sme`, `government`, `ngo`)
- `status`: String (enum: `new`, `contacted`, `qualified`, `proposal_sent`, `converted`, `lost`, default: `new`)
- `priority`: String (enum: `low`, `medium`, `high`, `urgent`, default: `medium`)
- `estimatedValue`: Number (min: 0, default: 0)
- `currency`: String (default: `ETB`)
- `assignedTo`: ObjectId (ref: `Employee`, assigned sales representative)
- `requirements`: String (notes or description of what the lead needs)
- `discussions`: [
    - `date`: Date (default: `Date.now`)
    - `agenda`: String
    - `summary`: String
    - `nextFollowupDate`: Date
    - `recordedBy`: ObjectId (ref: `Employee`)
  ]
- `lostReason`: String (mandatory if status is `lost`)
- `convertedCustomerId`: ObjectId (ref: `Customer`, set upon conversion)
- `convertedOrderId`: ObjectId (ref: `Order`, optional)
- `convertedAt`: Date
- `createdBy`: ObjectId (ref: `User`)
- `createdAt`, `updatedAt`: Timestamps

---

### 1.2 Customers (`customers`)
Master record for individuals, businesses, and government clients. Tracks credit limit, TIN/VAT, and balances.

- `_id`: ObjectId
- `customerNumber`: String (unique, uppercase, indexed, e.g. `CUST-2026-0001`)
- `name`: String (required, primary customer/client name)
- `companyName`: String (optional)
- `category`: String (enum: `individual`, `company`, `government`, `corporation`, `ngo`)
- `tinNumber`: String (tax identification number, indexed)
- `vatNumber`: String (tax registration number)
- `contactPersons`: [
    - `name`: String (required)
    - `position`: String
    - `phone`: String (required)
    - `email`: String
    - `isPrimary`: Boolean (default: false)
  ]
- `billingAddress`:
    - `street`: String
    - `subCity`: String
    - `city`: String (default: `Addis Ababa`)
    - `country`: String (default: `Ethiopia`)
- `shippingAddress`:
    - `street`: String
    - `subCity`: String
    - `city`: String
    - `deliveryNotes`: String
- `source`: String (enum: `lead_conversion`, `direct_walk_in`, `referral`, `tender`, `other`)
- `creditTerms`:
    - `allowedCredit`: Boolean (default: false)
    - `creditLimit`: Number (default: 0, min: 0)
    - `creditTermDays`: Number (default: 0, e.g. 15, 30, 60 days)
    - `currentBalance`: Number (default: 0, running balance of unpaid receivables)
- `assignedSalesRepresentative`: ObjectId (ref: `Employee`)
- `customAttributes`: [
    - `name`: String
    - `type`: String (enum: `text`, `file`, `number`, `date`)
    - `value`: String
  ]
- `status`: String (enum: `active`, `inactive`, `suspended`, `blacklisted`, default: `active`)
- `notes`: String
- `createdBy`: ObjectId (ref: `User`)
- `createdAt`, `updatedAt`: Timestamps

---

### 1.3 Followups (`followups`)
Scheduled client interactions and pipeline communications for both Leads and existing Customers.

- `_id`: ObjectId
- `followupNumber`: String (unique, uppercase, e.g. `FLW-2026-0001`)
- `lead`: ObjectId (ref: `Lead`, optional)
- `customer`: ObjectId (ref: `Customer`, optional)
- `type`: String (enum: `phone_call`, `in_person_meeting`, `email`, `site_visit`, `quotation_followup`, `payment_reminder`)
- `agenda`: String (required)
- `scheduledTime`: Date (required, indexed)
- `priority`: String (enum: `low`, `medium`, `high`, `urgent`, default: `medium`)
- `status`: String (enum: `scheduled`, `completed`, `cancelled`, `rescheduled`, default: `scheduled`)
- `result`: String (notes entered after completing follow-up)
- `nextActionDate`: Date
- `assignedTo`: ObjectId (ref: `Employee`, required)
- `createdBy`: ObjectId (ref: `User`)
- `createdAt`, `updatedAt`: Timestamps

---

### 1.4 Services (`services`)
Printing service catalog and production workflow/routing template (e.g. Brochure, Softcover Book, Large Format Banner, Packaging Box).

- `_id`: ObjectId
- `serviceCode`: String (unique, uppercase, e.g. `SRV-BOOK-001`)
- `name`: String (required, e.g. `Softcover Book Printing`)
- `category`: String (enum: `offset_printing`, `digital_printing`, `large_format`, `packaging`, `finishing_service`, `other`)
- `description`: String
- `pricingModel`:
    - `unitOfMeasurement`: String (enum: `piece`, `copy`, `sqm`, `sheet`, `pack`, `box`, `roll`)
    - `basePrice`: Number (min: 0, default: 0)
    - `minimumOrderQuantity`: Number (default: 1)
    - `volumeTiers`: [
        - `minQuantity`: Number
        - `maxQuantity`: Number
        - `unitPrice`: Number
      ]
- `standardSpecifications`: [
    - `name`: String (e.g. `Paper GSM`, `Dimensions`, `Colors`, `Binding`)
    - `inputType`: String (enum: `select`, `number`, `text`, `boolean`)
    - `options`: [String] (e.g. `['80 GSM', '150 GSM Art Paper', '300 GSM Art Card']`)
    - `isRequired`: Boolean (default: false)
  ]
- `workflowTemplate`: [
    - `sequence`: Number (required, 1, 2, 3...)
    - `stageName`: String (required, e.g. `Pre-press / CTP`, `Offset Press`, `Lamination`, `Die-Cutting`, `Binding`, `Quality Control`)
    - `description`: String
    - `estimatedDurationMinutes`: Number (default: 0)
    - `defaultMachineCategory`: String (enum: `offset_press`, `digital_press`, `large_format_plotter`, `guillotine_cutter`, `lamination_machine`, `die_cutter`, `folding_machine`, `binding_machine`, `packaging_gluer`, `manual_finishing`)
    - `preferredMachine`: ObjectId (ref: `Machine`, optional)
  ]
- `status`: String (enum: `active`, `inactive`, default: `active`)
- `createdAt`, `updatedAt`: Timestamps

---

### 1.5 Orders (`orders`)
The central Sales Order document capturing customer specifications, estimated vs. actual costs, line items, and delivery lifecycle.

- `_id`: ObjectId
- `orderNumber`: String (unique, uppercase, indexed, e.g. `SO-2026-0001`)
- `customer`: ObjectId (ref: `Customer`, required, indexed)
- `salesRepresentative`: ObjectId (ref: `Employee`, required)
- `quotationRef`: ObjectId (ref: `Proforma`, optional)
- `priority`: String (enum: `low`, `medium`, `high`, `urgent`, default: `medium`)
- `orderDate`: Date (default: `Date.now`)
- `deliveryDeadline`: Date (required)
- `actualDeliveryDate`: Date
- `items`: [
    - `service`: ObjectId (ref: `Service`, required)
    - `productTitle`: String (required, e.g. `Annual Report 2025/2026`)
    - `quantity`: Number (required, min: 1)
    - `unitOfMeasurement`: String (default: `copy`)
    - `specifications`:
        - `dimensions`: { `width`: Number, `height`: Number, `unit`: String } // mm, cm, inch
        - `pages`: Number
        - `paperType`: String // e.g. "Cover: 300 GSM Art Card, Inner: 120 GSM Matte"
        - `colorFormat`: String // e.g. "Cover 4/0 CMYK, Inner 1/1 Black"
        - `finishingOptions`: [String] // ['gloss_lamination', 'embossing', 'spot_uv', 'matte_varnish']
        - `bindingType`: String // 'saddle_stitch', 'perfect_bound', 'hardcover', 'wire_o'
        - `customSpecs`: [{ `name`: String, `value`: String }]
    - `unitPrice`: Number (required, min: 0)
    - `subtotal`: Number (required, min: 0)
    - `estimatedCost`:
        - `materialCost`: Number (default: 0)
        - `machineCost`: Number (default: 0)
        - `laborCost`: Number (default: 0)
        - `finishingCost`: Number (default: 0)
        - `overheadCost`: Number (default: 0)
        - `totalEstimatedCost`: Number (default: 0)
  ]
- `financials`:
    - `subtotal`: Number (required, min: 0)
    - `discountAmount`: Number (default: 0, min: 0)
    - `vatRate`: Number (default: 15) // Ethiopian VAT 15%
    - `vatAmount`: Number (default: 0, min: 0)
    - `grandTotal`: Number (required, min: 0)
    - `currency`: String (default: `ETB`, uppercase: true)
- `actualCostSummary`: (calculated upon production completion)
    - `actualMaterialCost`: Number (default: 0)
    - `actualMachineCost`: Number (default: 0)
    - `actualLaborCost`: Number (default: 0)
    - `actualWastageCost`: Number (default: 0)
    - `actualFinishingCost`: Number (default: 0)
    - `totalActualCost`: Number (default: 0)
    - `grossProfit`: Number (default: 0)
    - `profitMarginPercentage`: Number (default: 0)
- `status`: String (enum: `draft`, `proforma_issued`, `confirmed`, `design_in_progress`, `design_approved`, `in_production`, `finishing`, `qc_completed`, `ready_for_delivery`, `delivered`, `completed`, `cancelled`, default: `draft`)
- `paymentStatus`: String (enum: `unpaid`, `partially_paid`, `paid`, default: `unpaid`)
- `productionJob`: ObjectId (ref: `ProductionJob`)
- `design`: ObjectId (ref: `Design`)
- `invoice`: ObjectId (ref: `Invoice`)
- `notes`: String
- `createdBy`: ObjectId (ref: `User`)
- `createdAt`, `updatedAt`: Timestamps

---

### 1.6 Design (`designs`)
Pre-press artwork, proofing files, customer approval, and revision history.

- `_id`: ObjectId
- `designNumber`: String (unique, uppercase, e.g. `DSG-2026-0001`)
- `order`: ObjectId (ref: `Order`, required, indexed)
- `assignedDesigner`: ObjectId (ref: `Employee`, required)
- `specifications`:
    - `bleedMm`: Number (default: 3)
    - `colorProfile`: String (enum: `CMYK`, `Pantone`, `RGB`, default: `CMYK`)
    - `resolutionDpi`: Number (default: 300)
    - `orientation`: String (enum: `portrait`, `landscape`, `square`)
- `versions`: [
    - `versionNumber`: Number (required, 1, 2, 3...)
    - `fileUrl`: String (required, PDF/AI/PSD artwork link)
    - `thumbnailUrl`: String
    - `clientFeedback`: String
    - `status`: String (enum: `pending_review`, `client_approved`, `client_rejected`, default: `pending_review`)
    - `approvedByCustomer`: Boolean (default: false)
    - `approvedAt`: Date
    - `uploadedAt`: Date (default: `Date.now`)
  ]
- `status`: String (enum: `in_design`, `proof_submitted`, `revision_requested`, `approved_for_press`, default: `in_design`)
- `remarks`: String
- `createdAt`, `updatedAt`: Timestamps

---

### 1.7 Proformas (`proformas`)
Official quotations/proforma invoices issued prior to production confirmation.

- `_id`: ObjectId
- `proformaNumber`: String (unique, uppercase, indexed, e.g. `PRF-2026-0001`)
- `order`: ObjectId (ref: `Order`, optional)
- `customer`: ObjectId (ref: `Customer`, required, indexed)
- `issueDate`: Date (default: `Date.now`)
- `validUntil`: Date (required, e.g. 15-30 days validity)
- `items`: [
    - `itemDescription`: String (required)
    - `quantity`: Number (required, min: 1)
    - `unitPrice`: Number (required, min: 0)
    - `discount`: Number (default: 0)
    - `taxRate`: Number (default: 15)
    - `taxAmount`: Number (default: 0)
    - `subtotal`: Number (required)
  ]
- `subtotal`: Number (required, min: 0)
- `vatRate`: Number (default: 15)
- `vatAmount`: Number (default: 0)
- `grandTotal`: Number (required, min: 0)
- `currency`: String (default: `ETB`)
- `termsAndConditions`: String
- `status`: String (enum: `draft`, `sent_to_customer`, `accepted`, `rejected`, `expired`, default: `draft`)
- `pdfUrl`: String
- `preparedBy`: ObjectId (ref: `Employee`)
- `createdAt`, `updatedAt`: Timestamps

---

### 1.8 Invoices (`invoices`)
Official fiscal/commercial tax invoices meeting accounting standards.

- `_id`: ObjectId
- `invoiceNumber`: String (unique, uppercase, indexed, e.g. `INV-2026-0001`)
- `order`: ObjectId (ref: `Order`, required, indexed)
- `customer`: ObjectId (ref: `Customer`, required, indexed)
- `issueDate`: Date (default: `Date.now`)
- `dueDate`: Date (required)
- `customerTin`: String
- `customerVat`: String
- `items`: [
    - `itemDescription`: String (required)
    - `quantity`: Number (required, min: 1)
    - `unitPrice`: Number (required, min: 0)
    - `discount`: Number (default: 0)
    - `taxRate`: Number (default: 15)
    - `taxAmount`: Number (default: 0)
    - `subtotal`: Number (required)
  ]
- `subtotal`: Number (required, min: 0)
- `vatAmount`: Number (required, min: 0)
- `withholdingTaxAmount`: Number (default: 0, 2% or 30% withholding if applicable)
- `grandTotal`: Number (required, min: 0)
- `paidAmount`: Number (default: 0, min: 0)
- `remainingBalance`: Number (required, grandTotal - paidAmount)
- `paymentStatus`: String (enum: `unpaid`, `partially_paid`, `paid`, default: `unpaid`)
- `status`: String (enum: `draft`, `issued`, `cancelled`, default: `draft`)
- `pdfUrl`: String
- `preparedBy`: ObjectId (ref: `Employee`)
- `createdAt`, `updatedAt`: Timestamps

---

### 1.9 CustomerPayments (`customerpayments`)
Unified payment receipt collection for customer payments. Synchronizes with `Invoice.paidAmount` and `Customer.creditTerms.currentBalance`.

- `_id`: ObjectId
- `receiptNumber`: String (unique, uppercase, indexed, e.g. `RCPT-2026-0001`)
- `customer`: ObjectId (ref: `Customer`, required, indexed)
- `invoice`: ObjectId (ref: `Invoice`, required, indexed)
- `order`: ObjectId (ref: `Order`, optional)
- `paymentDate`: Date (default: `Date.now`, indexed)
- `amount`: Number (required, min: 0)
- `paymentMethod`: String (enum: `cash`, `bank_transfer`, `check`, `telebirr`, `cbe_birr`, `credit_offset`, required: true)
- `referenceNumber`: String (check number or bank transfer transaction ID)
- `bankDetails`:
    - `bankName`: String
    - `accountNumber`: String
- `receiptAttachmentUrl`: String (scanned deposit slip or check image)
- `status`: String (enum: `pending_verification`, `verified`, `bounced`, `cancelled`, default: `verified`)
- `receivedBy`: ObjectId (ref: `Employee`, required)
- `notes`: String
- `createdAt`, `updatedAt`: Timestamps

---

## 2. Machine & Production Operations Module

### 2.1 Machines (`machines`)
Master registry for all printing, cutting, finishing, and packaging equipment with operational rates.

- `_id`: ObjectId
- `machineCode`: String (unique, uppercase, indexed, e.g. `MCH-OFFSET-01`)
- `name`: String (required, e.g. `Heidelberg Speedmaster SM 74 4-Color`)
- `category`: String (enum: `offset_press`, `digital_press`, `large_format_plotter`, `guillotine_cutter`, `lamination_machine`, `die_cutter`, `folding_machine`, `binding_machine`, `packaging_gluer`, `other`, required: true)
- `manufacturer`: String
- `model`: String
- `serialNumber`: String (unique, sparse: true)
- `yearOfManufacture`: Number
- `hourlyCostRate`: Number (required, min: 0, operational cost per hour for job pricing)
- `warehouse`: ObjectId (ref: `Warehouse`, physical location)
- `assignedOperators`: [ObjectId] (refs to `Employee`)
- `status`: String (enum: `available`, `running`, `maintenance`, `breakdown`, `decommissioned`, default: `available`)
- `specifications`:
    - `maxSheetWidthMm`: Number
    - `maxSheetLengthMm`: Number
    - `maxSpeedPerHour`: Number (impressions per hour)
    - `powerRatingKw`: Number
- `checklists`:
    - `daily`: [String]
    - `weekly`: [String]
    - `monthly`: [String]
- `totalOperatingHours`: Number (default: 0)
- `lastMaintenanceDate`: Date
- `nextScheduledMaintenance`: Date
- `createdAt`, `updatedAt`: Timestamps

---

### 2.2 MachineCheckups (`machinecheckups`)
Daily, weekly, and monthly operator preventive inspection checklists.

- `_id`: ObjectId
- `checkupNumber`: String (unique, uppercase, e.g. `CHK-2026-0001`)
- `machine`: ObjectId (ref: `Machine`, required, indexed)
- `type`: String (enum: `daily`, `weekly`, `monthly`, required: true)
- `inspectionDate`: Date (default: `Date.now`, indexed)
- `inspectedBy`: ObjectId (ref: `Employee`, required)
- `checklistItems`: [
    - `task`: String (required, e.g. `Check oil levels`, `Clean blanket cylinders`, `Check safety guards`)
    - `status`: String (enum: `pass`, `fail`, `needs_attention`, required: true)
    - `notes`: String
  ]
- `overallStatus`: String (enum: `passed`, `failed`, required: true)
- `triggeredMaintenanceTicket`: ObjectId (ref: `MachineMaintenance`, optional if failed)
- `remarks`: String
- `createdAt`, `updatedAt`: Timestamps

---

### 2.3 MachineMaintenance (`machinemaintenances`)
Breakdown tickets, repairs, preventive overhauls, spare parts consumption, and downtime tracking.

- `_id`: ObjectId
- `maintenanceNumber`: String (unique, uppercase, indexed, e.g. `MNT-2026-0001`)
- `machine`: ObjectId (ref: `Machine`, required, indexed)
- `maintenanceType`: String (enum: `breakdown_repair`, `preventive`, `calibration`, `emergency_repair`, required: true)
- `priority`: String (enum: `low`, `medium`, `high`, `critical`, default: `medium`)
- `reportedBy`: ObjectId (ref: `Employee`, required)
- `assignedTechnician`: ObjectId (ref: `Employee`, internal technician)
- `externalServiceProvider`: String (name of 3rd party maintenance company if outsourced)
- `reportedAt`: Date (default: `Date.now`)
- `startedAt`: Date
- `completedAt`: Date
- `downtimeHours`: Number (default: 0, min: 0)
- `issueDescription`: String (required)
- `rootCause`: String
- `correctiveActionTaken`: String
- `sparePartsUsed`: [
    - `item`: ObjectId (ref: `InventoryItem`, spare parts drawn from Store module)
    - `quantity`: Number (required, min: 1)
    - `unitCost`: Number (min: 0)
    - `totalCost`: Number (min: 0)
  ]
- `technicianLaborCost`: Number (default: 0)
- `externalServiceCost`: Number (default: 0)
- `totalMaintenanceCost`: Number (default: 0, sparePartsCost + laborCost + externalCost)
- `status`: String (enum: `reported`, `approved`, `in_progress`, `completed`, `cancelled`, default: `reported`)
- `approvedBy`: ObjectId (ref: `Employee`)
- `createdAt`, `updatedAt`: Timestamps

---

### 2.4 ProductionJobs (`productionjobs`)
The Work Order / Job Order controlling production floors, sequential stage tracking, machine run times, operator assignments, and store material integration.

- `_id`: ObjectId
- `jobOrderNumber`: String (unique, uppercase, indexed, e.g. `JO-2026-0001`)
- `order`: ObjectId (ref: `Order`, required, indexed)
- `customer`: ObjectId (ref: `Customer`, required)
- `service`: ObjectId (ref: `Service`, required)
- `priority`: String (enum: `normal`, `high`, `urgent`, default: `normal`)
- `targetQuantity`: Number (required, ordered output quantity)
- `producedQuantity`: Number (default: 0, good output units passed)
- `defectiveQuantity`: Number (default: 0, spoiled units)
- `scheduledStartDate`: Date (required)
- `scheduledCompletionDate`: Date (required)
- `actualStartDate`: Date
- `actualCompletionDate`: Date
- `stages`: [
    - `sequence`: Number (required, 1, 2, 3...)
    - `stageName`: String (required, e.g. `Pre-press / CTP Plates`, `Offset Pressing`, `Lamination`, `Die-Cutting`, `Folding & Binding`, `Final Quality Inspection`)
    - `machine`: ObjectId (ref: `Machine`, optional for manual stages)
    - `operators`: [ObjectId] (refs to `Employee`)
    - `plannedStartTime`: Date
    - `actualStartTime`: Date
    - `actualEndTime`: Date
    - `hoursRun`: Number (default: 0)
    - `machineCost`: Number (default: 0, hoursRun * Machine.hourlyCostRate)
    - `completedQuantity`: Number (default: 0)
    - `status`: String (enum: `pending`, `in_progress`, `completed`, `skipped`, default: `pending`)
    - `qcPassed`: Boolean (default: false)
    - `qcInspector`: ObjectId (ref: `Employee`)
    - `notes`: String
  ]
- `materialRequests`: [ObjectId] (refs to `StockRequest` in Store Module)
- `actualMaterialsConsumed`: [
    - `item`: ObjectId (ref: `InventoryItem`, required, e.g. art paper, ink, plates, lamination film)
    - `plannedQuantity`: Number (required)
    - `issuedQuantity`: Number (from StockRequest)
    - `consumedQuantity`: Number (actually used in run)
    - `returnedQuantity`: Number (default: 0, returned unused to warehouse)
    - `unitCost`: Number (unit cost at time of issue)
    - `totalMaterialCost`: Number (consumedQuantity * unitCost)
  ]
- `wastageRecords`: [ObjectId] (refs to `ProductionWastage`)
- `costRollup`:
    - `totalMaterialCost`: Number (default: 0)
    - `totalMachineCost`: Number (default: 0)
    - `totalLaborCost`: Number (default: 0)
    - `totalWastageCost`: Number (default: 0)
    - `totalActualCost`: Number (default: 0)
- `status`: String (enum: `scheduled`, `prepress`, `in_production`, `finishing`, `qc_check`, `completed`, `cancelled`, default: `scheduled`)
- `remarks`: String
- `createdBy`: ObjectId (ref: `User`)
- `createdAt`, `updatedAt`: Timestamps

---

### 2.5 ProductionWastages (`productionwastages`)
Quantifies and classifies paper, ink, plates, and finished good spoilages by root cause, stage, machine, and operator with financial loss tracking.

- `_id`: ObjectId
- `wastageNumber`: String (unique, uppercase, indexed, e.g. `WST-2026-0001`)
- `productionJob`: ObjectId (ref: `ProductionJob`, required, indexed)
- `order`: ObjectId (ref: `Order`, required, indexed)
- `stageName`: String (required, e.g. `Offset Pressing`, `Die-Cutting`)
- `machine`: ObjectId (ref: `Machine`, optional)
- `operator`: ObjectId (ref: `Employee`, optional)
- `wasteCategory`: String (enum: `raw_material`, `defective_product`, `setup_spoilage`, required: true)
- `items`: [
    - `materialItem`: ObjectId (ref: `InventoryItem`, required for raw material waste)
    - `description`: String (required, e.g. `Art Card 300 GSM Sheets - Misregistered color`)
    - `quantity`: Number (required, min: 0)
    - `unitOfMeasurement`: String (e.g. `sheet`, `kg`, `copy`, `meter`)
    - `unitCost`: Number (min: 0)
    - `totalCost`: Number (quantity * unitCost)
    - `reason`: String (enum: `setup_spoilage`, `machine_malfunction`, `operator_error`, `defective_raw_material`, `color_mismatch`, `plate_defect`, `cutting_misalignment`, `other`, required: true)
    - `notes`: String
  ]
- `totalWastageCost`: Number (required, min: 0)
- `status`: String (enum: `pending_review`, `approved`, `rejected`, default: `pending_review`)
- `approvedBy`: ObjectId (ref: `Employee`)
- `approvedAt`: Date
- `recordedAt`: Date (default: `Date.now`)
- `createdAt`, `updatedAt`: Timestamps

---

## 3. Cross-Module Integration Map

```
  +-------------------------------------------------------------+
  |                        CRM & SALES                          |
  |  [Lead] ---> [Customer] ---> [Proforma] ---> [Order (SO)]   |
  +----------------------------------------------------+--------+
                                                       |
                    +----------------------------------+----------------------------------+
                    |                                                                     |
                    v                                                                     v
  +-----------------------------------+                             +-----------------------------------+
  |    PRE-PRESS & ARTWORK            |                             |        FINANCE & INVOICING        |
  |  [Design (Versions & Proofing)]   |                             |  [Invoice] <--- [CustomerPayment] |
  +-----------------+-----------------+                             |  (Syncs Customer.creditBalance)   |
                    |                                               +-----------------------------------+
                    v                                                                 ^
  +-----------------------------------------------------------------+                 |
  |               MACHINE & PRODUCTION OPERATIONS                   |                 |
  |  [ProductionJob (Job Order)]                                    |                 |
  |    |-- Stages: Pre-press -> Offset -> Finishing -> QC           |                 |
  |    |-- Machines & Operators: [Machine], [Employee]              |                 |
  |    |-- Material Consumption: Consumed & Returned                |                 |
  |    +-- Spoilage / Loss: [ProductionWastage] --------------------+-----------------+
  |                                                                 | (Wastage & Actual Cost Rollup)
  +---------------------------------+-------------------------------+
                                    |
                                    v (Material Request & Draw)
  +-----------------------------------------------------------------+
  |                  STORE & INVENTORY MODULE                       |
  |  [StockRequest] ---> [StockMovement] ---> [StockBalance]        |
  |  [InventoryItem] (Raw Materials, Paper, Ink, Spare Parts)       |
  +-----------------------------------------------------------------+
```
