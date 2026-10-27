# Zync ⚡

An automated API health monitoring and real-time incident tracking platform. Zync continuously executes background HTTP ping cycles, tracks latency performance metrics, logs outages, and manages automated incident lifecycle states with live WebSocket synchronization.

[![Live App](https://img.shields.io/badge/Live%20App-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://zync-monitor.vercel.app)
[![API Backend](https://img.shields.io/badge/API-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://zync-backend-cosy.onrender.com/api/health)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/cloud/atlas)

---

## 🌟 Key Features

- **⚡ Real-Time WebSockets:** Instant UI state updates for ping metrics, latency shifts, and incident status changes powered by Socket.io.
- **🚨 Incident Lifecycle Engine:** Automated incident creation on check failure, deduplication to prevent alert spam, and automatic incident resolution upon endpoint recovery.
- **📈 Response Time Analytics:** Interactive sparkline charts rendering historical latency trends per monitor.
- **🔒 Hardened Authentication:** Cross-domain JWT session management utilizing `HttpOnly`, `Secure`, and `SameSite=None` cookie security policies.
- **⏱️ Background Heartbeat Scheduler:** In-process non-blocking ping worker executing target URL checks on configured intervals (30s, 60s, etc.).
- **🛡️ Production Ready Infrastructure:** Hardened with Helmet security headers, proxy trust configuration, CORS guardrails, and UptimeRobot keep-alive integration.

---

## 🛠️ Tech Stack

### Frontend (`zync-client`)
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **Real-Time:** Socket.io-client
- **HTTP Client:** Axios (`withCredentials: true`)
- **Icons:** Lucide React

### Backend (`zync-server`)
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database:** MongoDB Atlas via Mongoose
- **Real-Time Server:** Socket.io
- **Security:** Helmet, CORS, Cookie-Parser, JsonWebToken, bcryptjs

---

## 📂 Project Structure

```text
Zync/
├── zync-client/                  # Frontend SPA (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/           # UI components (MonitorCard, IncidentList, etc.)
│   │   ├── context/              # AuthContext & Socket lifecycle management
│   │   ├── services/             # Axios API client setup
│   │   └── pages/                # Route pages (Dashboard, Login, Register)
│   ├── package.json
│   └── vite.config.js
├── zync-server/                  # Backend REST API + Socket.io Server
│   ├── config/                   # MongoDB database connection
│   ├── controllers/              # Auth, Monitor, and Incident logic
│   ├── middleware/               # Auth guard (protect) & error handlers
│   ├── models/                   # Mongoose Schemas (User, Monitor, Incident, PingLog)
│   ├── routes/                   # Express route definitions
│   ├── services/                 # Scheduler engine & health checker
│   ├── server.js                 # Entry point & socket listener
│   └── package.json
├── DEPLOYMENT.md                 # Production deployment runbook
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB instance (Local or Atlas URI)

### 1. Clone the Repository
```bash
git clone [https://github.com/Aaryan-SST/Zync.git](https://github.com/Aaryan-SST/Zync.git)
cd Zync
```

### 2. Backend Setup
```bash
cd zync-server
npm install
```

Create a `.env` file inside `zync-server/`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/zync
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
In a new terminal window:
```bash
cd zync-client
npm install
```

Create a `.env` file inside `zync-client/`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the Vite development server:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status check | No |
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT cookie | No |
| `POST` | `/api/auth/logout` | Clear authentication cookie | Yes |
| `GET` | `/api/auth/me` | Fetch current session profile | Yes |
| `GET` | `/api/monitors` | List all user monitors | Yes |
| `POST` | `/api/monitors` | Create a new monitor target | Yes |
| `PUT` | `/api/monitors/:id` | Update monitor configurations | Yes |
| `DELETE` | `/api/monitors/:id` | Delete a monitor | Yes |
| `GET` | `/api/incidents` | Fetch incident history logs | Yes |

---

## 🌐 Live Production Deployments

- **Frontend Application:** [https://zync-monitor.vercel.app](https://zync-monitor.vercel.app)
- **Backend Service:** [https://zync-backend-cosy.onrender.com](https://zync-backend-cosy.onrender.com)
- **Database:** MongoDB Atlas Managed Cluster
- **Uptime Monitoring:** UptimeRobot HTTP keep-alive ping on `/api/health`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

Developed by **[Aaryan Gulnar](https://github.com/Aaryan-SST)**
