# Zync Dual-Cloud Deployment Runbook (Render + Vercel + MongoDB Atlas)

This runbook covers the end-to-end production deployment and hardening for the **Zync** full-stack automated API health monitoring and incident tracking platform.

---

## 1. System Architecture & Topology

- **Frontend:** Single Page Application (React, Vite, Tailwind CSS, Recharts) hosted on **Vercel**
  - Production Domain: `https://zync-monitor.vercel.app`
- **Backend:** Node.js ESM Express API, Socket.io server, and in-process Heartbeat Ping Scheduler hosted on **Render**
  - Production Domain: `https://zync-backend.onrender.com`
- **Database:** MongoDB Atlas Managed Mongoose Cluster
- **Authentication:** Cross-site `httpOnly`, `Secure`, `SameSite=None` JWT session cookie.

---

## 2. Step-by-Step Manual Dashboard Instructions

Execute these steps in order across MongoDB Atlas, Render, and Vercel.

### Step A: MongoDB Atlas Setup

1. **Log in to MongoDB Atlas** at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Create a Dedicated Least-Privilege Database User:**
   - Navigate to **Security → Database Access**.
   - Click **Add New Database User**.
   - Select **Password Authentication**.
   - Username: `zync-prod-user`
   - Password: Click *Autogenerate Secure Password* (copy and store securely in a password manager).
   - Under **Database User Privileges**, select **Built-in Role** or **Specific Privileges**:
     - Assign `readWrite` access scoped specifically to the `zync` database. Do not assign `atlasAdmin` or cluster-wide admin roles.
   - Click **Add User**.
3. **Configure Network Access (Dynamic Egress IP Whitelisting):**
   - Navigate to **Security → Network Access**.
   - Click **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - Add description: `Render dynamic egress IPs`.
   - Click **Confirm**.
   - *(Note: Render Web Services do not have static outbound IPs on standard plans; access is secured by the strong database credentials).*
4. **Obtain Connection String:**
   - Navigate to **Deployment → Database → Clusters**.
   - Click **Connect → Drivers** (Node.js).
   - Copy the SRV connection URI:
     ```text
     mongodb+srv://zync-prod-user:<password>@<cluster-host>.mongodb.net/zync?retryWrites=true&w=majority
     ```
   - Substitute `<password>` with your generated password and ensure the database name is `zync`.

---

### Step B: Render Backend Deployment

1. **Log in to Render** at [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository containing the Zync project.
4. Configure service parameters:
   - **Name:** `zync-backend`
   - **Region:** Choose the region closest to your Atlas cluster (e.g., Oregon / Frankfurt).
   - **Branch:** `main`
   - **Root Directory:** `zync-server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:**
     > ⚠️ **IMPORTANT:** Choose **Starter ($7/mo)** or higher for continuous monitoring. Free tier instances sleep after 15 minutes of inactivity, which suspends the in-process ping scheduler (see Section 4 for details).
5. **Configure Health Check Path:**
   - Expand **Advanced**.
   - Set **Health Check Path** to `/api/health`.
6. **Set Environment Variables:**
   Under **Environment Variables**, add the following key-value pairs:

   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables Secure/SameSite=None cookies & suppresses stack traces |
   | `MONGODB_URI` | `mongodb+srv://zync-prod-user:...` | Atlas SRV connection string from Step A |
   | `JWT_SECRET` | *(64-byte random hex string)* | Generate locally via: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | `7d` | JWT token validity window |
   | `CLIENT_URL` | `https://zync-monitor.vercel.app` | **Exact** Vercel frontend URL (**NO trailing slash**) |
   | `ENABLE_SCHEDULER` | `true` | Runs the background heartbeat ping worker |
   | `SCHEDULER_TICK_MS` | `10000` | Worker evaluation frequency (ms) |
   | `PING_TIMEOUT_MS` | `10000` | HTTP ping request timeout (ms) |
   | `MAX_CONCURRENT_PINGS` | `10` | Concurrency limit per scheduler tick |
   | `ALLOW_PRIVATE_URLS` | `false` | Blocks SSRF attempts against loopback/RFC1918 IPs |

   > 🛑 **DO NOT set `PORT`** on Render. Render automatically injects the active listening port into `process.env.PORT`.

7. Click **Create Web Service**.
8. Wait for the build and deployment to complete.
9. Verify by navigating to `https://zync-backend.onrender.com/api/health` in your browser. You should receive:
   ```json
   { "status": "ok", "timestamp": "2026-..." }
   ```

---

### Step C: Vercel Frontend Deployment

1. **Log in to Vercel** at [vercel.com](https://vercel.com).
2. Click **Add New... → Project**.
3. Import your GitHub repository.
4. Configure project settings:
   - **Project Name:** `zync-monitor`
     > ⚠️ **CRITICAL — Project Name & URL Parity:**
     > Name the project **exactly** `zync-monitor` so your assigned production domain is `https://zync-monitor.vercel.app`.
     > If the name `zync-monitor` is already claimed on Vercel, Vercel will append an identifier (e.g. `zync-monitor-<username>.vercel.app`).
     > **If your Vercel URL differs from `https://zync-monitor.vercel.app`, you MUST update `CLIENT_URL` in your Render Dashboard to match the actual Vercel domain exactly (with NO trailing slash) and redeploy on Render.** Otherwise, every single API and WebSocket preflight request will fail with a CORS error.
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click Edit and select `zync-client`.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. **Configure Environment Variables:**
   Expand **Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://zync-backend.onrender.com/api` |

   > ⚠️ **NOTE:** Vite bundles `VITE_*` variables directly into static JavaScript files during `npm run build`. If you change this variable later, you must trigger a manual redeployment on Vercel.

6. **Verify SPA Routing Configuration:**
   The codebase includes [`zync-client/vercel.json`](file:///Users/aaryangulnar/Desktop/Zync%20/zync-client/vercel.json):
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
   This ensures direct loads of `/dashboard`, `/login`, or `/register` route to the single-page application without 404 errors.
7. Click **Deploy**.
8. After deployment, your frontend will be live at `https://zync-monitor.vercel.app`.

---

## 3. Real-Time Socket.io & Cross-Origin Cookies in Production

1. **Explicit CORS & Preflight Methods (including PATCH):**
   - The Express server explicitly configures CORS for `config.clientUrl` with:
     ```js
     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
     credentials: true,
     ```
   - This ensures browser preflight (`OPTIONS`) requests succeed for all REST actions, specifically the `PATCH /api/monitors/:id/toggle` endpoint used for pause/resume.
   - The Socket.io server in `socket.service.js` enforces the identical origin rule:
     ```js
     cors: {
       origin: config.clientUrl,
       credentials: true,
       methods: ["GET", "POST"],
     }
     ```
     In production (`NODE_ENV=production`), `env.js` strictly validates that `CLIENT_URL` is set and has no trailing slash (no localhost fallback in production).

2. **Socket Handshake Authentication:**
   - When a user logs in, the backend sends a `Set-Cookie` header for the `jwt` cookie with:
     ```http
     Set-Cookie: jwt=<token>; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=604800
     ```
   - In production, browsers send this third-party cookie on cross-site fetch/XHR and WebSocket handshakes because `SameSite=None` and `Secure=true` are active.
   - In `AuthContext.jsx`, `socket.io-client` connects with `withCredentials: true`:
     ```js
     const newSocket = io(socketUrl, {
       withCredentials: true,
       transports: ["websocket", "polling"],
     });
     ```
   - The server's `socket.service.js` middleware parses `socket.handshake.headers.cookie`, verifies the token, and attaches the socket to the isolated room `user:<userId>`.
   - The server's `socket.service.js` middleware parses `socket.handshake.headers.cookie`, verifies the token, and attaches the socket to the isolated room `user:<userId>`.

---

## 4. Real-World Architectural Limitations & Trade-Offs

### 1. Render Free-Tier Spin-Down vs. Continuous Monitoring
- **The Issue:** Render's free tier spins down web services after 15 minutes of inactivity. When the service sleeps, the in-process Node.js scheduler (`setInterval`) halts completely.
- **Consequence:** Pings will not execute, downtime will not be detected, and incidents will not trigger until an incoming HTTP request wakes the server.
- **Recommended Solution:** An **always-on instance** (Render Starter plan at \$7/month) is required for genuine production health monitoring.
- **Stopgap Workaround:** An external uptime monitor (such as UptimeRobot or Cron-Job.org) can be configured to ping `https://zync-backend.onrender.com/api/health` every 10 minutes.
  - *Caveats:* Free tier accounts on Render share a pool of 750 free instance hours per month. Running 24/7 with a pinger will exhaust free hours before the month ends if you have multiple services, and cold-restart latency will still occur during platform redeployments.

### 2. Third-Party Cookie Blocking (Safari ITP / Chrome Privacy Sandbox)
- **The Issue:** Because the frontend is on `vercel.app` and the backend is on `onrender.com`, the `jwt` cookie is classified as a cross-site / third-party cookie.
- **Browser Behavior:**
  - **Safari (iOS & macOS):** Intelligent Tracking Prevention (ITP) blocks third-party cookies by default. Users on Safari will be unable to maintain authentication.
  - **Brave / Firefox:** Enhanced tracking protection blocks third-party cookies in strict modes.
- **Mitigation Options:**
  - **Option A — Custom Parent Domain (Recommended / Complete Fix):**
    - Set up a custom domain (e.g. `example.com`).
    - Point `app.example.com` to Vercel and `api.example.com` to Render.
    - Set `domain: ".example.com"` in cookie options.
    - This transforms cookies into first-party cookies for both REST API endpoints and Socket.io WebSocket connections.
  - **Option B — Vercel API Rewrites (Partial Fix):**
    - Configure `vercel.json` to proxy `/api/(.*)` directly to `https://zync-backend.onrender.com/api/$1`.
    - *Limitation:* Vercel Serverless Rewrites **do not support WebSocket upgrades**. While REST API calls become first-party, real-time Socket.io connections still connect cross-domain to Render and will be blocked in Safari. Option A is the only complete resolution.

### 3. SSRF: DNS Rebinding and Redirect Gaps
- **The Issue:** The current `isPrivateUrl()` helper regexes the hostname string at time of request scheduling.
- **Vulnerabilities:**
  - **DNS Rebinding:** An attacker can provide a domain whose DNS initially returns a benign public IP, but switches to `127.0.0.1` or `169.254.169.254` (cloud metadata service) when Axios performs the network call.
  - **HTTP Redirects:** If a monitored public target returns a 302 redirect pointing to `http://169.254.169.254/latest/meta-data/`, Axios may follow the redirect into the internal network.
- **Future Production Mitigation:**
  - Resolve DNS before dispatching the socket connection and validate the resolved IP address directly against CIDR masks.
  - Disable automated redirect following (`maxRedirects: 0`) or intercept redirects to re-validate destination IPs before following.

---

## 5. End-to-End Production Verification Checklist

Follow this checklist once deployed:

| Check | Action | Expected Result |
|---|---|---|
| **Health Check** | Open `https://zync-backend.onrender.com/api/health` | HTTP 200 with `{ "status": "ok", "timestamp": ... }` |
| **SPA Routing** | Direct navigate to `https://zync-monitor.vercel.app/login` | Renders Login page (not Vercel 404) |
| **Registration** | Register a new account on the live Vercel site | User created, redirected to `/dashboard` |
| **Cookie Flags** | Open Chrome DevTools → Application → Cookies → `https://zync-backend.onrender.com` | `jwt` cookie exists with **HttpOnly**, **Secure**, and **SameSite=None** |
| **Session Persistence** | Hard refresh (`Cmd+Shift+R` or `Ctrl+F5`) on `/dashboard` | Dashboard remains loaded; no logout or login flash |
| **Live WebSockets** | Check Navbar connection dot | Green indicator showing "Real-time Connected" |
| **Monitor Creation** | Add monitor with URL `https://httpbin.org/status/200` (interval: 10s) | Card appears in grid; updates to `OPERATIONAL` within 10s without page reload |
| **Latency Sparkline** | Observe card over 30 seconds | Latency chart dynamically appends new data points live |
| **Incident Trigger** | Edit monitor URL to `https://httpbin.org/status/500` | After 3 ticks, status turns `DOWN`, active incident banner appears, exactly 1 incident created |
| **Auto-Resolution** | Edit monitor URL back to `https://httpbin.org/status/200` | Status recovers to `OPERATIONAL`, incident marked `RESOLVED` with calculated `downtimeSeconds` |
| **Logout** | Click "Sign out" in Navbar | Redirects to `/login`; `jwt` cookie is deleted from browser storage |
| **Route Protection** | Attempt direct `GET https://zync-backend.onrender.com/api/monitors` in Postman / curl | Returns HTTP 401 `{ "message": "Not authenticated" }` |
| **Brute-Force Rate Limit** | Attempt 11 invalid logins in rapid succession | Returns HTTP 429 `{ "message": "Too many login attempts. Please try again after 15 minutes." }` |
