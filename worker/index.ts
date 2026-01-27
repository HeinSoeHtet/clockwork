import Dexie from 'dexie';

const CACHE_NAME = 'clockwork-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.webmanifest',
    '/icon.png',
];

// Cache logic
self.addEventListener('install', (event: any) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('fetch', (event: any) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => cachedResponse);
                return cachedResponse || fetchPromise;
            });
        })
    );
});

// Define the database schema (matches lib/db.ts)
const db = new Dexie('ClockworkDB');
db.version(2).stores({
    clockworks: 'id, name, frequency, nextDue, synced'
});

function calculateNextDue(completedDate: string, frequency: string): string {
    const date = new Date(completedDate);
    switch (frequency) {
        case 'daily': date.setDate(date.getDate() + 1); break;
        case 'alternate': date.setDate(date.getDate() + 2); break;
        case 'every3days': date.setDate(date.getDate() + 3); break;
        case 'weekly': date.setDate(date.getDate() + 7); break;
        case 'biweekly': date.setDate(date.getDate() + 14); break;
        case 'monthly': date.setMonth(date.getMonth() + 1); break;
    }
    return date.toISOString().split('T')[0];
}

// Notification Click Event
self.addEventListener('notificationclick', (event: any) => {
    const notification = event.notification;
    const action = event.action;
    const clockworkId = notification.data?.clockworkId;

    notification.close();

    if (action === 'complete' || action === 'skip') {
        event.waitUntil(
            (async () => {
                try {
                    const clockwork: any = await (db as any).clockworks.get(clockworkId);
                    if (clockwork) {
                        const today = new Date().toISOString().split('T')[0];

                        if (action === 'complete') {
                            const newCompletedDates = [today, ...clockwork.completedDates];
                            const newStreak = clockwork.streak + 1;
                            const nextDue = calculateNextDue(today, clockwork.frequency);
                            await (db as any).clockworks.update(clockworkId, {
                                lastCompleted: today,
                                completedDates: newCompletedDates,
                                streak: newStreak,
                                nextDue,
                                synced: false
                            });
                        } else {
                            const newSkippedDates = [today, ...clockwork.skippedDates];
                            const nextDue = calculateNextDue(today, clockwork.frequency);
                            await (db as any).clockworks.update(clockworkId, {
                                skippedDates: newSkippedDates,
                                nextDue,
                                synced: false
                            });
                        }
                    }
                } catch (err) {
                    console.error('Failed to update DB in SW:', err);
                }

                // Focus or Open the window
                const clientList = await (self as any).clients.matchAll({ type: 'window', includeUncontrolled: true });
                if (clientList.length > 0) {
                    return clientList[0].focus();
                } else {
                    return (self as any).clients.openWindow('/');
                }
            })()
        );
    } else {
        event.waitUntil(
            (self as any).clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any[]) => {
                for (const client of clientList) {
                    if (client.url === notification.data?.url && 'focus' in client) return client.focus();
                }
                if ((self as any).clients.openWindow) {
                    return (self as any).clients.openWindow(notification.data?.url || '/');
                }
            })
        );
    }
});
