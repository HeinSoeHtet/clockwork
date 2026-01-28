# 🕰️ Clockwork

**Clockwork** is a premium, local-first task tracking application designed for recurring routines. Built with a "Privacy First, Cloud Second" philosophy, it ensures your data is always available on your device while offering seamless cloud synchronization.

## ✨ Key Features

-   **Offline First**: Uses IndexedDB (via Dexie.js) to ensure the app works instantly, even without an internet connection.
-   **Cloud Sync**: Optional Google-powered synchronization with Supabase. Backup your data and access it across devices.
-   **Progressive Web App (PWA)**: Installable on iOS, Android, and Desktop. Supports offline caching and a native app experience.
-   **Streak Tracking**: Gamified task completion system with auto-miss logic for overdue tasks.
-   **Local Notifications**: Privacy-respecting browser notifications for daily routines.
-   **Manual Control**: Seamless cloud synchronization triggered from the Today dashboard.
-   **Modern Design**: Sleek, responsive UI built with Tailwind CSS and Lucide icons.

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

-   **State Management**: Centralized via `ClockworkContext.tsx`. This provider handles all database operations and authentication states.
-   **Data Flow**:
    1. User modifies data -> Updates **Local IndexedDB** immediately.
    2. App flags record as `synced: false`.
    3. User clicks "Sync Now" -> Authenticated `upsert` to **Supabase**.
    4. Local records marked as `synced: true` upon success.
-   **PWA Installation**: Custom installation dialog implemented in `PWARegistration.tsx` providing a premium onboarding experience.
-   **Auto-Miss Logic**: Overdue tasks are automatically identified and rotated, resetting streaks to ensure accurate habit tracking.

## 🔐 Security

-   **Row Level Security (RLS)**: Enforced on the Supabase `clockworks` table to ensure users can only access their own data.
-   **Validation**: Character limits (50 for names, 500 for notes) enforced on both the UI and logic layers.
-   **Service Worker**: Implements a **Stale-While-Revalidate** strategy for safe and fast updates.

---

Built with ❤️ by the Clockwork Team.
