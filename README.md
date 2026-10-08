# Water Monitor

A mobile-first installable progressive web application (PWA) for an ESP32-based pipeline water availability sensor.

Water Monitor informs residents when municipal or pipeline water begins flowing, when it finishes, and provides statistics and push alerts to prevent missing water supply windows.

---

## Features
- **Live Status & Duration**: Clear availability indicator (`AVAILABLE`, `FINISHED`, `UNKNOWN`) and real-time duration counter. Status is never represented by color alone.
- **Supply History & Timeline**: Interactive range charts (7 / 30 / 90 days), daily 24-hour visual strips, and CSV export.
- **Predictive Schedule & Probability**: Arrival probability by hour of day and median weekday start times with interquartile range (IQR).
- **Push Alerts via Ntfy**: Multi-tier alert profiles (Full, Daytime, Urgent) integrated with deep links to the ntfy app.
- **Schema-Driven Settings**: All pipeline and safety thresholds (confirmation windows, float polarity, heartbeat, offline timeout) generated from a central schema with pending/applied state synchronization.
- **Admin Management**: User provisioning using secondary Firebase auth instances, device assignment, and alert profile management.
- **Demo Mode**: Full-featured in-memory demo mode when Firebase credentials are not set.
- **Phase 2 Ready**: Hidden stub for automated pump controls behind feature flag `FEATURE_PUMP = false`.

---

## Plain-Language Setup Guide

### 1. Firebase Setup (Free Spark Plan)
1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Name your project (e.g., `water-monitor`) and disable Google Analytics (not required for Spark).
3. **Enable Email/Password Authentication**:
   - Navigate to **Build > Authentication** in the sidebar.
   - Click **Get started**, choose **Email/Password**, toggle **Enable**, and click **Save**.
4. **Create Realtime Database**:
   - Navigate to **Build > Realtime Database** in the sidebar.
   - Click **Create Database**, select a region close to your users (e.g., `asia-southeast1` or `us-central1`), and start in **Locked Mode**.
5. **Apply Security Rules**:
   - Go to the **Rules** tab in Realtime Database.
   - Replace the default rules with the contents of [`database.rules.json`](./database.rules.json) from this repository and click **Publish**.
6. **Obtain Web App Config**:
   - Go to **Project Settings** (gear icon) > **General**.
   - Under *Your apps*, click the **Web** (`</>`) icon.
   - Register the app as `Water Monitor Web`.
   - Copy the configuration keys: `apiKey`, `authDomain`, `databaseURL`, `projectId`, and `appId`.

---

### 2. GitHub Repository Variables
Because Firebase configuration values for web apps are client-side credentials, configure them as **Repository Variables** (not secrets):
1. In your GitHub repository, open **Settings > Secrets and variables > Actions > Variables** tab.
2. Click **New repository variable** and add the following 6 variables:
   - `VITE_FIREBASE_API_KEY`: Value from Firebase web app `apiKey`
   - `VITE_FIREBASE_AUTH_DOMAIN`: Value from Firebase web app `authDomain`
   - `VITE_FIREBASE_DATABASE_URL`: Realtime Database URL (e.g. `https://<project-id>-default-rtdb.firebaseio.com`)
   - `VITE_FIREBASE_PROJECT_ID`: Value from Firebase web app `projectId`
   - `VITE_FIREBASE_APP_ID`: Value from Firebase web app `appId`
   - `VITE_NTFY_BASE_URL`: (Optional) `https://ntfy.sh` (or your self-hosted ntfy instance URL)

---

### 3. GitHub Pages Deployment
1. Go to your repository's **Settings > Pages**.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Push to the `main` branch or manually trigger the **Deploy to GitHub Pages** workflow via the **Actions** tab.
4. The GitHub Actions workflow (`deploy.yml`):
   - Uses `bun install --frozen-lockfile` with the committed `bun.lock`.
   - Runs unit tests and builds the Vite bundle.
   - Deploys the static site to `https://<owner>.github.io/<repo>/`.
   - Uses `HashRouter` and repository-based Vite base path for seamless single-page application and PWA offline navigation.

---

### 4. First Admin Login & Initialization
To bootstrap your admin account:
1. In Firebase Console, go to **Authentication > Users** tab.
2. Click **Add user** and create your admin account with an email (e.g., `admin@example.com`) and a strong password.
3. Note the generated **User UID** for this user.
4. Go to **Realtime Database > Data** tab:
   - Hover over the root node, click the **+** (Add child) button.
   - Set the child name: `config`
   - Under `config`, set child name: `adminUid`
   - Set value: `<paste your User UID here>`
   - Click **Add**.
   *(Note: The only manual database entry is `config/adminUid`. You do NOT need to create `/users/<adminUid>` by hand — the application automatically self-provisions the administrator record in the database upon your first sign-in).*
5. Now open the deployed web application URL:
   - Enter your admin email and password on the Login page.
   - Tap **Sign In**.
   - Your administrator profile is automatically created in the database.
   - Navigate to **Settings** (`#settings`) and scroll to **Administration**.
   - Use the **Devices** tab to provision ESP32 devices and generate firmware credentials.
   - Use the **Alert Profiles** tab to customize notification thresholds and ntfy topics.
   - Use the **Users** tab to invite household members.

---

## Local Development
1. Clone the repository and install dependencies:
   ```bash
   bun install --frozen-lockfile
   # or: npm install
   ```
2. Configure local environment:
   ```bash
   cp .env.example .env
   ```
   (If `.env` is left blank, the app will automatically start in full-featured **Demo Mode**).
3. Start development server:
   ```bash
   npm run dev
   ```
4. Run tests and lint:
   ```bash
   npm test
   npm run lint
   npm run build
   ```

---

## Architecture & Data Safety
- **No Node/Serverless backend**: Pure static client built with Vite and React.
- **Zero secrets stored**: No service account keys or private secrets in the frontend bundle.
- **Default-deny security rules**: Firebase Realtime Database rules restrict reads and writes strictly by role and device association.
- **Service Worker PWA**: Caches only the application shell (HTML, JS, CSS, SVG); database queries, auth endpoints, and push notifications are never cached offline.
