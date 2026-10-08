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
├── deviceIndex/                                  # Admin directory of all registered devices
│   └── {deviceId}/
│       ├── name: string                          # Human-readable pipeline or pump name
│       └── type: "pipeline" | "pump"             # Hardware type
│
├── users/
│   └── {uid}/
│       ├── email: string                         # User's login email
│       ├── displayName: string                   # Display name
│       ├── role: "admin" | "user"                # System role
│       ├── active: boolean                       # Account activation flag; false denies app access
│       ├── profileId: string                     # Reference to /alertProfiles/{profileId} or ""
│       ├── createdAt: number                     # Epoch ms (UTC)
│       ├── createdBy: string                     # UID of the admin who provisioned this user
│       ├── deviceIds/                            # Devices assigned to this user
│       │   └── {deviceId}: true
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

1. **Authentication & Role Variables**:
   - `admin`: `auth.uid === root.child('config/adminUid').val()`
   - `activeUser`: `root.child('users/' + auth.uid + '/active').val() === true`
   - `isDevice`: `root.child('deviceAuth/' + auth.uid).exists()`
   - `deviceIdForAuth`: `root.child('deviceAuth/' + auth.uid).val()`

2. **`/config`**:
   - Admin only can read and write. Protects `adminUid`.

3. **`/deviceIndex`**:
   - Admin only can read and write. Enables the admin to enumerate registered devices without querying the entire `/devices` branch.

4. **`/users` & `/users/{uid}`**:
   - Read on `/users`: Admin only (`auth.uid === adminUid`), permitting client-side user pagination in admin settings.
   - Read on `/users/{uid}`: Allowed for the user themselves (`auth.uid === $uid`) or admin.
   - Write: Admin only, with self-protection guard `($uid !== adminUid || newData.exists())` preventing admin deletion.
   - Validation on `/users/{uid}`: If `$uid === adminUid`, `role` MUST be `"admin"` and `active` MUST be `true` (admin cannot be disabled or demoted). If `$uid !== adminUid`, `role` MUST be `"user"` and `active` is boolean.
   - `mustChangePassword`: User themselves may write only to set this flag to `false` (`newData.val() === false`) after initial password update.
   - `profileId` write: Active user can write their own `profileId`. Validated as an empty string `""` or an existing key in `/alertProfiles`.
   - `deviceIds` write: Admin writes device assignments; the user can read their own assigned device list.

5. **`/alertProfiles`**:
   - Read: Allowed for active users, registered devices, and admin.
   - Write: Admin only.
   - Validation: Requires `name`, `order`, `maxPerHour`, `reminderIntervalMin`, `types`, and `ntfyTopic`.

6. **`/deviceAuth`**:
   - Read on `/deviceAuth`: Admin can read directory (`auth.uid === adminUid`) to look up and clean up credentials when deleting devices.
   - Read on `/deviceAuth/{authUid}`: Device itself (`auth.uid === $authUid`) and admin.
   - Write: Admin only. Validates that referenced device exists in `/devices/{id}`.

7. **`/devices/{deviceId}` (Member-based reads require active account)**:
   - To prevent disabled users from reading telemetry, all member-based read rules enforce `users/{auth.uid}/active === true`:
     `auth.uid === adminUid || (root.child('users/' + auth.uid + '/active').val() === true && root.child('devices/' + $deviceId + '/members/' + auth.uid).val() === true)`
   - `meta` & `members`: Read by active members, admin, and the device itself; write by admin.
   - `status` & `periods`: Read by active members and admin; write ONLY by the hardware device authenticated under `deviceAuth`.
   - `settings`: Read by active members, admin, and the device; write by admin (pipeline) or pump owner/admin (pump).
   - `commands`: Read by device; write by pump owner or admin with `expiresAt > now`.

---

## 3. Query Indexing & Client Discovery Architecture

- **Never Read Whole `/devices`**:
  - Admins query `/deviceIndex` to list device IDs.
  - Standard users query `/users/{uid}/deviceIds` to discover their accessible device IDs.
  - Clients then subscribe individually to `meta`, `status`, `settings`, and a bounded query on `periods`.
- **`/devices/{deviceId}/periods` Indexing**:
  Indexed by child `"start"` with `limitToLast(500)` to ensure fast loads and minimal bandwidth consumption on mobile networks:
  ```json
  ".indexOn": ["start"]
  ```
