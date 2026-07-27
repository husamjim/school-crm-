# GMIS School Marketing CRM - Production Grade Architecture

A high-performance, secure, and production-ready Marketing CRM designed specifically for schools and educational institutions. Includes automated admissions tracking, multi-channel messaging (WhatsApp, Meta/Facebook, Instagram, Web), Google Drive student document synchronization, analytics, and automated testing suites.

---

## 🚀 Key Features & Architecture

- **Full Pipeline CRM**: Kanban and Table views for student leads, stage transitions, assignment to admissions staff, and PDF Dossier rendering.
- **Multi-Channel Integrations**: Unified inbox and webhooks for WhatsApp Business, Facebook Messenger, Instagram Direct, and Web forms.
- **Security & Authorization**: JWT Token Authentication, Role-Based Access Control (Admin/Agent), Rate-Limiting, and Security Headers.
- **Master Data Import Engine**: Bulk CSV/JSON import parser (`server/services/masterDataImporter.js`) supporting master data files with 100% schema alignment and no data loss.
- **Performance Optimized**: SQLite indexed schema, single-query aggregations for analytics, dynamic asset pre-loading, and zero N+1 database queries.
- **Automated Testing Suite**: Built-in backend integration tests and k6 load testing scripts.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm or yarn

### Installation
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### Running Locally
```bash
# Start backend server
cd server
npm start

# In another terminal, start frontend dev server
npm run dev
```

---

## 🧪 Testing & Quality Assurance

### Run Unit & API Integration Tests
```bash
cd server
npm test
```

### Run k6 Performance Load Simulation
```bash
node server/tests/k6_sim.js
```
Or using the k6 CLI:
```bash
k6 run k6/load-test.js
```

### Build Production Bundle
```bash
npm run build
```

---

## 📦 Deployment

### Deploy to Vercel
The project includes a production-ready `vercel.json` for serverless deployment:
```bash
vercel --prod
```

---

## 📄 License
Licensed under the [MIT License](LICENSE).
