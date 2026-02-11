# 🕰️ Clockwork

**Clockwork** is a premium, local-first task tracking application designed for recurring routines. Built with a "Privacy First, Cloud Second" philosophy, it ensures your data is always available on your device while offering seamless cloud synchronization.

## ✨ Key Features

-   **Offline First**: Uses IndexedDB (via Dexie.js) to ensure the app works instantly, even without an internet connection.
-   **Cloud Sync**: Optional Google-powered synchronization with Supabase. Backup your data and access it across devices.
-   **Progressive Web App (PWA)**: Installable on iOS, Android, and Desktop. Supports offline caching and a native app experience.
-   **Streak Tracking**: Gamified task completion system with auto-miss logic for overdue tasks.
-   **Timezone Support**: Precise task tracking across any UTC offset. Notifications and streak resets are calculated relative to your selected timezone.
-   **Local Notifications**: Privacy-respecting browser notifications for daily routines with support for action buttons.
-   **Manual Cloud Sync**: Decoupled synchronization for data and preferences. Sync your clockworks from the Today view and your settings from the Profile page.
-   **Background Updates**: Frictionless PWA updates that install automatically in the background without interrupting your workflow.
-   **Modern Design**: Sleek, responsive UI built with Tailwind CSS and Lucide icons, including a live timezone-aware clock.

## 🚀 Getting Started

### Prerequisites

-   Node.js 18.x or later
-   A Supabase Project (for cloud sync)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/HeinSoeHtet/clockwork.git
    cd clockwork
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**:
    Create a `.env.local` file in the root directory:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

## 🛠️ Tech Stack

-   **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
-   **Local Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
-   **Backend/Auth**: [Supabase](https://supabase.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **PWA**: Standard Web Manifest + Custom Service Worker

## 🏗️ Architecture

-   **State Management**: Centralized via `ClockworkContext.tsx`. This provider handles all database operations, authentication, and timezone-aware logic.
-   **Timezone Logic**: Handled via UTC offsets (UTC-12 to UTC+14). Current time and task due dates are calculated locally and synced to the cloud profiles.
-   **Data Flow**:
    1. User modifies data -> Updates **Local IndexedDB** immediately.
    2. App flags record as `synced: false`.
    3. User clicks "Sync to Cloud" -> Authenticated `upsert` to **Supabase**.
    4. Local records marked as `synced: true` upon success.
-   **PWA Lifecycle**: 
    - Custom installation dialog intercepts the `beforeinstallprompt` event.
    - Updates are handled via a "silent" Service Worker strategy, reloading the app in the background when a new version is ready.
-   **Auto-Miss Logic**: Overdue tasks are automatically identified based on timezone-aware midnight and rotated daily.

## 🔐 Security

-   **Row Level Security (RLS)**: Enforced on the Supabase `clockworks` and `profiles` tables to ensure users can only access their own data.
-   **Validation**: Character limits (50 for names, 500 for notes) enforced on both the UI and logic layers.
-   **Service Worker**: Implements a **Stale-While-Revalidate** strategy for safe and fast updates.

---

Built with ❤️ by the Clockwork Team.
