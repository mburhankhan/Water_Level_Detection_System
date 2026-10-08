# Water Monitor

A mobile-first installable web application (PWA) for an ESP32-based pipeline water availability sensor.

Water Monitor informs residents when municipal or pipeline water begins flowing, when it finishes, and provides statistics and push alerts to prevent missing water supply windows.

## Features
- **Live Status & Duration**: Clear availability indicator (`AVAILABLE`, `FINISHED`, `UNKNOWN`) and real-time duration counter.
- **Supply History & Timeline**: Interactive range charts (7 / 30 / 90 days), daily 24-hour visual strips, and CSV export.
- **Predictive Schedule & Probability**: Arrival probability by hour of day and median weekday start times with interquartile range (IQR).
- **Push Alerts via Ntfy**: Multi-tier alert profiles (Full, Daytime, Urgent) integrated with deep links to the ntfy app.
- **Schema-Driven Settings**: All pipeline and safety thresholds (confirmation windows, float polarity, heartbeat, offline timeout) generated from a central schema with pending/applied state synchronization.
- **Admin Management**: User provisioning using secondary Firebase auth instances, device assignment, and alert profile management.
- **Demo Mode**: Full-featured in-memory demo mode when Firebase credentials are not set.

## Technology Stack
- **Frontend**: React 18 / 19, TypeScript (strict), Vite, Tailwind CSS, Recharts, Lucide Icons, HashRouter
- **Backend**: Firebase Authentication (Email/Password) & Realtime Database (Free Spark tier)
- **Notifications**: Ntfy (HTTP/ntfy:// push notifications)

## Setup & Deployment
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your Firebase Spark credentials:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_NTFY_BASE_URL` (optional, defaults to `https://ntfy.sh`)
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Build for production / GitHub Pages:
   ```bash
   npm run build
   ```
