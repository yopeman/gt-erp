# Database Schema (MongoDB Mongoose)

### Users

- _id
- full name
- email
- password
- roles: [string]
- is deleted
- timestamps

### Employees

- _id
- full name
- email
- department
- position
- gender
- branch[dropdown]
- phone number
- detail address[location,home,]
- hired at
- manager: ObjectId
- type: remote, part time, full time, contract, intern
- profile image
- date of birth
- status: active, inactive, suspended, terminated
- documents: [{}]
    - type
    - name
    - url
    - issued at
    - uploaded by
    - expires at
    - approved at
    - time stamps
- timestamps
- national id
- emergency
    - Contact Name
    - Contact Phone
    - Contact Relationship
    - Warranty Relationship to Employee
- warranty
    - full name
    - phone
    - national id
    - relationship to employee
- educations: [{}]
    - graduation year
    - graduation university
    - education level: degree, master, diploma
- account details:
    - holder name
    - number
    - status: active, inactive
    - is primary
- base salary

### Leave Requests

- _id
- employee: ObjectId
- type: annual, sick, etc
- start date
- end date
- reason
- decision: rejected, accepted
- decide by
- decide at
- timestamps

### Attendances

- id
- employee(ObjectId)
- date
- start time
- end time
- type: late, absent, overtime, on time
- is deleted

### Overtimes

- _id
- employee: ObjectId
- start at
- worked hours
- approved hours
- reason
- type: holiday, weekend, calendar
- calculation rate: 1, 1.5, 2
- status: paid, unpaid, partially
- is pre approved
- status
- approved by
- timestamps

### Payrolls

- _id
- from date
- employee id
- currency
- to date
- created by
- approved by
- status: paid, partially, unpaid
- type: salary, overtime, transport, bonus, commission
- paid at
- total gross
- total deduction
- total net
- timestamps

### Job Positions

- _id
- title
- description
- requirements: []
- type
- status: pending, open, closed
- posted at
- closing time
- timestamps

### Jobs Applications

- _id
- position: ObjectId refer Job Positions
- apply at
- status:
- candidate:
    - name
    - email
    - phone number
    - telegram username
- attachments
    - name
    - url
    - uploaded at
- Interview
    - date
    - type: physical, online
    - meeting link
    - note
- timestamps

### Internships

- _id
- supervisor: ObjectId refer Employees
- employee: ObjectId refer Employees (Employees.type === intern)
- type: paid, unpaid
- department
- start date
- end date
- status
- timestamps

### Clearances

- _id
- employee: ObjectId
- reason
- status:
- checklist: [{}]
    - title: department, store, etc…
    - confirmed by: ObjectId
    - confirmed at
- final approved by
- completed at
- timestamps

### leave balance

- year
- type: annual, sick, emergency, holiday, casual
- is payable
- remaining
- total used
- total
- created at
- is deleted

1. STORE & INVENTORY MODULE
1. Warehouses
Manages the company's physical storage locations.
- _id
- warehouse name
- warehouse code
- description
- branch
- location
- manager: ObjectId refer Employees
- contact person
- phone number
- status: active, inactive
- is deleted
- timestamps
2. Inventory Categories
Organizes materials and products.
- _id
- name
- description
- parent category: ObjectId (optional)
- category type: raw material, finished product, spare part, office supply, consumable, fixed asset
- status: active, inactive
- is deleted
- timestamps
Examples:
- Printing Materials
- Paper
- Ink
- Chemicals
- Spare Parts
- Office Supplies
- Finished Products
3. Inventory Items
The central collection for all materials and products.
- _id
- item name
- item code (unique)
- description
- category: ObjectId refer Inventory Categories
- item type: raw material, finished product, spare part, consumable, fixed asset
- unit of measurement: piece, kg, liter, meter, box, pack, roll, ream
- brand
- model
- specifications
- minimum stock level
- maximum stock level
- reorder level
- unit cost
- currency
- preferred supplier: ObjectId refer Suppliers
- image
- attachments: []
  - name
  - type
  - url
  - uploaded by
  - uploaded at
- status: active, inactive
- is deleted
- timestamps
Important: Keep item information separate from warehouse quantities. One item can exist in multiple warehouses.
4. Stock Balances
Tracks the quantity of each item in each warehouse.
- _id
- item: ObjectId refer Inventory Items
- warehouse: ObjectId refer Warehouses
- quantity on hand
- reserved quantity
- available quantity
- damaged quantity
- minimum stock level
- maximum stock level
- last stock movement at
- timestamps
Calculation:

Available Quantity = Quantity on Hand - Reserved Quantity

Create a unique compound index for item + warehouse.
5. Stock Movements
Records every inventory transaction. This is one of the most important collections.
- _id
- movement number
- item: ObjectId refer Inventory Items
- warehouse: ObjectId refer Warehouses
- movement type: purchase receipt, stock issue, stock transfer in, stock transfer out, adjustment, return, damaged
- quantity
- unit cost
- total cost
- reference type: purchase order, goods receipt, stock transfer, manual adjustment, production order
- reference id: ObjectId
- reason
- note
- attachments: []
  - name
  - url
  - uploaded by
  - uploaded at
- performed by: ObjectId refer Employees
- approved by: ObjectId refer Employees
- movement date
- timestamps
Important: Never manually change stock quantities without recording a corresponding stock movement.
6. Stock Adjustments
Used when the actual physical stock differs from the system balance.
- _id
- adjustment number
- warehouse: ObjectId
- item: ObjectId
- system quantity
- physical quantity
- difference
- reason: damaged, lost, expired, counting error, other
- description
- attachments: []
  - name
  - url
  - uploaded by
  - uploaded at
- requested by: ObjectId refer Employees
- approved by: ObjectId refer Employees
- status: pending, approved, rejected, completed
- adjustment date
- timestamps
7. Stock Transfers
Transfers materials between warehouses.
- _id
- transfer number
- source warehouse: ObjectId
- destination warehouse: ObjectId
- items: []
  - item: ObjectId
  - requested quantity
  - approved quantity
  - transferred quantity
  - received quantity
  - note
- requested by: ObjectId refer Employees
- approved by: ObjectId refer Employees
- received by: ObjectId refer Employees
- status: draft, pending, approved, in transit, partially received, completed, rejected, cancelled
- transfer date
- received date
- attachments: []
  - name
  - url
  - uploaded by
  - uploaded at
- note
- timestamps
8. Stock Requests / Material Requests
Allows departments and employees to request materials from the store.
- _id
- request number
- requested by: ObjectId refer Employees
- department
- warehouse: ObjectId
- items: []
  - item: ObjectId
  - requested quantity
  - approved quantity
  - issued quantity
  - unit of measurement
  - note
- purpose
- required date
- priority: low, medium, high, urgent
- status: draft, pending, approved, partially approved, rejected, partially issued, completed, cancelled
- approved by: ObjectId refer Employees
- issued by: ObjectId refer Employees
- issued at
- attachments: []
  - name
  - url
  - uploaded by
  - uploaded at
- note
- timestamps
2. PURCHASE MANAGEMENT MODULE
9. Suppliers
Stores supplier and vendor information.
- _id
- supplier name
- supplier code
- company name
- contact person
- email
- phone number
- alternative phone
- address
- city
- country
- tax identification number (TIN)
- business license number
- supplier type: manufacturer, distributor, wholesaler, retailer, service provider
- supplied items: [ObjectId] refer Inventory Items
- payment terms: cash, credit, partial
- bank details: []
  - bank name
  - account holder
  - account number
- documents: []
  - name
  - type
  - url
  - uploaded by
  - uploaded at
  - expires at
- rating
- notes
- status: active, inactive, blacklisted
- is deleted
- timestamps
10. Purchase Requests
Used when departments or storekeepers request materials to be purchased.
- _id
- request number
- requested by: ObjectId refer Employees
- department
- warehouse: ObjectId
- items: []
  - item: ObjectId
  - item name (for new items)
  - description
  - requested quantity
  - unit of measurement
  - estimated unit price
  - estimated total
  - preferred supplier: ObjectId
  - note
- purpose
- priority: low, medium, high, urgent
- required date
- estimated total amount
- currency
- attachments: []
  - name
  - type
  - url
  - uploaded by
  - uploaded at
- status: draft, pending, approved, rejected, partially approved, converted to purchase order, cancelled
- approved by: ObjectId refer Employees
- approved at
- rejection reason
- note
- timestamps
11. Purchase Orders (PO)
Official purchasing agreements sent to suppliers.
- _id
- purchase order number
- purchase request: ObjectId refer Purchase Requests
- supplier: ObjectId refer Suppliers
- warehouse: ObjectId refer Warehouses
- items: []
  - item: ObjectId
  - description
  - quantity
  - received quantity
  - unit of measurement
  - unit price
  - discount
  - tax percentage
  - total price
- subtotal
- discount amount
- tax amount
- shipping cost
- other expenses
- grand total
- currency
- payment terms
- order date
- expected delivery date
- delivery address
- notes
- documents: []
  - name
  - type: quotation, invoice, contract, other
  - url
  - uploaded by
  - uploaded at
- created by: ObjectId refer Employees
- approved by: ObjectId refer Employees
- approved at
- status: draft, pending, approved, sent, partially received, received, completed, rejected, cancelled
- timestamps
12. Goods Receipts (GRN)
Records materials physically received from suppliers.
- _id
- receipt number
- purchase order: ObjectId refer Purchase Orders
- supplier: ObjectId refer Suppliers
- warehouse: ObjectId refer Warehouses
- items: []
  - item: ObjectId
  - ordered quantity
  - previously received quantity
  - received quantity
  - accepted quantity
  - rejected quantity
  - damaged quantity
  - unit cost
  - note
- received by: ObjectId refer Employees
- inspected by: ObjectId refer Employees
- receipt date
- supplier delivery note number
- supplier invoice number
- attachments: []
  - name
  - type
  - url
  - uploaded by
  - uploaded at
- status: draft, pending inspection, accepted, partially accepted, rejected, completed
- note
- timestamps
Important: When a goods receipt is approved and accepted, the system should automatically:
1. Increase the warehouse stock balance.
2. Create stock movement records.
3. Update received quantities in the purchase order.
4. Update the purchase order status.
13. Purchase Payments
Tracks payments made to suppliers.
- _id
- payment number
- supplier: ObjectId refer Suppliers
- purchase order: ObjectId refer Purchase Orders
- goods receipt: ObjectId refer Goods Receipts (optional)
- invoice number
- payment date
- amount
- currency
- payment method: cash, bank transfer, cheque, other
- transaction reference
- bank name
- paid by: ObjectId refer Employees
- approved by: ObjectId refer Employees
- attachments: []
  - name
  - type
  - url
  - uploaded by
  - uploaded at
- status: pending, approved, paid, rejected, cancelled
- notes
- timestamps
14. Supplier Returns
Used when purchased materials are damaged, incorrect, or do not meet requirements.
- _id
- return number
- supplier: ObjectId refer Suppliers
- purchase order: ObjectId
- goods receipt: ObjectId
- warehouse: ObjectId
- items: []
  - item: ObjectId
  - quantity
  - unit cost
  - reason
  - condition
- returned by: ObjectId refer Employees
- approved by: ObjectId refer Employees
- return date
- refund amount
- attachments: []
  - name
  - url
  - uploaded by
  - uploaded at
- status: draft, pending, approved, returned, refunded, rejected
- notes
- timestamps
3. SYSTEM-WIDE SUPPORT COLLECTIONS
These are useful for making the modules work together without making the main collections unnecessarily complicated.
15. Approval History
Tracks who approved, rejected, or changed a request.
- _id
- reference type: purchase request, purchase order, stock request, stock adjustment, stock transfer
- reference id: ObjectId
- action: submitted, approved, rejected, returned for correction
- action by: ObjectId refer Employees
- comment
- action date
- timestamps
16. Inventory Audit Logs
Tracks changes to inventory records for accountability.
- _id
- item: ObjectId
- warehouse: ObjectId
- action: created, updated, deleted, stock changed
- previous values:
- new values:
- performed by: ObjectId refer Employees
- reason
- timestamps