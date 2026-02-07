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
db.version(3).stores({
    clockworks: 'id, name, frequency, nextDue, synced',
    settings: 'id'
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

async function checkReminders() {
    try {
        const clockworks = await (db as any).clockworks.toArray();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Only notify if it's a reasonable hour (e.g., after 8 AM)
        if (now.getHours() < 8) return;

        const dueItems = clockworks.filter((c: any) => {
            let effectiveDue = c.nextDue;
            if (c.dueDateOffset) {
                const date = new Date(c.nextDue);
                date.setDate(date.getDate() + c.dueDateOffset);
                effectiveDue = date.toISOString().split('T')[0];
            }
            return c.remindersEnabled && effectiveDue === todayStr;
        });

        if (dueItems.length > 0) {
            const settings = await (db as any).settings.get('lastNotification');
            const lastNotified = settings?.timestamp;
            const fourHoursInMs = 4 * 60 * 60 * 1000;

            const shouldNotify = !lastNotified || (now.getTime() - lastNotified) >= fourHoursInMs;

            if (shouldNotify) {
                for (const item of dueItems) {
                    await (self as any).registration.showNotification(`${item.icon} ${item.name}`, {
                        body: `It's time for your ${item.frequency} routine!`,
                        icon: '/icon.png',
                        badge: '/icon.png',
                        tag: `clockwork-${item.id}`,
                        actions: [
                            { action: 'complete', title: 'Mark as Complete' },
                            { action: 'skip', title: 'Skip for Now' }
                        ],
                        vibrate: [100, 50, 100],
                        data: {
                            url: '/today',
                            clockworkId: item.id
                        }
                    });
                }
                await (db as any).settings.put({ id: 'lastNotification', timestamp: now.getTime() });
            }
        }
    } catch (err) {
        console.error('Error in checkReminders SW:', err);
    }
}

// Background Sync
self.addEventListener('periodicsync', (event: any) => {
    if (event.tag === 'check-reminders') {
        event.waitUntil(checkReminders());
    }
});

// Periodic check when SW wakes up (e.g. on fetch or push)
self.addEventListener('activate', (event: any) => {
    event.waitUntil(checkReminders());
});

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
                            const nextDue = calculateNextDue(clockwork.nextDue, clockwork.frequency);
                            await (db as any).clockworks.update(clockworkId, {
                                lastCompleted: today,
                                completedDates: newCompletedDates,
                                streak: newStreak,
                                nextDue,
                                dueDateOffset: 0,
                                synced: false
                            });
                        } else {
                            const newSkippedDates = [today, ...clockwork.skippedDates];
                            const nextDue = calculateNextDue(clockwork.nextDue, clockwork.frequency);
                            await (db as any).clockworks.update(clockworkId, {
                                skippedDates: newSkippedDates,
                                nextDue,
                                dueDateOffset: 0,
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
                    const url = notification.data?.url || '/';
                    return (self as any).clients.openWindow(url);
                }
            })
        );
    }
});
