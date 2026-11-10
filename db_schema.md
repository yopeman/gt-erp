# Database schema (MongoDB) for CRM, Machine and Production

### Leads

- _id
- name
- status
- descustion:
  - date
  - summary
- converted at
- decline at

### Customers

- _id
- name
- category: individual, company, government, corporation, etc
- contact person:
  - name
  - position
  - phone number
- detail information: [{}]
  - name
  - type: text, file
  - value
- status
- source
- credit:
  - limit
  - balance
  - outstanding
- assigned sales representative

### Followups

- _id
- customer id
- agenda
- schedule time
- status
- result

### Services

- _id
- name
- workflow:
  - name
  - description
  - time estimated
  - order
  - leader
  - machine Id

### Orders

- _id
- order number
- service
- service status
- price:

  - item
  - quantity
  - unit price
- vat
- total price
- cost detail:

  - name
  - reference:
    - collection name
    - id
  - value
- total cost
- status: pending, inprogress, completed
- payment status: credit, paid, partialy paid, unpaid
- specification:

  - name
  - type: text, file
  - value

### Design

- _id
- design number
- order id
- specification:

  - name
  - type: text, file
  - value
- version:

  - number: auto increment
  - file url
  - status: pending, confirmed, rejected
- status: pending, inprogress, completed

### Machines

- _id
- name
- description
- hourly cost
- assigned employees: [ObjectId]
- daily check up list: [string]
- weekly check up list: [string]
- monthly check up list: [string]

### Machine Status Checkup history

- _id
- machine id
- type: daily, weekly, monthly
- checkup list
  - name
  - status: pass, failed

### Production

- _id
- order id
- job order number
- specification:
  - name
  - type: text, file
  - value
- machines:
  - machine id
  - take time
  - total cost
- finishing activities

### Usage

- _id
- production id
- order id
- items:

  - material id
  - quantity

### Wastages

- _id
- production id
- order id
- items:
  - material id
  - quantity
  - reason

### Costs

- _id
- production id
- order id
- name
- description
- amount

### Proformas

- _id
- order id
- proforma detail: Mixed
- pdf url
- prices: Mixed
- vat
- total price

### Invoices

- id
- order id
- pdf url
- prices: Mixed
- vat
- total price
- status
- payment status
- collection history:
  - amount
  - status
  - collection id

### Credit

- _id
- customer id
- order id
- invoice id
- status
- credit
- total collected
- collected history:
  - amount
  - status
  - collection id
- remaining

### Collection

- _id
- customer id
- order id
- invoice id
- status
- amount
- remaining
