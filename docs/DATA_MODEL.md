# Water Monitor - Realtime Database Data Model & Security Architecture

This document specifies the exact schema for the Firebase Realtime Database on the free Spark plan and documents the default-deny security rules.

All timestamps are stored as **epoch milliseconds in UTC**. Displays convert to the user's selected time zone (default `Asia/Karachi`).

---

## 1. Database Schema Tree

```
/
├── config/
│   └── adminUid: string                          # The Firebase Auth UID of the single designated system administrator
│
├── users/
│   └── {uid}/
│       ├── email: string                         # User's login email
│       ├── displayName: string                   # Display name
│       ├── role: "admin" | "user"                # System role
│       ├── active: boolean                       # Account activation flag; false denies app access
│       ├── profileId: string                     # Reference to /alertProfiles/{profileId}
│       ├── createdAt: number                     # Epoch ms (UTC)
│       ├── createdBy: string                     # UID of the admin who provisioned this user
│       └── prefs/
│           ├── timeZone: string                  # IANA timezone string (default "Asia/Karachi")
│           ├── use24h: boolean                   # true for 24-hour clock, false for 12-hour AM/PM
│           └── theme: "system" | "light" | "dark"# User theme preference
│
├── alertProfiles/
│   └── {profileId}/
│       ├── name: string                          # e.g., "Full Alerts", "Quiet Night", "Urgent Only"
│       ├── order: number                         # Display ordering sequence
│       ├── maxPerHour: number                    # Rate limit cap; 0 = unlimited
│       ├── reminderIntervalMin: number           # Reminder cadence in minutes; 0 = disabled
│       ├── types/
│       │   ├── available: boolean                # Alert when water availability begins
│       │   ├── finished: boolean                 # Alert when water supply finishes
│       │   ├── reminder: boolean                 # Periodic reminder while water is still running
│       │   └── offline: boolean                  # Alert if device drops offline unexpectedly
│       └── ntfyTopic: string                     # e.g., "wm-a9f8b1c4d2e3f7g0"
│
├── devices/
│   └── {deviceId}/
│       ├── meta/
│       │   ├── name: string                      # Human-readable pipeline or pump name
│       │   ├── type: "pipeline" | "pump"         # Hardware type
│       │   ├── ownerUid?: string                 # Owner UID (pump devices only)
│       │   └── createdAt: number                 # Epoch ms (UTC)
│       │
│       ├── members/
│       │   └── {uid}: boolean                    # Whitelist of users granted access to this device
│       │
│       ├── status/
│       │   ├── state: "AVAILABLE" | "FINISHED" | "UNKNOWN" # Current water availability state
│       │   ├── since: number                     # Epoch ms when current state was detected
│       │   ├── lastSeen: number                  # Epoch ms of the latest device heartbeat
│       │   ├── appliedSettingsVersion: number    # The settings version applied by the device
│       │   └── fwVersion: string                 # Firmware version string (e.g., "v1.2.0")
│       │
│       ├── periods/
│       │   └── {pushId}/                         # Indexed by child "start"
│       │       ├── start: number                 # Epoch ms when water became available
│       │       └── end: number | null            # Epoch ms when water stopped (null if currently ongoing)
│       │
│       ├── settings/
│       │   ├── version: number                   # Incrementing counter for device synchronization
│       │   ├── updatedAt: number                 # Epoch ms when settings were saved
│       │   └── values/
│       │       └── {settingId}: any              # Schema-defined configuration values
│       │
│       └── commands/                             # Phase 2 stub (FEATURE_PUMP = false)
│           └── {pushId}/
│               ├── type: string                  # Command verb (e.g., "SET_MODE", "RUN_NOW")
│               ├── value: any                    # Command payload
│               ├── issuedBy: string              # UID of admin or pump owner
│               ├── issuedAt: number              # Epoch ms
│               └── expiresAt: number             # Epoch ms; command expires if not processed in time
│
└── deviceAuth/
    └── {authUid}: string                         # Maps device's own Firebase Auth UID to {deviceId}
```

---

## 2. Security Rules Explanation

The database uses default-deny security (`".read": false`, `".write": false` at root). Permissions are defined with strict validation:

1. **Authentication Helper Variables**:
   - `admin`: `auth.uid === root.child('config/adminUid').val()`
   - `activeUser`: `root.child('users/' + auth.uid + '/active').val() === true`
   - `isDevice`: `root.child('deviceAuth/' + auth.uid).exists()`
   - `deviceIdForAuth`: `root.child('deviceAuth/' + auth.uid).val()`

2. **`/config`**:
   - Admin only can read and write. Protects `adminUid`.

3. **`/users/{uid}`**:
   - Read: Allowed if user is reading their own record (`auth.uid === $uid`) or if user is `admin`.
   - Write: Admin can write any user record.
   - Self-write exception: Active users can update their own `prefs` object and `profileId` (must point to an existing record in `/alertProfiles`).

4. **`/alertProfiles`**:
   - Read: Allowed for active users and devices.
   - Write: Admin only.

5. **`/deviceAuth`**:
   - Read: Allowed for the device itself (`auth.uid === $authUid`) and admin.
   - Write: Admin only. Used when provisioning device logins.

6. **`/devices/{deviceId}/meta` and `/devices/{deviceId}/members`**:
   - Read: Allowed for device members (`root.child('devices/' + $deviceId + '/members/' + auth.uid).val() === true`), admin, or the device itself.
   - Write: Admin only.

7. **`/devices/{deviceId}/status` and `/devices/{deviceId}/periods`**:
   - Read: Allowed for members and admin.
   - Write: ONLY by the device whose `deviceAuth` maps to this `$deviceId` (`root.child('deviceAuth/' + auth.uid).val() === $deviceId`). Validates states and number types.

8. **`/devices/{deviceId}/settings`**:
   - Read: Allowed for members, admin, and the device itself.
   - Write: For pipeline devices, admin only. For pump devices, admin or the pump's `ownerUid`. Validates `version` is a positive number.

9. **`/devices/{deviceId}/commands`** (Phase 2 stub):
   - Read: By the device itself.
   - Write: By the pump owner or admin. Validates that `expiresAt` is greater than `now`.

---

## 3. Query Indexing

- `/devices/{deviceId}/periods` is indexed by `"start"`:
  ```json
  ".indexOn": ["start"]
  ```
  This enables range queries (7 days, 30 days, 90 days) using `orderByChild("start").startAt(sinceTimestamp)` without fetching historic records outside the requested window.
