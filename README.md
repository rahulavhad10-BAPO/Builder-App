# BUILDER OPERATIONS COMMAND CENTER

An enterprise-grade, full-stack ERP and Command Center built from scratch for real-estate builders, project directors, site engineers, finance controllers, procurement officers, and CRM collections teams.

---

## 🏗️ Architecture Overview

The application features clean decoupling across 10 functional layers:

1. **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4 + Lucide Icons + Recharts
2. **Backend / API**: Express 5 + Node.js + TypeScript with modular service-repository pattern
3. **Database**: Relational SQLite via Prisma ORM 5.22 (fully portable to PostgreSQL by updating `provider = "postgresql"` in `schema.prisma`)
4. **Authentication**: JWT authentication with bcrypt password hashing and 7-day session validity
5. **Authorization / RBAC**: Granular permissions matrix (`document.view`, `document.upload`, `document.delete`, `po.create`, `po.verify`, `compliance.edit`, `flat.view`, `payment.create`, `demand.remind`, etc.) enforced on backend API endpoints (HTTP 403 Forbidden on direct unauthorized API calls)
6. **File & Object Storage**: Local file storage abstraction with multer, dedicated storage reference, version history, and ready for S3/GCS adapters
7. **Business Services**:
   - `DocumentService`: Metadata, file reference, version increments, lifecycle, and permissions
   - `MaterialInventoryService`: Dynamic stock balance derived from transactions (Opening, Receipt, Issue, Adjustment, Transfer)
   - `MaterialDemandService`: Milestone requests, dynamic overdue evaluation, and automated email alerts
   - `ProcurementService & POVerificationEngine`: Mismatch detection (Quantity mismatch, Over-ordering, Duplicate POs) with database exception logging
   - `BOQService`: Planned vs Consumed quantity tracking, quantity variance, and cost variance
   - `ComplianceService`: Statutory checklist (RERA, Fire NOC, Environment, Labour, Quality) with dynamic compliance % excluding `NOT_APPLICABLE`
   - `FlatInventoryService`: Dedicated real-estate unit domain (Available -> Blocked -> Booked -> Agreement -> Demand Created -> Payment -> Possession -> Registration)
   - `Flat360Service`: 8-tab commercial view (Overview, Payment Summary, Payment History, Demand History, Upcoming Demands, Reminder History, Documents, Notes)
   - `DemandEngine & PaymentAllocationService`: Construction milestone payment demands, dynamic demand status engine, and multi-demand waterfall payment allocation
   - `DemandReminderEngine`: Idempotent automated reminder dispatcher (-7d, -3d, 0d, +3d, +7d) with customer email and internal CCs
   - `ContractorService`: Dynamic performance score calculated from actual site issues resolution rate and BOQ deviations
   - `OperationsService`: Daily Progress Reports (DPR), Monthly Audits, MOM & Action items, Site Issues/Snags/RFIs, Channel Partner Broker intelligence
8. **Notification & Email Service**: DB logging in `EmailLog` and `Notification` with CC lookup from system settings (never hardcoded)
9. **Ask Project (Structured Operational Engine)**: Live DB query evaluator answering questions on overdue demands, unit milestones (e.g. Unit A-1204), available units, PO anomalies, and compliance scores
10. **Provider-Agnostic AI & RAG Abstraction**: Provider adapter architecture (`IRAGProvider`, `GoogleRAGProvider`, `PineconeProvider`, `VertexAISearchProvider`). Operates in pure operational mode with `RAG_ENABLED=false`, returning non-hallucinatory notices for unstructured queries.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js >= v18
- npm

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed       # Seeds 2 projects, towers, 24 units, demands, POs, compliance, contractors, etc.
npm run start      # Runs backend on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev        # Runs frontend on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## 👥 Seed Accounts & RBAC Roles

Password for all accounts: **`Admin@123`**

| Role | Email | Key Permissions |
|---|---|---|
| **Super Admin** | `admin@builderops.com` | Full Administrative Access (`*`) |
| **Builder Admin** | `builder.admin@builderops.com` | All operational and managerial modules |
| **Project Manager** | `pm@builderops.com` | Documents, drawings, contractors, BOQ, issues |
| **Site Engineer** | `engineer@builderops.com` | DPRs, material inventory, snags, drawing viewing |
| **Procurement** | `procurement@builderops.com` | POs, vendors, demands, PO exceptions |
| **Finance** | `finance@builderops.com` | Payments, demand reminders, collection ledger |
| **Sales Executive** | `sales@builderops.com` | Units, customer bookings, broker intelligence |
| **Compliance Manager** | `compliance@builderops.com` | Statutory approvals, RERA, fire safety NOC |
| **Contractor** | `contractor@builderops.com` | Drawings, assigned site issues, meeting actions |
| **CRM/Collections** | `crm@builderops.com` | Customer ledger, payment receipts, demand notices |
| **Broker** | `broker@builderops.com` | Unit availability, booking commission tracking |

> **Tip**: Use the **Role Switcher** in the header to instantly switch personas and test RBAC permissions live.

---

## 🧪 Testing & Verification

Run the end-to-end test suite covering all 37 verification points:
```bash
cd backend
npx tsx src/e2e-test.ts
```

Output:
```
===============================================================
 RUNNING BUILDER OPERATIONS COMMAND CENTER E2E TEST SUITE
===============================================================
[PASS] Super Admin has document.delete
[PASS] Contractor is FORBIDDEN from document.delete
[PASS] Dynamic compliance percentage is calculated (77.8%)
[PASS] PO Verification Engine detected quantity mismatch exceptions
[PASS] Overdue material demand correctly marked (MD-2024-0089)
[PASS] Flat Master has 24 property units
[PASS] Structured query routed to Relational DB
[PASS] Returned clean non-hallucinatory notice: "AI/RAG is not configured yet."
[PASS] Complete Flat Commercial Lifecycle Simulation (Available -> Booked -> Agreement -> Demand -> Partial Payment -> Reminder -> Overdue -> Paid)
===============================================================
 E2E TEST SUMMARY: 37 PASSED, 0 FAILED
===============================================================
```

---

## 📦 Production Build & DEV Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build     # Outputs to frontend/dist

# Build backend
cd ../backend
npx tsc           # Outputs to backend/dist
```

### DEV / Cloud Deployment Instructions
1. **Environment Variables**:
   Configure `.env` in `backend/`:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://user:password@db-host:5432/builder_command_center?schema=public"
   JWT_SECRET="<generate_secure_random_key>"
   RAG_ENABLED=false
   NODE_ENV=production
   STORAGE_DIR="/var/data/uploads"
   FRONTEND_URL="https://dev-commandcenter.yourdomain.com"
   ```
2. **Database Migration to PostgreSQL**:
   Update `backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
   Run: `npx prisma migrate deploy && npm run seed`
3. **Reverse Proxy (Nginx / Cloudflare)**:
   - Route `/api` and `/uploads` to backend port 5000
   - Serve `frontend/dist` static SPA files with fallback to `index.html`
