# Architecture & Data Flow

This document provides a technical deep-dive into how Clockwork manages data, synchronization, and the offline experience.

## 1. Data Schema

The application uses a unified schema for both local **IndexedDB** and remote **Supabase** storage.

### `Clockwork` Interface

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier (Timestamp-based locally). |
| `name` | `string` | Task name (Max 50 chars). |
| `icon` | `string` | Emoji representation. |
| `color` | `string` | Task theme color (Hex). |
| `frequency` | `enum` | `daily`, `alternate`, `every3days`, `weekly`, `biweekly`, `monthly`. |
| `lastCompleted` | `string` \| `null` | ISO Date of last completion. |
| `nextDue` | `string` | ISO Date of next occurrence. |
| `streak` | `number` | Current consecutive completion count. |
| `completedDates`| `string[]` | History of completion timestamps. |
| `missedDates` | `string[]` | History of missed/overdue iterations. |
| `skippedDates` | `string[]` | History of skipped iterations. |
| `remindersEnabled`| `boolean` | Flag for local notifications. |
| `startDate` | `string` | Task initialization date. |
| `endDate` | `string` \| `null` | Optional task expiration date. |
| `notes` | `string` | Optional user notes (Max 500 chars). |
| `synced` | `boolean` | Local-only flag to track pending syncs. |
| `dueDateOffset`| `number` | Days added to the calculation of `nextDue`. |

## 2. Synchronization Strategy

Clockwork uses a **Local-First** synchronization model.

### The Sync Loop
1.  **Write**: Any user action (`complete`, `add`, `update`, `skip`) updates the local Dexie store and sets `synced: false`.
2.  **Detection**: The `ClockworkContext` uses a `useLiveQuery` to monitor the database for any records where `synced === false`.
3.  **Trigger**: If `hasUnsyncedChanges` is true, the Today dashboard displays a sync action button.
4.  **Upsert**: The `syncWithCloud` function performs a bulk `upsert` to Supabase. Records are matched by `id`.
5.  **Preference Sync**: Timezone settings are synced separately via the Profile page to the `profiles` table in Supabase.
6.  **Finalization**: Once the network request succeeds, local records are updated to `synced: true`.

### Conflict Resolution
Since the `id` is generated locally and mapped 1:1 to the remote database, conflicts are handled via **Last Write Wins** during the `upsert` operation.

## 3. PWA & Service Worker

### Caching Strategy: Stale-While-Revalidate
The service worker (`sw.js`) prioritizes speed by serving cached assets immediately while fetching updates in the background.

1.  **Cache Hit**: Returns the resource from the cache instantly.
2.  **Network Refresh**: Fetches the same resource from the network.
3.  **Update**: Succeeding network responses overwrite the old cache entry.

### Background Updates
Clockwork implements a "silent" update strategy. When a new Service Worker is detected:
1.  The app automatically triggers `skipWaiting()`.
2.  The `controllerchange` event is caught by the `PWARegistration` component.
3.  The app reloads automatically to ensure the user is always on the latest version.

### Installation Flow
The `PWARegistration.tsx` component intercepts the `beforeinstallprompt` event and exposes an `isInstallable` flag. Users can trigger the install via a custom dialog or manually from the Profile page.

## 4. Security Implementation

### Input Sanitization
The `CreateClockwork` page performs `trim()` on all strings and validates `length` constraints before they reach the database layer.

### Supabase RLS policies
The following SQL policies must be enabled on the Supabase `clockworks` and `profiles` tables:
- **Select**: `auth.uid() = user_id` (or `id` for profiles)
- **Insert/Update/Delete**: `auth.uid() = user_id` (or `id` for profiles)

---

*Last Updated: February 2026*
