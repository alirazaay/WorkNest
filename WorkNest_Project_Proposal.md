# WorkNest — SaaS HR Management Platform
## Complete Project Proposal, System Design & Frontend Specification

---

## 1. PROJECT OVERVIEW

### 1.1 Project Name
**WorkNest** — A Multi-Tenant SaaS HR Management Platform

### 1.2 Tagline
*"One platform. Every team. Total HR control."*

### 1.3 Project Description
WorkNest is a cloud-based, multi-tenant Software-as-a-Service (SaaS) Human Resource Management System (HRMS). It allows multiple companies to independently manage their entire workforce — from hiring and onboarding to attendance, leave approvals, payroll generation, and analytics — all within a single shared platform while keeping each company's data fully isolated.

Each company that signs up gets its own private workspace (tenant). Employees, managers, and HR admins within that company interact with the system based on their role permissions. The platform owner (Super Admin) can oversee all registered companies.

### 1.4 Problem Statement
Small to medium-sized businesses in Pakistan and globally struggle with:
- Manual attendance and leave tracking via spreadsheets or paper
- No centralized employee records system
- Payroll calculated manually each month with high error rate
- No visibility into HR metrics or workforce analytics
- Expensive enterprise HR tools that are overkill for SMBs

WorkNest solves all of the above with an affordable, intuitive SaaS platform.

### 1.5 Target Users
| User Type | Description |
|-----------|-------------|
| Company Admin / HR Head | Registers company, manages all HR operations |
| Department Manager | Manages team attendance, approves leave requests |
| Employee | Views own profile, applies for leave, views payslip |
| Super Admin | Platform owner, oversees all tenants |

### 1.6 Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React JS (Vite), React Router, Context API, Axios, Recharts, Tailwind CSS |
| Backend | Node.js, Express JS |
| Database | MySQL |
| Auth | JWT (Access + Refresh Tokens) |
| Email | Nodemailer |
| File Storage | Multer (local) or Cloudinary |
| API Testing | Postman |

---

## 2. SaaS MULTI-TENANCY MODEL

### 2.1 How Multi-Tenancy Works
```
Platform (WorkNest)
├── Tenant: Acme Corp (tenantId: t001)
│   ├── Employees: 45
│   ├── Departments: Engineering, HR, Sales
│   └── Data fully isolated
│
├── Tenant: BlueTech Ltd (tenantId: t002)
│   ├── Employees: 12
│   ├── Departments: Development, Marketing
│   └── Data fully isolated
│
└── Tenant: NovaPK (tenantId: t003)
    ├── Employees: 120
    └── Data fully isolated
```

Every database document contains a `tenantId` field. A middleware layer on the backend automatically injects the tenant context from the JWT token — no manual filtering needed per API.

### 2.2 Subscription Plans (Simulated)
| Plan | Max Employees | Price | Features |
|------|--------------|-------|----------|
| Starter | 10 | Free | Core HR only |
| Growth | 50 | $29/month | Core + Payroll + Analytics |
| Enterprise | Unlimited | $99/month | All features + Priority Support |

When a company hits their employee limit, the system blocks further additions and shows a plan upgrade prompt.

---

## 3. USER ROLES & PERMISSIONS

### 3.1 Super Admin
- Accessible at: `/super-admin`
- Can view all registered companies (tenants)
- Can view platform-level stats (total companies, total employees, revenue simulation)
- Can deactivate a company account
- Cannot access individual company data

### 3.2 Company Admin (HR Head)
- Full access to all HR modules within their company
- Can create/edit/delete departments
- Can add, edit, terminate employees
- Can generate payroll
- Can view all analytics
- Can approve/reject leave requests (or delegate to managers)

### 3.3 Manager
- Can view employees in their department only
- Can approve or reject leave requests for their team
- Can view attendance of their team
- Cannot access payroll generation or company settings

### 3.4 Employee
- Can view their own profile
- Can clock in / clock out
- Can apply for leave
- Can view own attendance history
- Can view and download their own payslip
- Cannot see other employees' data

---

## 4. COMPLETE FEATURE LIST

### Module 1 — Authentication & Onboarding
- [ ] Company self-registration form (creates tenant automatically)
- [ ] Login page (email + password)
- [ ] JWT authentication with refresh token
- [ ] Forgot password / reset via email link
- [ ] Employee invitation by email (HR sends invite → employee sets password)
- [ ] Role-based route protection (React Router guards)

### Module 2 — Dashboard
- [ ] Role-specific dashboard (Admin sees all, Manager sees team, Employee sees self)
- [ ] KPI cards: Total Employees, Present Today, On Leave, Pending Approvals
- [ ] Monthly attendance rate chart (line chart)
- [ ] Department headcount distribution (pie/donut chart)
- [ ] Monthly payroll cost trend (bar chart)
- [ ] Recent activity feed (latest leave requests, new hires)
- [ ] Quick action buttons (Add Employee, Generate Payroll, etc.)

### Module 3 — Department Management
- [ ] List all departments with employee count
- [ ] Create new department
- [ ] Assign department head (manager)
- [ ] Edit department name/head
- [ ] Delete department (with validation — can't delete if employees assigned)

### Module 4 — Employee Management
- [ ] Employee directory (searchable, filterable by dept/status)
- [ ] Employee profile page with all details
- [ ] Add new employee form (personal info, contact, department, role, salary)
- [ ] Edit employee details
- [ ] Change employment status (Active / On Leave / Terminated)
- [ ] Auto-generate Employee ID per company (e.g., ACM-0045)
- [ ] Document section on profile (CNIC, contract — upload)

### Module 5 — Attendance Management
- [ ] Employee: Clock In button (disabled if already clocked in)
- [ ] Employee: Clock Out button (shows time elapsed since clock in)
- [ ] Admin/Manager: View attendance log with date filters
- [ ] Color-coded attendance status: Present (green), Absent (red), Late (amber), On Leave (blue)
- [ ] Monthly attendance calendar heatmap per employee
- [ ] Attendance summary report (total present days, late days, absences per month)
- [ ] Late arrival flagging (if clock in after 9:00 AM or company-set time)

### Module 6 — Leave Management
- [ ] Leave types: Annual, Sick, Casual, Unpaid, Maternity/Paternity
- [ ] Leave balance tracker per employee (remaining vs. used per type)
- [ ] Employee: Submit leave request form (type, date range, reason)
- [ ] Manager/Admin: View all pending requests with approve/reject buttons
- [ ] Manager: Add comment when rejecting
- [ ] Status pipeline: Pending → Approved / Rejected
- [ ] Company-wide leave calendar (shows who is on leave on which days)
- [ ] Email notification on approval/rejection (Nodemailer)

### Module 7 — Payroll Management
- [ ] Salary structure per employee (base salary, allowances, deductions)
- [ ] Generate monthly payroll (Admin selects month/year, system computes)
- [ ] Payroll computation: Net = Base + Allowances - Deductions - Unpaid Leave Deductions
- [ ] Payroll summary table (all employees, gross, deductions, net)
- [ ] Individual payslip view (professional formatted layout)
- [ ] PDF export of payslip (print/download)
- [ ] Total payroll cost shown per month
- [ ] Payroll history (past months)

### Module 8 — Notifications
- [ ] In-app notification bell with unread count badge
- [ ] Notification types: Leave approved, Leave rejected, Payroll generated, New employee added
- [ ] Mark as read / Mark all as read
- [ ] Notification list dropdown panel

### Module 9 — Company Settings
- [ ] Edit company profile (name, logo, industry, address)
- [ ] Set work hours / late arrival threshold
- [ ] Manage subscription plan (view current, see upgrade options)
- [ ] Invite new users

### Module 10 — Super Admin Panel
- [ ] View all registered companies
- [ ] Company cards: name, plan, employee count, registration date
- [ ] Platform stats: total tenants, total employees across platform
- [ ] Deactivate / reactivate a tenant

---

## 5. SCREEN-BY-SCREEN UI SPECIFICATION

> This section defines every screen, its purpose, layout, and key components — designed to guide Google Stitch in generating the frontend.

---

### SCREEN 1 — Landing Page (Public)
**Route:** `/`
**Purpose:** Marketing page for WorkNest product

**Sections:**
1. **Hero Section**
   - Headline: "HR Management, Simplified for Every Team"
   - Subtext: Short value proposition
   - Two CTA buttons: "Get Started Free" → `/register` | "Sign In" → `/login`
   - Hero illustration or dashboard mockup screenshot

2. **Features Section**
   - 6 feature cards in a grid: Employee Management, Attendance Tracking, Leave Management, Payroll, Analytics, Multi-Company Support
   - Each card: icon + title + 2-line description

3. **Pricing Section**
   - 3 pricing cards side by side: Starter (Free), Growth ($29/mo), Enterprise ($99/mo)
   - Feature checklist per plan, CTA button per card

4. **How It Works Section**
   - 3-step process: 1. Register Company → 2. Add Employees → 3. Manage Everything
   - Step numbers with icons and descriptions

5. **Footer**
   - Logo, tagline, navigation links, copyright

**Design Direction:** Clean, professional SaaS style. Use deep navy blue (#0F172A) and electric indigo (#6366F1) as brand colors.

---

### SCREEN 2 — Company Registration Page
**Route:** `/register`
**Purpose:** New company signs up → tenant is created automatically

**Form Fields:**
- Company Name (required)
- Industry (dropdown: Technology, Manufacturing, Healthcare, Retail, Education, Other)
- Company Size (dropdown: 1-10, 11-50, 51-200, 200+)
- Admin Full Name (required)
- Admin Email (required, unique)
- Password (required, min 8 chars)
- Confirm Password
- Terms & Conditions checkbox

**UI Elements:**
- Left side: Branding/illustration panel (50% width)
- Right side: Registration form (50% width)
- "Already have an account? Sign In" link at bottom
- Submit button: "Create Your Workspace"
- Success state: "Your WorkNest workspace is ready! Redirecting to dashboard..."

---

### SCREEN 3 — Login Page
**Route:** `/login`
**Purpose:** All users (all roles) log in here

**Form Fields:**
- Email address
- Password (with show/hide toggle)
- "Forgot Password?" link

**UI Elements:**
- Same split layout as registration (branding left, form right)
- "Sign In" primary button
- "Don't have an account? Register your company" link
- Error state: Red alert box "Invalid email or password"

---

### SCREEN 4 — Forgot Password Page
**Route:** `/forgot-password`
**Form:** Email input → "Send Reset Link" button
**Confirmation state:** "Check your email for a reset link"

---

### SCREEN 5 — Set Password Page (Employee Invite)
**Route:** `/set-password?token=xxx`
**Purpose:** New employee clicks invite link, sets their password for first time

**Form Fields:**
- Full Name (pre-filled, read-only)
- Email (pre-filled, read-only)
- Password
- Confirm Password
- "Activate Account" button

---

### SCREEN 6 — Main App Shell (Authenticated Layout)
**Purpose:** Persistent layout wrapper for all authenticated screens

**Layout Structure:**
```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (left, 240px fixed)                        │
│  ┌──────────────────────────────────────────────┐   │
│  │ WorkNest Logo + Company Name                 │   │
│  │ ─────────────────────────────────────────    │   │
│  │ 🏠 Dashboard                                 │   │
│  │ 🏢 Departments                               │   │
│  │ 👥 Employees                                 │   │
│  │ 🕐 Attendance                                │   │
│  │ 🌴 Leave Requests                            │   │
│  │ 💰 Payroll                                   │   │
│  │ ─────────────────────────────────────────    │   │
│  │ ⚙️ Settings                                  │   │
│  │ 🚪 Logout                                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  TOPBAR (right, full width minus sidebar)           │
│  [ Search bar ]        [ 🔔 Bell ] [ Avatar Menu ]  │
│                                                      │
│  MAIN CONTENT AREA                                   │
│  (changes per route)                                 │
└─────────────────────────────────────────────────────┘
```

**Sidebar behavior:**
- Active link highlighted with indigo background
- Collapsed to icon-only on mobile (hamburger toggle)
- Role-based menu items (Manager doesn't see Payroll, Employee sees limited items)

**Topbar:**
- Global search bar (searches employees by name/ID)
- Notification bell with red badge (unread count)
- User avatar with dropdown: Profile, Settings, Logout

---

### SCREEN 7 — Admin Dashboard
**Route:** `/dashboard`
**Role:** Company Admin / HR Head

**Layout:**
```
Row 1 — KPI Cards (4 across)
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 👥 Total     │ │ ✅ Present   │ │ 🌴 On Leave  │ │ ⏳ Pending   │
│ Employees    │ │ Today        │ │ Today        │ │ Approvals    │
│    87        │ │    72        │ │     8        │ │     7        │
│ +3 this month│ │  82% rate    │ │              │ │ review now → │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

Row 2 — Charts (2 across)
┌───────────────────────────────┐ ┌───────────────────────────────┐
│ Monthly Attendance Rate       │ │ Department Headcount          │
│ (Line Chart - last 6 months)  │ │ (Donut Chart)                 │
└───────────────────────────────┘ └───────────────────────────────┘

Row 3 — Table + Chart (2 across)
┌───────────────────────────────┐ ┌───────────────────────────────┐
│ Recent Leave Requests         │ │ Monthly Payroll Cost          │
│ (Mini table with status tags) │ │ (Bar Chart - last 6 months)   │
└───────────────────────────────┘ └───────────────────────────────┘

Row 4 — Quick Actions
[ + Add Employee ]  [ Generate Payroll ]  [ View Reports ]  [ Invite User ]
```

---

### SCREEN 8 — Manager Dashboard
**Route:** `/dashboard`
**Role:** Manager (filtered to their department)

- KPI Cards: Team Size, Team Present Today, Team On Leave, Pending Team Leave Requests
- Team Attendance List (today's status for each team member)
- Pending Leave Requests (approve/reject inline)
- Team Attendance Chart (this week)

---

### SCREEN 9 — Employee Dashboard
**Route:** `/dashboard`
**Role:** Employee

- Welcome banner: "Good morning, Ali 👋"
- Clock In / Clock Out widget (large, prominent button)
- Today's attendance status
- Leave balance summary (Annual: 8 remaining, Sick: 5 remaining)
- Recent payslips list (last 3 months)
- Quick links: Apply Leave, View Payslip, View Profile

---

### SCREEN 10 — Department List Page
**Route:** `/departments`
**Role:** Admin only

**Layout:**
- Page header: "Departments" + "Add Department" button (top right)
- Departments in a card grid (3 per row):
  ```
  ┌───────────────────────────┐
  │ 🏢 Engineering            │
  │ Head: John Smith          │
  │ 23 Employees              │
  │ [Edit]  [Delete]          │
  └───────────────────────────┘
  ```
- Empty state: Illustration + "No departments yet. Add your first department."

**Add/Edit Department Modal:**
- Department Name field
- Select Department Head (dropdown of employees with Manager role)
- Save / Cancel buttons

---

### SCREEN 11 — Employee Directory
**Route:** `/employees`
**Role:** Admin (all), Manager (own department only)

**Layout:**
- Page header: "Employees" + "Add Employee" button + "Invite by Email" button
- Filters bar: Search by name/ID | Filter by Department | Filter by Status
- Toggle: Table view / Card view

**Table View Columns:**
Employee ID | Name + Avatar | Department | Role | Status | Join Date | Actions (View, Edit, Deactivate)

**Card View:**
```
┌──────────────────────────┐
│ [Avatar]                 │
│ Ali Raza                 │
│ ACM-0023                 │
│ Engineering              │
│ Backend Developer        │
│ 🟢 Active                │
│ [View Profile]           │
└──────────────────────────┘
```

**Status badges:**
- 🟢 Active (green)
- 🔴 Terminated (red)
- 🟡 On Leave (amber)

---

### SCREEN 12 — Add / Edit Employee Page
**Route:** `/employees/new` | `/employees/:id/edit`

**Form Sections (tabbed or stepped):**

**Tab 1 — Personal Info**
- Full Name
- Date of Birth
- Gender (dropdown)
- CNIC Number
- Personal Email
- Phone Number
- Address

**Tab 2 — Employment Info**
- Employee ID (auto-generated, shown read-only)
- Department (dropdown)
- Designation / Job Title
- Role (Employee / Manager)
- Join Date (date picker)
- Employment Type (Full-time / Part-time / Contract)
- Employment Status (Active / Inactive)

**Tab 3 — Salary Info**
- Base Salary (PKR)
- House Allowance
- Transport Allowance
- Medical Allowance
- Tax Deduction
- Other Deductions

**Tab 4 — Documents**
- Upload CNIC (front + back)
- Upload Employment Contract
- File list with view/delete options

**Action Buttons:** "Save Employee" | "Cancel"

---

### SCREEN 13 — Employee Profile Page
**Route:** `/employees/:id`

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ [Avatar - large]  Ali Raza          [Edit] [Deactivate]  │
│                   ACM-0023                                │
│                   Backend Developer · Engineering         │
│                   🟢 Active · Joined Jan 2024             │
└──────────────────────────────────────────────────────────┘

Tabs below:
[Overview] [Attendance] [Leave History] [Payslips] [Documents]
```

**Overview Tab:** Personal info, emergency contact, salary summary
**Attendance Tab:** Calendar heatmap + monthly summary table
**Leave History Tab:** Table of all leave requests with status
**Payslips Tab:** List of monthly payslips with download button
**Documents Tab:** Uploaded files

---

### SCREEN 14 — Attendance Page (Admin/Manager View)
**Route:** `/attendance`

**Layout:**
- Filter bar: Date range picker | Department dropdown | Employee search | Status filter
- Summary row: Present X | Absent X | Late X | On Leave X
- Attendance data table:

| Employee | Date | Clock In | Clock Out | Hours | Status |
|----------|------|----------|-----------|-------|--------|
| Ali Raza | 04 Aug | 08:55 AM | 05:10 PM | 8h 15m | ✅ Present |
| Sara Khan | 04 Aug | 09:25 AM | — | — | ⚠️ Late |
| John Lee | 04 Aug | — | — | — | 🌴 On Leave |

- Export CSV button (top right)

---

### SCREEN 15 — Attendance Page (Employee View)
**Route:** `/attendance` (employee role)

**Layout:**
- Large Clock In/Out widget at top:
  ```
  ┌──────────────────────────────────────┐
  │  Today: Tuesday, 4 August 2026       │
  │  Current Time: 09:02 AM              │
  │                                      │
  │         [ CLOCK IN ]                 │
  │     (disabled after clocking in)     │
  │                                      │
  │  Status: Not yet clocked in          │
  └──────────────────────────────────────┘
  ```
- This Month Summary: Present 18 | Late 2 | Absent 1
- Monthly attendance calendar (color-coded squares like GitHub contributions)
- Attendance log table (last 30 days)

---

### SCREEN 16 — Leave Requests Page (Admin/Manager View)
**Route:** `/leaves`

**Tabs:** [Pending] [Approved] [Rejected] [All]

**Pending Tab Layout:**
- Each request shown as a card:
  ```
  ┌─────────────────────────────────────────────────────┐
  │ [Avatar] Ali Raza · Engineering                     │
  │ 📅 Sick Leave: 10 Aug – 12 Aug (3 days)             │
  │ Reason: "Fever and medical appointment"              │
  │ Applied: 4 Aug 2026                                 │
  │                          [Reject ✗]  [Approve ✓]   │
  └─────────────────────────────────────────────────────┘
  ```
- Reject opens a modal with comment field before confirming
- Leave calendar view toggle (shows who is off on which days in a calendar)

---

### SCREEN 17 — Apply for Leave (Employee View)
**Route:** `/leaves/apply`

**Form:**
- Leave Type (dropdown: Annual, Sick, Casual, Unpaid, Maternity/Paternity)
- Start Date (date picker)
- End Date (date picker)
- Number of days (auto-calculated, shown read-only)
- Reason (textarea)
- "Submit Request" button

**Balance widget beside form:**
```
Your Leave Balances
─────────────────────
Annual Leave:     8 days remaining
Sick Leave:       5 days remaining
Casual Leave:     3 days remaining
```

**My Requests Table below (past requests):**
| Type | Dates | Days | Status | Applied On |
|------|-------|------|--------|------------|

---

### SCREEN 18 — Payroll Page (Admin View)
**Route:** `/payroll`

**Top Section — Payroll Generator:**
```
┌──────────────────────────────────────────────────────┐
│ Generate Payroll                                     │
│ Month: [August ▼]  Year: [2026 ▼]                   │
│                              [Generate Payroll]      │
│                                                      │
│ Total Payroll Cost for Aug 2026: PKR 1,842,500       │
└──────────────────────────────────────────────────────┘
```

**Payroll Table:**
| Employee | Department | Base | Allowances | Deductions | Net Pay | Payslip |
|----------|------------|------|------------|------------|---------|---------|
| Ali Raza | Engineering | 80,000 | 25,000 | 8,000 | 97,000 | [View] [PDF] |

- "Export All as CSV" button

---

### SCREEN 19 — Payslip View Page
**Route:** `/payroll/:employeeId/:month/:year`

**Payslip Layout (printable/exportable):**
```
╔══════════════════════════════════════════════════════╗
║  WorkNest                          PAYSLIP           ║
║  Acme Corporation                  August 2026       ║
╠══════════════════════════════════════════════════════╣
║  Employee: Ali Raza                                  ║
║  Employee ID: ACM-0023                               ║
║  Department: Engineering                             ║
║  Designation: Backend Developer                      ║
║  Join Date: 01 Jan 2024                              ║
╠════════════════════════╦═════════════════════════════╣
║  EARNINGS              ║  DEDUCTIONS                 ║
║  Base Salary  80,000   ║  Tax          5,000         ║
║  House Allow  15,000   ║  Loan         3,000         ║
║  Transport     5,000   ║                             ║
║  Medical       5,000   ║                             ║
╠════════════════════════╩═════════════════════════════╣
║  GROSS: PKR 105,000    NET PAY: PKR 97,000           ║
╚══════════════════════════════════════════════════════╝
```

- "Download PDF" button
- "Print" button

---

### SCREEN 20 — Notifications Panel
**Component:** Slide-in drawer from topbar bell icon

```
┌─────────────────────────────────────────┐
│ Notifications              [Mark all ✓] │
│ ─────────────────────────────────────── │
│ 🌴 Your leave request was approved      │
│    3 minutes ago                   🔵   │
│ ─────────────────────────────────────── │
│ 💰 August 2026 payroll has been         │
│    generated by HR                      │
│    1 hour ago                           │
│ ─────────────────────────────────────── │
│ 👤 New employee Sara Khan added         │
│    Yesterday                            │
└─────────────────────────────────────────┘
```

---

### SCREEN 21 — Company Settings Page
**Route:** `/settings`
**Role:** Admin only

**Sections (left sidebar navigation within page):**
1. **Company Profile** — Name, logo upload, industry, address, website
2. **Work Hours** — Start time, end time, late threshold time
3. **Leave Policy** — Default leave days per type per year
4. **Subscription Plan** — Current plan card, usage bar (employees used/limit), "Upgrade Plan" button
5. **Team Members** — List of all users with role badges, invite new user, deactivate user

---

### SCREEN 22 — Super Admin Panel
**Route:** `/super-admin`
**Access:** Platform owner only (separate login or flag on user)

**Dashboard:**
- KPI cards: Total Companies, Total Employees Across Platform, Active Plans, Revenue (simulated)

**Company List Table:**
| Company | Admin Email | Plan | Employees | Registered | Status | Action |
|---------|-------------|------|-----------|------------|--------|--------|
| Acme Corp | hr@acme.com | Growth | 45 | Jan 2024 | Active | [Deactivate] |

---

## 6. USER FLOWS & WORKFLOWS

### Flow 1 — Company Registration & First Login
```
User visits /register
       ↓
Fills registration form (company name, admin email, password)
       ↓
POST /api/auth/register-company
       ↓
Backend creates: Tenant record + Admin User record
       ↓
JWT token returned
       ↓
Redirected to /dashboard (empty state, guided setup)
       ↓
Onboarding checklist shown:
  ✅ Company registered
  ⬜ Add your first department
  ⬜ Add your first employee
  ⬜ Set work hours
```

---

### Flow 2 — Employee Invitation Flow
```
Admin goes to Employees page → "Invite by Email"
       ↓
Enters employee email + selects role (Employee/Manager) + department
       ↓
POST /api/auth/invite
       ↓
Backend creates user with status "pending"
System sends email via Nodemailer:
"You have been invited to WorkNest by Acme Corp. Click here to set your password."
       ↓
Employee clicks link → /set-password?token=xxx
       ↓
Employee sets full name + password
       ↓
PATCH /api/auth/activate
       ↓
Account activated → redirected to login
       ↓
Employee logs in → sees their Employee Dashboard
```

---

### Flow 3 — Daily Attendance Flow
```
Employee logs in at morning
       ↓
Dashboard shows "You haven't clocked in yet" alert
       ↓
Employee clicks [ CLOCK IN ] button
       ↓
POST /api/attendance/clockin
Backend records: employeeId, tenantId, date, clockInTime
If time > 9:00 AM → status = "Late"
If time <= 9:00 AM → status = "Present"
       ↓
Button changes to [ CLOCK OUT ] (green → red)
Timer starts showing time elapsed
       ↓
At end of day, employee clicks [ CLOCK OUT ]
       ↓
PATCH /api/attendance/clockout/:id
Backend records: clockOutTime, calculates totalHours
       ↓
Attendance record complete for the day
```

---

### Flow 4 — Leave Request Lifecycle
```
Employee navigates to Leave → Apply for Leave
       ↓
Selects type, dates, enters reason → Submits
       ↓
POST /api/leaves
Backend: creates record with status = "Pending"
Email sent to Manager: "Ali Raza has requested 3 days sick leave"
       ↓
Manager logs in → Leave Requests (Pending tab)
Manager sees request card
       ↓
Manager clicks [Approve] → PATCH /api/leaves/:id/approve
OR
Manager clicks [Reject] → Modal asks for comment
       ↓
PATCH /api/leaves/:id/reject + comment saved
       ↓
Email sent to Employee:
  Approved: "Your leave request has been approved"
  Rejected: "Your leave request was rejected. Reason: [comment]"
       ↓
In-app notification created for employee
Employee sees notification badge on bell icon
       ↓
If Approved:
  Leave balance deducted
  Company leave calendar updated
  Employee status shows "On Leave" on those dates
```

---

### Flow 5 — Monthly Payroll Generation
```
Admin navigates to Payroll page
       ↓
Selects Month: August, Year: 2026
Clicks [ Generate Payroll ]
       ↓
POST /api/payroll/generate
Backend:
  1. Fetches all active employees
  2. For each employee:
     - Reads salary structure (base + allowances + deductions)
     - Counts approved leave days (unpaid leave = extra deduction)
     - Calculates: Net = Base + Allowances - Deductions - UnpaidLeaveDeductions
  3. Creates payroll record per employee for that month
  4. Creates notification for each employee
       ↓
Payroll table rendered on page
Total cost shown: PKR X,XXX,XXX
       ↓
Admin can click [View] on any row → Payslip page
Admin can click [PDF] → Downloads formatted payslip PDF
       ↓
Each employee logs in and sees notification:
"Your payslip for August 2026 is available"
Employee goes to Dashboard → Recent Payslips → View/Download
```

---

### Flow 6 — Employee Profile Deactivation (Termination)
```
Admin goes to Employee Profile
Clicks [ Deactivate / Terminate ]
       ↓
Confirmation modal: "Are you sure you want to terminate Ali Raza?
This will prevent them from logging in."
       ↓
Confirms → PATCH /api/employees/:id/status { status: "Terminated" }
       ↓
Employee status updated in database
JWT tokens invalidated for that user
Employee can no longer log in
Data retained for records
```

---

## 7. DATABASE SCHEMA

### tenants
```json
{
  "_id": "ObjectId",
  "companyName": "Acme Corporation",
  "industry": "Technology",
  "plan": "growth",
  "employeeLimit": 50,
  "logoUrl": "https://...",
  "address": "Karachi, Pakistan",
  "workStartTime": "09:00",
  "workEndTime": "17:00",
  "createdAt": "2026-01-15T00:00:00Z",
  "isActive": true
}
```

### users
```json
{
  "_id": "ObjectId",
  "tenantId": "ObjectId",
  "name": "Ali Raza",
  "email": "ali@acme.com",
  "password": "hashed",
  "role": "admin | manager | employee",
  "status": "active | pending | inactive",
  "inviteToken": "string | null",
  "createdAt": "2026-01-15T00:00:00Z"
}
```

### employees
```json
{
  "_id": "ObjectId",
  "tenantId": "ObjectId",
  "userId": "ObjectId",
  "employeeId": "ACM-0023",
  "departmentId": "ObjectId",
  "designation": "Backend Developer",
  "phone": "+92 300 0000000",
  "cnic": "42101-XXXXXXX-X",
  "dob": "2000-01-01",
  "gender": "male",
  "address": "Karachi",
  "joiningDate": "2024-01-01",
  "employmentType": "full-time",
  "employmentStatus": "active | terminated | on-leave",
  "salary": {
    "base": 80000,
    "houseAllowance": 15000,
    "transportAllowance": 5000,
    "medicalAllowance": 5000,
    "taxDeduction": 5000,
    "otherDeductions": 3000
  },
  "documents": [
    { "type": "cnic", "url": "https://..." },
    { "type": "contract", "url": "https://..." }
  ],
  "createdAt": "2026-01-15T00:00:00Z"
}
```

### departments
```json
{
  "_id": "ObjectId",
  "tenantId": "ObjectId",
  "name": "Engineering",
  "headId": "ObjectId (userId)",
  "createdAt": "2026-01-15T00:00:00Z"
}
```

### attendance
```json
{
  "_id": "ObjectId",
  "tenantId": "ObjectId",
  "employeeId": "ObjectId",
  "date": "2026-08-04",
  "clockIn": "2026-08-04T08:55:00Z",
  "clockOut": "2026-08-04T17:10:00Z",
  "totalHours": 8.25,
  "status": "present | late | absent | on-leave",
  "createdAt": "2026-08-04T08:55:00Z"
}
```

### leaveRequests
```json
{
  "_id": "ObjectId",
  "tenantId": "ObjectId",
  "employeeId": "ObjectId",
  "type": "annual | sick | casual | unpaid | maternity",
  "fromDate": "2026-08-10",
  "toDate": "2026-08-12",
  "totalDays": 3,
  "reason": "Fever and medical appointment",
  "status": "pending | approved | rejected",
  "managerComment": "",
  "reviewedBy": "ObjectId | null",
  "reviewedAt": "Date | null",
  "appliedAt": "2026-08-04T09:00:00Z"
}
```

### leaveBalances
```json
{
  "_id": "ObjectId",
  "tenantId": "ObjectId",
  "employeeId": "ObjectId",
  "year": 2026,
  "annual": { "total": 20, "used": 12, "remaining": 8 },
  "sick": { "total": 10, "used": 5, "remaining": 5 },
  "casual": { "total": 6, "used": 3, "remaining": 3 },
  "unpaid": { "total": 999, "used": 0, "remaining": 999 }
}
```

### payroll
```json
{
  "_id": "ObjectId",
  "tenantId": "ObjectId",
  "employeeId": "ObjectId",
  "month": 8,
  "year": 2026,
  "baseSalary": 80000,
  "allowances": {
    "house": 15000,
    "transport": 5000,
    "medical": 5000
  },
  "deductions": {
    "tax": 5000,
    "other": 3000,
    "unpaidLeave": 0
  },
  "grossSalary": 105000,
  "netSalary": 97000,
  "generatedAt": "2026-08-01T00:00:00Z",
  "generatedBy": "ObjectId (adminUserId)"
}
```

### notifications
```json
{
  "_id": "ObjectId",
  "tenantId": "ObjectId",
  "userId": "ObjectId",
  "type": "leave_approved | leave_rejected | payroll_generated | employee_added",
  "message": "Your leave request has been approved",
  "isRead": false,
  "createdAt": "2026-08-04T09:00:00Z"
}
```

---

## 8. COMPLETE API SPECIFICATION

### Base URL: `/api`

### Authentication Routes
| Method | Route | Role | Description |
|--------|-------|------|-------------|
| POST | /auth/register-company | Public | Register new company + admin |
| POST | /auth/login | Public | Login all users |
| POST | /auth/invite | Admin | Invite employee by email |
| POST | /auth/set-password | Public | Employee activates account |
| POST | /auth/forgot-password | Public | Request password reset link |
| POST | /auth/reset-password | Public | Reset password with token |
| POST | /auth/refresh-token | Auth | Refresh JWT access token |
| POST | /auth/logout | Auth | Invalidate token |

### Employee Routes
| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | /employees | Admin, Manager | List all employees (tenant-scoped) |
| GET | /employees/:id | Admin, Manager | Single employee profile |
| POST | /employees | Admin | Create new employee |
| PUT | /employees/:id | Admin | Full update employee |
| PATCH | /employees/:id/status | Admin | Change status (activate/terminate) |
| DELETE | /employees/:id | Admin | Delete employee record |

### Department Routes
| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | /departments | Admin, Manager | List all departments |
| GET | /departments/:id | Admin | Department details |
| POST | /departments | Admin | Create department |
| PUT | /departments/:id | Admin | Update department |
| DELETE | /departments/:id | Admin | Delete department |

### Attendance Routes
| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | /attendance | Admin, Manager | Attendance log (filterable) |
| GET | /attendance/me | Employee | Own attendance |
| GET | /attendance/:employeeId | Admin, Manager | Specific employee attendance |
| POST | /attendance/clockin | Employee | Clock in |
| PATCH | /attendance/clockout/:id | Employee | Clock out |

### Leave Routes
| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | /leaves | Admin, Manager | All leave requests |
| GET | /leaves/me | Employee | Own leave requests + balance |
| POST | /leaves | Employee | Submit leave request |
| PATCH | /leaves/:id/approve | Admin, Manager | Approve leave |
| PATCH | /leaves/:id/reject | Admin, Manager | Reject with comment |
| DELETE | /leaves/:id | Employee | Cancel pending request |

### Payroll Routes
| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | /payroll | Admin | All payroll records (filterable by month/year) |
| GET | /payroll/me | Employee | Own payslips |
| GET | /payroll/:employeeId/:month/:year | Admin, Employee | Single payslip |
| POST | /payroll/generate | Admin | Generate payroll for month |
| GET | /payroll/export/csv | Admin | Export payroll as CSV |

### Notifications Routes
| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | /notifications | All | Get notifications |
| PATCH | /notifications/:id/read | All | Mark single as read |
| PATCH | /notifications/read-all | All | Mark all as read |

### Dashboard Routes
| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | /dashboard/stats | Admin | All KPIs + chart data in one call |
| GET | /dashboard/team-stats | Manager | Team-level KPIs |

### Company Settings Routes
| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | /settings | Admin | Company profile |
| PUT | /settings | Admin | Update company profile |
| PATCH | /settings/work-hours | Admin | Update work time settings |

### Super Admin Routes (prefix: `/super`)
| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | /super/tenants | Super Admin | All companies |
| GET | /super/stats | Super Admin | Platform-level stats |
| PATCH | /super/tenants/:id/deactivate | Super Admin | Deactivate a company |

---

## 9. DESIGN SYSTEM (For Google Stitch)

### 9.1 Brand Colors
```
Primary:       #6366F1  (Indigo 500)
Primary Dark:  #4F46E5  (Indigo 600)
Background:    #0F172A  (Slate 900) — dark sidebar
Surface:       #FFFFFF  (White) — main content area
Surface Alt:   #F8FAFC  (Slate 50) — page background
Border:        #E2E8F0  (Slate 200)

Status Colors:
Success:       #10B981  (Emerald 500)
Warning:       #F59E0B  (Amber 500)
Error:         #EF4444  (Red 500)
Info:          #3B82F6  (Blue 500)

Text Primary:  #1E293B  (Slate 800)
Text Secondary:#64748B  (Slate 500)
Text Muted:    #94A3B8  (Slate 400)
```

### 9.2 Typography
```
Font Family: Inter (Google Fonts)

Headings:
  H1: 30px, Bold (700)
  H2: 24px, SemiBold (600)
  H3: 20px, SemiBold (600)
  H4: 16px, SemiBold (600)

Body:
  Regular: 14px, Regular (400)
  Small: 12px, Regular (400)
  
Labels: 12px, Medium (500), UPPERCASE, letter-spacing 0.5px
```

### 9.3 Component Styles
```
Border Radius:
  Cards:   12px
  Buttons: 8px
  Inputs:  8px
  Badges:  full (9999px)

Shadows:
  Card:   0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
  Modal:  0 20px 60px rgba(0,0,0,0.15)
  Dropdown: 0 10px 40px rgba(0,0,0,0.12)

Sidebar:
  Background: #0F172A (dark navy)
  Active item: #6366F1 (indigo) with white text
  Inactive item: #94A3B8 text, transparent background
  Width: 240px

Topbar:
  Background: #FFFFFF
  Border bottom: 1px solid #E2E8F0
  Height: 64px

Content area background: #F8FAFC
```

### 9.4 Key UI Components List
1. **KPI Card** — Icon, title, large number, trend badge (↑ +3%)
2. **Data Table** — Striped rows, sortable columns, pagination, action menu per row
3. **Status Badge** — Colored pill: green/red/amber/blue
4. **Modal Dialog** — Overlay, title, content, Cancel + Confirm buttons
5. **Form Input** — Label, input field, helper text, error state
6. **Dropdown Select** — Searchable where options are many
7. **Date Picker** — Inline calendar component
8. **Tab Navigation** — Underline-style tabs
9. **Notification Drawer** — Slide-in from right
10. **Leave Request Card** — Employee info, dates, reason, approve/reject buttons
11. **Attendance Calendar** — Heatmap grid (green/red/amber per day)
12. **Payslip Layout** — Print-friendly, two-column earnings/deductions table
13. **Chart Components** — Line, Bar, Donut using Recharts
14. **Avatar** — Circle with initials fallback when no image
15. **Empty State** — Illustration + heading + CTA button
16. **Breadcrumb** — Navigation trail at top of content area
17. **Sidebar Nav Item** — Icon + label + optional badge

---

## 10. FOLDER STRUCTURE

```
worknest/
│
├── frontend/                          (React JS — Vite)
│   ├── public/
│   │   └── worknest-logo.svg
│   ├── src/
│   │   ├── assets/                    (images, icons)
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Topbar.jsx
│   │   │   │   ├── KPICard.jsx
│   │   │   │   ├── DataTable.jsx
│   │   │   │   ├── StatusBadge.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── FormInput.jsx
│   │   │   │   ├── Avatar.jsx
│   │   │   │   ├── EmptyState.jsx
│   │   │   │   └── Loader.jsx
│   │   │   ├── dashboard/
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── ManagerDashboard.jsx
│   │   │   │   └── EmployeeDashboard.jsx
│   │   │   ├── employees/
│   │   │   │   ├── EmployeeCard.jsx
│   │   │   │   ├── EmployeeTable.jsx
│   │   │   │   └── EmployeeForm.jsx
│   │   │   ├── attendance/
│   │   │   │   ├── ClockWidget.jsx
│   │   │   │   └── AttendanceCalendar.jsx
│   │   │   ├── leaves/
│   │   │   │   ├── LeaveRequestCard.jsx
│   │   │   │   └── LeaveBalance.jsx
│   │   │   ├── payroll/
│   │   │   │   ├── PayrollTable.jsx
│   │   │   │   └── Payslip.jsx
│   │   │   └── notifications/
│   │   │       └── NotificationDrawer.jsx
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx        (current user, token, role)
│   │   │   └── NotificationContext.jsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useApi.js
│   │   │   └── useNotifications.js
│   │   │
│   │   ├── pages/
│   │   │   ├── public/
│   │   │   │   ├── Landing.jsx
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   ├── ForgotPassword.jsx
│   │   │   │   └── SetPassword.jsx
│   │   │   ├── app/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Departments.jsx
│   │   │   │   ├── Employees.jsx
│   │   │   │   ├── EmployeeDetail.jsx
│   │   │   │   ├── AddEditEmployee.jsx
│   │   │   │   ├── Attendance.jsx
│   │   │   │   ├── Leaves.jsx
│   │   │   │   ├── ApplyLeave.jsx
│   │   │   │   ├── Payroll.jsx
│   │   │   │   ├── PayslipView.jsx
│   │   │   │   └── Settings.jsx
│   │   │   └── super/
│   │   │       └── SuperAdminPanel.jsx
│   │   │
│   │   ├── routes/
│   │   │   ├── AppRoutes.jsx          (main router)
│   │   │   ├── ProtectedRoute.jsx     (requires login)
│   │   │   └── RoleRoute.jsx          (requires specific role)
│   │   │
│   │   ├── services/                  (axios API calls)
│   │   │   ├── api.js                 (axios instance, interceptors)
│   │   │   ├── authService.js
│   │   │   ├── employeeService.js
│   │   │   ├── attendanceService.js
│   │   │   ├── leaveService.js
│   │   │   ├── payrollService.js
│   │   │   └── departmentService.js
│   │   │
│   │   ├── utils/
│   │   │   ├── formatDate.js
│   │   │   ├── formatCurrency.js
│   │   │   └── roleHelpers.js
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/                           (Node.js + Express JS)
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                  (mysql connection)
│   │   │   └── env.js                 (environment config)
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js                (JWT verify)
│   │   │   ├── tenantScope.js         (inject tenantId from JWT)
│   │   │   ├── roleGuard.js           (role permission check)
│   │   │   └── errorHandler.js        (global error handler)
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── auth.controller.js
│   │   │   │   └── auth.service.js
│   │   │   ├── employees/
│   │   │   │   ├── employee.routes.js
│   │   │   │   ├── employee.controller.js
│   │   │   │   ├── employee.service.js
│   │   │   │   └── employee.model.js
│   │   │   ├── departments/
│   │   │   ├── attendance/
│   │   │   ├── leaves/
│   │   │   ├── payroll/
│   │   │   ├── notifications/
│   │   │   ├── dashboard/
│   │   │   ├── settings/
│   │   │   └── super/
│   │   │
│   │   └── app.js
│   │
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

## 11. ENVIRONMENT VARIABLES

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000/api
```

### Backend (.env)
```
PORT=5000
sql_URI=sql://localhost:27017/worknest
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 12. EVALUATION COVERAGE CHECKLIST

| Assignment Requirement | WorkNest Coverage |
|------------------------|------------------|
| React Functional Components | ✅ All components |
| React Hooks (useState, useEffect) | ✅ Throughout |
| Props & Component Structure | ✅ Full component architecture |
| Forms & Validation | ✅ Registration, Employee, Leave, Payroll |
| State Management (Context API) | ✅ AuthContext, NotificationContext |
| Conditional Rendering | ✅ Role-based UI, empty states |
| React Router | ✅ With protected + role routes |
| API Integration | ✅ Full Axios service layer |
| GET API | ✅ Employees, Attendance, Payroll, etc. |
| POST API | ✅ Create employee, leave request, etc. |
| PUT API | ✅ Full employee update |
| PATCH API | ✅ Status update, clock out, approve leave |
| DELETE API | ✅ Remove employee, cancel leave |
| HTTP Status Codes | ✅ 200, 201, 400, 401, 403, 404, 500 |
| Error Handling | ✅ Global middleware + frontend error states |
| Database Integration | ✅ sql  |
| Authentication | ✅ JWT with role-based access |
| Admin Panel | ✅ Full Company Admin + Super Admin |
| Search & Filter | ✅ Employee directory |
| Dashboard | ✅ Role-specific dashboards with charts |
| README | ✅ To be written with setup instructions |

---

*Document prepared for WorkNest EADS26 Semester Project.*
*Student: Ali Raza — Sukkur IBA University (2021–2026)*
*Internship Context: Backend Developer — Continental Biscuits Limited (CBL)*
