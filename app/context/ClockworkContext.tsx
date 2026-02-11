"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db, type Clockwork } from '@/lib/db';


import { useLiveQuery } from 'dexie-react-hooks';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { getLocalToday, calculateNextDueDate, getEffectiveDate } from '@/lib/date-utils';

export type { Clockwork };

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

interface ExtendedNotificationOptions extends NotificationOptions {
    vibrate?: number[];
    actions?: Array<{
        action: string;
        title: string;
        icon?: string;
    }>;
}

interface ClockworkContextType {
    clockworks: Clockwork[];
    user: User | null;
    loading: boolean;
    isSyncing: boolean;
    hasUnsyncedChanges: boolean;
    lastSyncTime: string | null;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    syncWithCloud: () => Promise<void>;
    requestNotificationPermission: () => Promise<boolean>;
    sendLocalNotification: (title: string, body: string, tag?: string) => void;
    timezone: string;
    updateTimezone: (tz: string) => Promise<void>;


    addClockwork: (clockwork: Omit<Clockwork, 'id' | 'lastCompleted' | 'streak' | 'completedDates' | 'missedDates' | 'skippedDates' | 'synced' | 'dueDateOffset'>) => void;


    completeClockwork: (id: string) => void;
    deleteClockwork: (id: string) => void;
    skipClockwork: (id: string) => void;
    missClockwork: (id: string, missDate: string) => void;
    updateClockwork: (id: string, updates: Partial<Clockwork>) => void;
    shiftClockwork: (id: string, days: number) => void;
    installApp: () => Promise<void>;
    isInstallable: boolean;
}


const ClockworkContext = createContext<ClockworkContextType | undefined>(undefined);

export function ClockworkProvider({ children }: { children: React.ReactNode }) {
    const clockworksLive = useLiveQuery(() => db.clockworks.toArray());
    const clockworks = React.useMemo(() => clockworksLive || [], [clockworksLive]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [timezone, setTimezone] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('timezone');
            if (saved) return saved;
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
        return 'UTC';
    });
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    // Memoize supabase client to prevent recreation on every render
    const supabase = React.useMemo(() => createClient(), []);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setInstallPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    }, []);

    const installApp = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        setInstallPrompt(null);
        setIsInstallable(false);
    };

    useEffect(() => {
        const savedTime = localStorage.getItem('lastSyncTime');
        if (savedTime) setLastSyncTime(savedTime);

        // Load timezone from Dexie (most authoritative local storage)
        const loadTimezone = async () => {
            const savedTz = await db.settings.get('timezone');
            if (savedTz) {
                setTimezone(savedTz.value);
                localStorage.setItem('timezone', savedTz.value);
            } else {
                const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                setTimezone(deviceTz);
                localStorage.setItem('timezone', deviceTz);
                await db.settings.put({ id: 'timezone', value: deviceTz, timestamp: Date.now() });
            }
        };
        loadTimezone();
    }, []);

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return false;
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    };

    const completeClockwork = useCallback(async (id: string) => {
        const clockwork = await db.clockworks.get(id);
        if (!clockwork) return;

        const today = getLocalToday(timezone);
        const newCompletedDates = [today, ...clockwork.completedDates];
        const newStreak = clockwork.streak + 1;
        // Maintain sequence by calculating from original nextDue, not today
        const nextDue = calculateNextDueDate(clockwork.nextDue, clockwork.frequency, timezone);

        await db.clockworks.update(id, {
            lastCompleted: today,
            completedDates: newCompletedDates,
            streak: newStreak,
            nextDue,
            dueDateOffset: 0,
            synced: false
        });
    }, [timezone]);

    const skipClockwork = useCallback(async (id: string) => {
        const clockwork = await db.clockworks.get(id);
        if (!clockwork) return;

        const today = getLocalToday(timezone);
        const newSkippedDates = [today, ...clockwork.skippedDates];
        // Maintain sequence by calculating from original nextDue
        const nextDue = calculateNextDueDate(clockwork.nextDue, clockwork.frequency, timezone);

        await db.clockworks.update(id, {
            skippedDates: newSkippedDates,
            nextDue,
            dueDateOffset: 0,
            synced: false
        });
    }, [timezone]);

    const sendLocalNotification = (title: string, body: string, tag?: string) => {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const clockworkId = tag?.replace('clockwork-', '');

        const options: ExtendedNotificationOptions & { data?: { url: string; clockworkId: string | undefined } } = {
            body,
            icon: '/icon.png',
            badge: '/icon.png',
            tag: tag || 'clockwork-reminder',
            vibrate: [100, 50, 100],
            data: {
                url: window.location.origin + '/today',
                clockworkId: clockworkId
            }
        };

        if ('serviceWorker' in navigator && Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then((registration) => {
                const fullOptions: ExtendedNotificationOptions = {
                    ...options,
                    actions: [
                        { action: 'complete', title: 'Mark as Complete' },
                        { action: 'skip', title: 'Skip for Now' }
                    ]
                };
                registration.showNotification(title, fullOptions);
            });
        } else if (Notification.permission === 'granted') {
            new Notification(title, options);
        }
    };

    const clearNotifications = () => {
        if (!('Notification' in window)) return;

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.getNotifications().then((notifications) => {
                    notifications.forEach(n => {
                        if (n.tag === 'clockwork-reminder' || n.tag?.startsWith('clockwork-')) {
                            n.close();
                        }
                    });
                });
            });
        }
    };

    // Register Periodic Background Sync
    const registerPeriodicSync = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            if ('periodicSync' in registration) {
                const status = await navigator.permissions.query({
                    name: 'periodic-background-sync' as PermissionName
                });

                if (status.state === 'granted') {
                    // @ts-expect-error periodicSync is experimental
                    await registration.periodicSync.register('check-reminders', {
                        minInterval: 60 * 60 * 1000 // 1 hour
                    });
                    console.log('✅ Periodic Background Sync registered');
                } else {
                    console.log('❌ Periodic Background Sync permission not granted');
                }
            }
        } catch (error) {
            console.error('❌ Failed to register Periodic Background Sync:', error);
        }
    }, []);

    // Periodic reminder check
    useEffect(() => {
        const checkReminders = async () => {
            const now = new Date();
            const todayStr = getLocalToday(timezone, now);

            // Get local hours according to the preferred timezone
            const localHours = parseInt(new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour: '2-digit',
                hour12: false
            }).format(now));

            // Only notify if it's a reasonable hour (e.g., after 8 AM)
            if (localHours < 8) return;

            const dueItems = clockworks.filter(c => {
                const effectiveDue = getEffectiveNextDue(c);
                return c.remindersEnabled && effectiveDue === todayStr;
            });

            if (dueItems.length > 0) {
                const settings = await db.settings.get('lastNotification');
                const lastNotified = settings?.timestamp;
                const fourHoursInMs = 4 * 60 * 60 * 1000;

                const shouldNotify = !lastNotified || (now.getTime() - lastNotified) >= fourHoursInMs;

                if (shouldNotify) {
                    dueItems.forEach(item => {
                        sendLocalNotification(
                            `${item.icon} ${item.name}`,
                            `It's time for your ${item.frequency} routine!`,
                            `clockwork-${item.id}`
                        );
                    });
                    await db.settings.put({ id: 'lastNotification', value: true, timestamp: now.getTime() });
                }
            } else {
                // If nothing due, clear existing reminder
                clearNotifications();
                await db.settings.delete('lastNotification');
            }
        };

        // Check every 1 hour
        const interval = setInterval(checkReminders, 1000 * 60 * 60);
        checkReminders(); // Initial check
        registerPeriodicSync();

        return () => clearInterval(interval);
    }, [clockworks, registerPeriodicSync, timezone]);
    // Auto-miss overdue items
    useEffect(() => {
        const handleAutoMiss = async () => {
            const todayStr = getLocalToday(timezone);
            const overdue = clockworks.filter(c => getEffectiveNextDue(c) < todayStr);

            if (overdue.length > 0) {
                for (const item of overdue) {
                    console.log(`⏰ Auto-missing overdue task: ${item.name}`);
                    const newMissedDates = [item.nextDue, ...item.missedDates];
                    const newNextDue = calculateNextDueDate(item.nextDue, item.frequency, timezone);

                    await db.clockworks.update(item.id, {
                        missedDates: newMissedDates,
                        streak: 0,
                        nextDue: newNextDue,
                        dueDateOffset: 0,
                        synced: false
                    });
                }
            }
        };

        handleAutoMiss();
    }, [clockworks, timezone]);






    // Local-first: Check for unsynced changes
    const hasUnsyncedChanges = !!useLiveQuery(
        async () => {
            const unsynced = await db.clockworks.filter(c => !c.synced).toArray();
            return unsynced.length > 0;
        },
        []
    );

    // Removed auto-sync trigger to allow manual sync only


    // Handle notification actions (logging/focus)
    useEffect(() => {
        const messageListener = (event: MessageEvent) => {
            if (event.data?.type === 'CLOCKWORK_ACTION') {
                console.log(`🔔 Notification Action Background update noticed: ${event.data.action}`);
            }
        };
        navigator.serviceWorker?.addEventListener('message', messageListener);
        return () => navigator.serviceWorker?.removeEventListener('message', messageListener);
    }, []);

    const syncWithCloud = async () => {
        if (isSyncing) return;
        if (!user) {
            console.log('👤 User not logged in, redirecting to login...');
            await signInWithGoogle();
            return;
        }

        setIsSyncing(true);
        console.log('🔄 Starting cloud sync...');

        // Add a safety timeout (30 seconds)
        const syncTimeout = setTimeout(() => {
            if (isSyncing) {
                console.warn('⚠️ Sync timed out after 30 seconds');
                setIsSyncing(false);
            }
        }, 30000);

        try {
            // 1. Sync Clockworks
            const unsynced = await db.clockworks.filter(c => !c.synced).toArray();
            console.log(`Found ${unsynced.length} unsynced items`);

            if (unsynced.length > 0) {
                const toSync = unsynced.map((item) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { synced, ...rest } = item;
                    return { ...rest, user_id: user.id };
                });

                const { error: upsertError } = await supabase
                    .from('clockworks')
                    .upsert(toSync, { onConflict: 'id' });

                if (upsertError) throw upsertError;

                await Promise.all(
                    unsynced.map(item => db.clockworks.update(item.id, { synced: true }))
                );
            }

            // 2. Sync Profile Settings
            const localTz = localStorage.getItem('timezone') || timezone;
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    timezone: localTz,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (profileError) console.warn('⚠️ Profile sync failed:', profileError.message);

            console.log('✅ Sync successful');
            const now = new Date().toISOString();
            setLastSyncTime(now);
            localStorage.setItem('lastSyncTime', now);
        } catch (error) {
            console.error('❌ Sync failed:', error);
        } finally {
            clearTimeout(syncTimeout);
            setIsSyncing(false);
        }
    };


    useEffect(() => {
        let mounted = true;

        // Consolidate initial auth check and listener
        const initAuth = async () => {
            console.log('🔍 Initializing Auth...');
            try {
                // Get session first
                const { data: { session } } = await supabase.auth.getSession();
                if (mounted) {
                    setUser(session?.user ?? null);
                    setLoading(false);
                }
            } catch (err) {
                console.error('❌ Auth init error:', err);
                if (mounted) setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔔 Auth state changed:', event, session?.user?.email);
            if (!mounted) return;

            const user = session?.user ?? null;
            setUser(user);
            setLoading(false);

            if (user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
                // Background profile sync
                try {
                    const localTz = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
                    await supabase
                        .from('profiles')
                        .upsert({
                            id: user.id,
                            timezone: localTz,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'id' });
                } catch (err) {
                    console.error('⚠️ Silent profile sync failed:', err);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    const signInWithGoogle = async () => {
        console.log('🚀 Initiating Google Login...');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/profile`,
                }
            });
            if (error) throw error;
        } catch (error: any) {
            console.error('❌ Login error:', error.message);
        }
    };

    const signOut = async () => {
        console.log('� Signing out...');
        try {
            // Set user to null immediately for better UX
            setUser(null);
            setLoading(false);

            // Perform actual sign out with timeout
            const signOutPromise = supabase.auth.signOut();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Sign out timeout')), 5000)
            );

            await Promise.race([signOutPromise, timeoutPromise]);

            console.log('✅ Signed out successfully');
        } catch (err) {
            console.error('⚠️ Sign out warning/error:', err);
            // Always ensure local state is cleared
            setUser(null);
        }
    };


    const addClockwork = async (clockwork: Omit<Clockwork, 'id' | 'lastCompleted' | 'streak' | 'completedDates' | 'missedDates' | 'skippedDates' | 'synced' | 'dueDateOffset'>) => {

        const newClockwork: Clockwork = {
            ...clockwork,
            id: Date.now().toString(),
            lastCompleted: null,
            streak: 0,
            completedDates: [],
            missedDates: [],
            skippedDates: [],
            dueDateOffset: 0,
            synced: false
        };
        await db.clockworks.add(newClockwork);
    };


    const deleteClockwork = async (id: string) => {
        const clockwork = await db.clockworks.get(id);
        if (clockwork && user) {
            // Delete from Cloud too
            await supabase.from('clockworks').delete().eq('id', id);
        }
        await db.clockworks.delete(id);
    };


    const missClockwork = async (id: string, missDate: string) => {
        const clockwork = await db.clockworks.get(id);
        if (!clockwork) return;

        const newMissedDates = [missDate, ...clockwork.missedDates];
        const nextDue = calculateNextDueDate(missDate, clockwork.frequency, timezone);

        await db.clockworks.update(id, {
            missedDates: newMissedDates,
            streak: 0,
            nextDue,
            dueDateOffset: 0,
            synced: false
        });
    };

    const shiftClockwork = useCallback(async (id: string, days: number) => {
        const clockwork = await db.clockworks.get(id);
        if (!clockwork) return;

        await db.clockworks.update(id, {
            dueDateOffset: (clockwork.dueDateOffset || 0) + days,
            synced: false
        });
    }, []);

    const updateClockwork = async (id: string, updates: Partial<Clockwork>) => {
        await db.clockworks.update(id, { ...updates, synced: false });
    };

    const updateTimezone = async (newTz: string) => {
        setTimezone(newTz);
        localStorage.setItem('timezone', newTz);
        await db.settings.put({ id: 'timezone', value: newTz, timestamp: Date.now() });
    };



    return (
        <ClockworkContext.Provider value={{
            clockworks,
            user,
            loading,
            isSyncing,
            hasUnsyncedChanges,
            lastSyncTime,
            signInWithGoogle,
            signOut,
            syncWithCloud,
            requestNotificationPermission,
            sendLocalNotification,


            addClockwork,

            completeClockwork,
            deleteClockwork,
            skipClockwork,
            missClockwork,
            updateClockwork,
            shiftClockwork,
            timezone,
            updateTimezone,
            installApp,
            isInstallable
        }}>
            {children}
        </ClockworkContext.Provider>
    );
}


export function useClockwork() {
    const context = useContext(ClockworkContext);
    if (context === undefined) {
        throw new Error('useClockwork must be used within a ClockworkProvider');
    }
    return context;
}


export function getEffectiveNextDue(clockwork: Clockwork): string {
    return getEffectiveDate(clockwork.nextDue, clockwork.dueDateOffset);
}
