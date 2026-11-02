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