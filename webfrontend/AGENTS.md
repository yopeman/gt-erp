# GT ERP Web Frontend - Agent Directives & Architecture Standards

> **Enterprise**: GT Printing Press ERP  
> **Workspace**: `/home/yope/.projects/code/gt-erp/webfrontend`  
> **Backend Service**: Express.js + MongoDB API (`http://localhost:5000/api`)  
> **Applicability**: Mandatory for all AI agents, subagents, and frontend engineers.

---

## 1. Master Directives & Non-Negotiable Rules

Every task, component, and commit in `webfrontend` MUST adhere to these 9 core mandates:

| # | Directive | Summary Rule |
|---|---|---|
| **1** | **Zero Mock Data Mandate** | **Strictly prohibited** to use mock data, hardcoded sample arrays, or dummy cards in UI components. Every view, list, form, dropdown, metric, and status must fetch from and mutate the live backend API (`http://localhost:5000/api`). |
| **2** | **Multi-Language (i18n)** | The application must support **Amharic (አማርኛ)** and **English** out-of-the-box, with clean modular localization structures to seamlessly plug in other languages (Afaan Oromoo, Tigrinya, Arabic, etc.) without altering component templates. |
| **3** | **Mobile-First & Fully Responsive** | Design and build starting with the mobile viewport (320px–480px), progressively enhancing to tablet (`md:`) and desktop (`lg:`, `xl:`). Touch targets must be at least 44x44px. |
| **4** | **No Tables on Mobile Screens** | **Never render traditional table layouts (`<table>`) on mobile viewports.** Use clean tabular views with sticky headers strictly on desktop (`hidden md:table` or `hidden lg:table`). On mobile, data must render as card decks, stacked list items, or key-value detail tiles. |
| **5** | **GT Brand Identity & Colors** | Primary brand color is **GT Red (`#DA1F26`)**. All buttons, active indicators, brand highlights, and accents must use the GT brand palette tokens. Avoid generic unthemed blues, purples, or greens. |
| **6** | **GT Logo Prominence** | The official GT logo (`/gt-logo.jpg`) must be displayed consistently in the Top Navigation, Collapsible Sidebar, Mobile Drawer, and Authentication screens. |
| **7** | **Theme System (Dark & Light Mode)** | Full support for Dark Mode and Light Mode with system preference detection (`prefers-color-scheme`), explicit toggle, and persistent `localStorage` memory. Must style inputs, cards, borders, text, and scrollbars in both modes. |
| **8** | **Role-Based Access Control (RBAC)** | Dynamic UI permission gating based on backend JWT user roles (`admin`, `hr`, `manager`, `employee`). Action buttons (Create, Edit, Delete, Approve, Settle), navigation menus, and routes must be conditionally guarded. |
| **9** | **Tailwind CSS Architectural Rigor** | Style exclusively with Tailwind CSS utility classes and configured design tokens. No inline style hacks or uncontained custom CSS. |

---

## 2. GT Brand Design System & Color Palette

### 2.1 Brand Colors

The signature identity of **GT Printing Press** is centered on high-contrast, energetic GT Red:

- **GT Brand Red**: `#DA1F26` (`rgb(218, 31, 38)`)
- **Tailwind Palette Definition**:

```javascript
// tailwind.config.js / theme configuration
export const gtBrandColors = {
  primary: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#da1f26', // Core GT Red
    600: '#c1151c',
    700: '#a11016',
    800: '#7f1115',
    900: '#5e0d10',
    950: '#3b0507',
  },
  dark: {
    bg: '#0f172a',      // slate-900 (Page background)
    surface: '#1e293b', // slate-800 (Cards, modals, sidebars)
    border: '#334155',  // slate-700
    text: '#f8fafc',    // slate-50
    muted: '#94a3b8',   // slate-400
  },
  light: {
    bg: '#f8fafc',      // slate-50
    surface: '#ffffff', // white
    border: '#e2e8f0',  // slate-200
    text: '#0f172a',    // slate-900
    muted: '#64748b',   // slate-500
  }
};
```

### 2.2 Brand Assets
- **GT Logo Path**: `/gt-logo.jpg` (located in `public/gt-logo.jpg`).
- **Logo Usage Standard**:
  - Top navigation bar: Height `h-8` to `h-9` with rounded brand container or circular avatar ring.
  - Collapsible Sidebar: Compact `h-8` icon or full logo with "GT Printing Press ERP" typography.
  - Login Card: Centered `h-16` or `h-20` logo with subtle drop shadow and crisp border.

---

## 3. Multi-Language (i18n) Architecture

The application serves diverse staff across Ethiopia. It must support **Amharic (አማርኛ)** and **English**, architected so that any additional regional language (e.g., Afaan Oromoo, Tigrinya) can be added simply by registering a new locale JSON dictionary.

### 3.1 Localization Directory Structure
```
src/i18n/
├── index.js            # i18n initialization & Language Provider/Hook
├── locales/
│   ├── en.json         # English translations (Master reference)
│   ├── am.json         # Amharic translations (አማርኛ)
│   └── om.json         # Afaan Oromoo (future expansion)
```

### 3.2 Canonical Translation Schema
All UI text must be referenced via translation keys. Below is the minimum standard schema:

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "employees": "Employees",
    "attendance": "Attendance",
    "leave": "Leave Requests",
    "payroll": "Payroll",
    "overtime": "Overtime",
    "recruitment": "Recruitment",
    "clearance": "Clearance",
    "users": "User Management",
    "settings": "Settings",
    "logout": "Sign Out"
  },
  "actions": {
    "create": "Add New",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save Changes",
    "cancel": "Cancel",
    "approve": "Approve",
    "reject": "Reject",
    "search": "Search...",
    "filter": "Filter",
    "refresh": "Refresh",
    "clockIn": "Clock In",
    "clockOut": "Clock Out",
    "submit": "Submit"
  },
  "status": {
    "active": "Active",
    "inactive": "Inactive",
    "pending": "Pending",
    "approved": "Approved",
    "rejected": "Rejected",
    "paid": "Paid",
    "unpaid": "Unpaid",
    "partially": "Partially Paid",
    "late": "Late",
    "onTime": "On Time",
    "absent": "Absent"
  }
}
```

**Amharic (`am.json`) equivalent**:
```json
{
  "nav": {
    "dashboard": "ዳሽቦርድ",
    "employees": "ሠራተኞች",
    "attendance": "የሥራ ክትትል",
    "leave": "የፈቃድ ጥያቄዎች",
    "payroll": "የደመወዝ ክፍያ",
    "overtime": "የትርፍ ሰዓት",
    "recruitment": "ቅጥርና ማስታወቂያ",
    "clearance": "ክሊራንስ",
    "users": "የተጠቃሚዎች አስተዳደር",
    "settings": "ቅንብሮች",
    "logout": "ውጣ"
  },
  "actions": {
    "create": "አዲስ አክል",
    "edit": "አስተካክል",
    "delete": "አጥፋ",
    "save": "አስቀምጥ",
    "cancel": "ሰርዝ",
    "approve": "አጽድቅ",
    "reject": "ውድቅ አድርግ",
    "search": "ፈልግ...",
    "filter": "አጣራ",
    "refresh": "አድስ",
    "clockIn": "ግባ (Clock In)",
    "clockOut": "ውጣ (Clock Out)",
    "submit": "አስገባ"
  },
  "status": {
    "active": "ንቁ",
    "inactive": "እንቅስቃሴ-አልባ",
    "pending": "በመጠባበቅ ላይ",
    "approved": "የጸደቀ",
    "rejected": "ውድቅ የተደረገ",
    "paid": "የተከፈለ",
    "unpaid": "ያልተከፈለ",
    "partially": "በከፊል የተከፈለ",
    "late": "የዘገየ",
    "onTime": "በሰዓቱ",
    "absent": "ቀሪ"
  }
}
```

### 3.3 Amharic Font & Ge'ez Typography Rule
Ge'ez glyphs have taller vertical metrics than Latin characters. In your CSS:
- Add font family fallbacks: `'Noto Sans Ethiopic', 'Abyssinica SIL', 'Nyala', sans-serif`.
- Ensure buttons and list items containing Amharic text have adequate `line-height` (`leading-relaxed` or `leading-normal`) to avoid clipping Ge'ez vowels/accents.

---

## 4. Mobile-First Responsive Design & "No Tables on Mobile" Pattern

### 4.1 The Rule
Data tables with numerous columns cause horizontal overflow, tiny truncated fonts, and poor user experience on mobile screens.
- **On Mobile (< 768px or < 1024px)**: Render responsive **Card Stacks** or **List Decks**.
- **On Desktop (>= 768px or >= 1024px)**: Render structured **Tables** with sticky headers.

### 4.2 Standard Dual-View Component Pattern
Every tabular screen (Employees, Attendances, Leave Requests, Payrolls) MUST implement this responsive pattern:

```jsx
export default function ResponsiveDataList({ items, onEdit, onDelete, canManage }) {
  return (
    <div className="w-full">
      {/* 1. MOBILE VIEW: Card Deck (Visible on mobile, hidden on desktop) */}
      <div className="block md:hidden space-y-3">
        {items.map((item) => (
          <div 
            key={item._id} 
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">{item.title || item.fullName}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.subtitle || item.email}</p>
              </div>
              <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${getStatusBadge(item.status)}`}>
                {item.status}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-slate-700/60 pt-2 text-slate-600 dark:text-slate-300">
              <div><span className="text-slate-400">Department:</span> {item.department || '-'}</div>
              <div><span className="text-slate-400">Date:</span> {formatDate(item.createdAt)}</div>
            </div>

            {canManage && (
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                <button 
                  onClick={() => onEdit(item)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Edit
                </button>
                <button 
                  onClick={() => onDelete(item._id)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 2. DESKTOP VIEW: Clean Table (Hidden on mobile, visible on desktop) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
            <tr>
              <th className="px-4 py-3">Name / Title</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              {canManage && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {items.map((item) => (
              <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{item.fullName || item.title}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.department || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${getStatusBadge(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(item.createdAt)}</td>
                {canManage && (
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => onEdit(item)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => onDelete(item._id)} className="text-xs text-primary-500 hover:underline">Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 5. Theme Support (Light & Dark Mode)

### 5.1 Architecture
- Implement a `ThemeContext` providing `{ theme, resolvedTheme, toggleTheme, setTheme }`.
- Supported theme modes: `'light' | 'dark' | 'system'`.
- Root HTML synchronization: Adds or removes the `.dark` class on `document.documentElement` and sets `<meta name="color-scheme" content="light dark">`.
- Persisted in `localStorage` under `'gt_theme'`.

### 5.2 Style Conventions
- **Backgrounds**: Use `bg-slate-50 dark:bg-slate-900` for pages; `bg-white dark:bg-slate-800` for cards and panels.
- **Borders**: Use `border-slate-200 dark:border-slate-700`.
- **Text**: Use `text-slate-900 dark:text-slate-100` for headings; `text-slate-600 dark:text-slate-400` for body/secondary text.
- **Inputs & Controls**: Use `bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500`.

---

## 6. Role-Based Access Control (RBAC) System

### 6.1 Backend Role Hierarchy
Roles are retrieved from the backend JWT (`user.roles`):
1. **`admin`**: Universal unrestricted access (Full CRUD across all modules and user account management).
2. **`hr`**: Human resources access (Employees, Recruitment, Clearances, Leaves, Attendances, Overtime, Payroll review).
3. **`manager`**: Department management (View department team, approve leave requests, review department attendance).
4. **`employee`**: Self-service portal (Clock in/out, view own profile, submit leave requests, view own pay slips).

### 6.2 Permission Utility (`<Can />` Component)
Never duplicate permission checking logic inside UI elements. Use a unified helper:

```jsx
// src/components/auth/Can.jsx
import { useAuth } from '../../context/AuthContext';

export default function Can({ roles = [], children, fallback = null }) {
  const { user } = useAuth();
  
  if (!user) return fallback;
  if (user.roles?.includes('admin')) return children;
  
  const hasAccess = roles.some((role) => user.roles?.includes(role));
  return hasAccess ? children : fallback;
}
```

**Usage Example**:
```jsx
{/* Visible only to HR and Admins */}
<Can roles={['hr', 'admin']}>
  <button onClick={handleOpenAddEmployeeModal} className="btn-primary">
    {t('actions.create')}
  </button>
</Can>
```

### 6.3 Route Protection (`ProtectedRoute.jsx`)
Guards private pages and automatically redirects unauthenticated users to `/login`, or displays an unauthorized alert if their role lacks privileges.

---

## 7. Backend API Integration & Zero-Mock Policy

### 7.1 Strict No-Mock Mandate
- **No Dummy State**: Do not write `useState([ { id: 1, name: 'Sample' } ])`.
- **Live Fetching**: Initial states must start as `null` or `[]` with `loading: true`, fetching immediately from the backend.
- **Error Handling**: Real try/catch blocks rendering user-friendly error banners and retry buttons.
- **Live Form Submissions**: All modal and page forms must execute `POST` / `PUT` / `DELETE` requests directly to Express endpoints.

### 7.2 API Client Specification
- Base URL: Read from `import.meta.env.VITE_API_BASE_URL` with default fallback to `http://localhost:5000/api`.
- Include Bearer token in headers: `Authorization: Bearer ${token}`.
- Intercept `401 Unauthorized` responses to clear invalid sessions and redirect to `/login`.

### 7.3 Backend Endpoints Catalog

| Module | Method | Endpoint | Access Roles | Description |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/users/login` | Public | Authenticate user & return JWT + User object |
| **Auth** | `POST` | `/api/users/register` | Public / Admin | Create user account |
| **Auth** | `GET` | `/api/users/me` | Authenticated | Retrieve logged in user's profile |
| **Users** | `GET` | `/api/users` | `admin`, `hr` | List system users |
| **Users** | `PUT` | `/api/users/:id` | `admin` | Update user details & role assignments |
| **Employees** | `GET` | `/api/employees` | `admin`, `hr`, `manager` | List employees (filters: branch, dept, type) |
| **Employees** | `POST` | `/api/employees` | `admin`, `hr` | Register new employee |
| **Employees** | `GET` | `/api/employees/:id` | Authenticated | Get full employee profile (docs, warranty, bank) |
| **Employees** | `PUT` | `/api/employees/:id` | `admin`, `hr` | Update employee record |
| **Employees** | `DELETE` | `/api/employees/:id` | `admin` | Deactivate/delete employee |
| **Attendance** | `POST` | `/api/attendances/clock-in` | `employee`, `admin` | Clock in with timestamp |
| **Attendance** | `POST` | `/api/attendances/clock-out` | `employee`, `admin` | Clock out with timestamp |
| **Attendance** | `GET` | `/api/attendances` | Authenticated | List attendance records (own or company-wide) |
| **Leave** | `GET` | `/api/leave-requests` | Authenticated | List leave requests |
| **Leave** | `POST` | `/api/leave-requests` | Authenticated | Submit new leave application |
| **Leave** | `PUT` | `/api/leave-requests/:id/decision`| `admin`, `hr`, `manager`| Approve or reject leave request |
| **Leave Balances** | `GET` | `/api/leave-balances` | Authenticated | Retrieve annual/sick/casual leave balances |
| **Overtime** | `GET` | `/api/overtimes` | Authenticated | List overtime entries |
| **Overtime** | `POST` | `/api/overtimes` | `admin`, `hr`, `manager` | Record worked overtime |
| **Payroll** | `GET` | `/api/payrolls` | `admin`, `hr`, `employee` | View payroll statements & pay slips |
| **Payroll** | `POST` | `/api/payrolls` | `admin`, `hr` | Generate payroll calculation |
| **Recruitment** | `GET` | `/api/job-positions` | Authenticated | List open job vacancies |
| **Recruitment** | `POST` | `/api/job-applications`| Public / HR | Submit/review candidate applications |
| **Clearance** | `GET` | `/api/clearances` | `admin`, `hr`, `manager` | Track exit clearance checklist & signoffs |

---

## 8. Frontend Project Structure Standards

Maintain clean separation of concerns under `src/`:

```
src/
├── assets/             # Brand logos, icons, illustrations
├── components/
│   ├── common/         # Buttons, Badges, Modals, Spinners, Dropdowns
│   ├── layout/         # Header, Sidebar, MobileDrawer, Footer
│   ├── auth/           # Can, ProtectedRoute, LoginForm
│   └── data/           # ResponsiveDataList, StatCard, EmptyState
├── context/
│   ├── AuthContext.jsx # User auth state, login/logout, JWT token
│   └── ThemeContext.jsx# Dark/light theme state & toggle
├── hooks/
│   ├── useAuth.js      # Auth context consumer
│   ├── useTheme.js     # Theme context consumer
│   └── useRBAC.js      # Role check helper hook
├── i18n/
│   ├── index.js        # i18n context & provider
│   └── locales/        # en.json, am.json
├── pages/
│   ├── Dashboard/      # Role-tailored dashboards
│   ├── Employees/      # Employee directory & profile
│   ├── Attendance/     # Attendance tracker & clock-in
│   ├── Leave/          # Leave requests & balance
│   ├── Payroll/        # Salary & slip management
│   ├── Recruitment/    # Job positions & candidates
│   └── Users/          # User management (Admin only)
├── services/
│   ├── api.js          # Centralized Axios/fetch client with interceptors
│   ├── authService.js  # Login, register, me APIs
│   ├── employeeService.js
│   ├── attendanceService.js
│   └── leaveService.js
├── App.jsx             # Routes & layout shell
├── main.jsx            # React root with Providers
└── index.css           # Tailwind directives & CSS root variables
```

---

## 9. Developer Commands & Execution Checklist

### 9.1 Essential Commands
```bash
# In /home/yope/.projects/code/gt-erp/webfrontend
npm install           # Install dependencies
npm run dev           # Start Vite development server (default: http://localhost:5173)
npm run build         # Build production bundle in dist/
npm run lint          # Run ESLint validation
```

### 9.2 Step-by-Step Feature Implementation Checklist
When adding or updating any feature in `webfrontend`, verify every item before finishing:

1. [ ] **API Service**: Created/verified backend call in `src/services/` against live backend (`/api/...`).
2. [ ] **No Mock Data**: Verified that state loads from the API, with clean loading spinner and error banner.
3. [ ] **Mobile-First Responsive**: Built mobile card view first (`block md:hidden`), verified desktop table view (`hidden md:table`).
4. [ ] **No Tables on Mobile**: Verified that mobile view contains zero horizontally scrolling `<table>` elements.
5. [ ] **i18n Translation Keys**: All user-facing strings are keyed and defined in BOTH `en.json` and `am.json`.
6. [ ] **RBAC Protection**: Wrapped action buttons (Edit, Delete, Create, Approve) with `<Can roles={[...]}>` and guarded route.
7. [ ] **Theme Contrast**: Verified legible text and pleasant background colors in both Light Mode and Dark Mode.
8. [ ] **GT Brand Aesthetics**: Used GT Red `#DA1F26` for primary buttons, active tabs, and brand highlights.
