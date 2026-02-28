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
    showSyncDialog: boolean;
    setShowSyncDialog: (show: boolean) => void;
    handleSyncOption: (option: 'import' | 'merge' | 'fresh') => Promise<void>;
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
    const [showSyncDialog, setShowSyncDialog] = useState(false);
    const [cloudData, setCloudData] = useState<Clockwork[]>([]);
    const hasCheckedCloud = React.useRef(false);

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

    // Suppress benign AbortError from Supabase auth operations
    useEffect(() => {
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const message = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : '';

            // Check if this is the locks.js AbortError from Supabase
            if (reason?.name === 'AbortError' ||
                message.includes('signal is aborted') ||
                message.includes('aborted without reason')) {
                console.log('ℹ️ Suppressed benign AbortError from auth operation');
                event.preventDefault(); // Prevent the error from appearing in console
            }
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
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

    // Helper to sync profile consistently
    const syncProfile = useCallback(async (userId: string) => {
        try {
            const localTz = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
            console.log(`🔄 Upserting profile for ${userId} with timezone ${localTz}`);

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    timezone: localTz,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (error) {
                console.error('❌ Profile upsert FAIL:', error.message, error.details, error.hint);
                return;
            }
            console.log('✅ Profile upsert SUCCESS');
        } catch (err) {
            console.error('❌ syncProfile exception:', err);
        }
    }, [supabase]);

    const syncWithCloud = async () => {
        if (isSyncing) return;
        if (!user) {
            console.log('👤 User not logged in, redirecting to login...');
            await signInWithGoogle();
            return;
        }

        setIsSyncing(true);
        console.log('🔄 Starting cloud sync...');

        // Add a safety timeout (15 seconds) to unstick the UI
        const syncTimeout = setTimeout(() => {
            console.warn('⚠️ Sync timed out after 15 seconds');
            setIsSyncing(false);
        }, 15000);

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

                console.log('📤 Upserting clockworks to Supabase...');
                const { error: upsertError } = await supabase
                    .from('clockworks')
                    .upsert(toSync, { onConflict: 'id' });

                if (upsertError) {
                    console.error('❌ Clockwork Upsert Error:', upsertError);
                    throw upsertError;
                }

                await Promise.all(
                    unsynced.map(item => db.clockworks.update(item.id, { synced: true }))
                );
            }

            // 2. Sync Profile Settings
            console.log('👤 Syncing profile...');
            await syncProfile(user.id);

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

        const initAuth = async () => {
            console.log('🔍 Initializing Auth...');
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (mounted) {
                    const user = session?.user ?? null;
                    setUser(user);
                    setLoading(false);
                    if (user) {
                        syncProfile(user.id);
                    }
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

            // Handle explicit sign out event
            if (event === 'SIGNED_OUT') {
                console.log('👋 User signed out, cleaning up...');
                setUser(null);
                setLoading(false);
                hasCheckedCloud.current = false;
                setShowSyncDialog(false);
                localStorage.removeItem('syncConflictPending');
                setCloudData([]);
                return;
            }

            setUser(user);
            setLoading(false);

            if (user) {
                console.log(`👤 User session active: ${user.email} (Event: ${event})`);

                // Only check for cloud data and show sync dialog on manual LOGIN
                // SIGNED_IN fires after intentional login (including OAuth redirect)
                if (event === 'SIGNED_IN') {
                    console.log(`🔍 Checking cloud data after manual login for user_id: ${user.id}`);

                    const { data, error } = await supabase
                        .from('clockworks')
                        .select('*')
                        .eq('user_id', user.id);

                    if (error) {
                        console.error('❌ Error checking cloud data:', error.message);
                    } else if (data && data.length > 0) {
                        console.log(`☁️ Found ${data.length} cloud records. Opening sync dialog.`);
                        setCloudData(data as Clockwork[]);
                        setShowSyncDialog(true);
                        localStorage.setItem('syncConflictPending', 'true');
                    } else {
                        console.log('☁️ No cloud data found for this account.');
                        localStorage.removeItem('syncConflictPending');
                    }

                    hasCheckedCloud.current = true;
                }

                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
                    syncProfile(user.id);
                }
            } else {
                console.log(`👤 No user session (Event: ${event})`);
                hasCheckedCloud.current = false;
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase, syncProfile]);

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
        } catch (error) {
            if (error instanceof Error) {
                console.error('❌ Login error:', error.message);
            } else {
                console.error('❌ Login error:', error);
            }
        }
    };

    const signOut = async () => {
        console.log('🔄 Signing out...');

        // Immediate UI update for responsive feedback
        // setUser(null); // Removed to prevent race conditions causing AbortError
        setLoading(true);

        try {
            // 1. First, clear the session LOCALLY to ensure UI updates immediately.
            // This avoids the "locks.js" AbortError which happens when the network request hangs or is aborted.
            const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
            if (localError) console.warn('Local signout warning:', localError.message);

            // 2. Optimistically try to notify server (global signout), but don't await it strictly or let it block
            // We use a fire-and-forget approach here to prevent UI freezing
            await supabase.auth.signOut({ scope: 'global' });

            // Clear any local storage remnants
            localStorage.removeItem('lastSyncTime');

        } catch (err) {
            const error = err as Error;
            // Check for AbortError in the catch block as well
            if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
                console.log('ℹ️ Auth request aborted during logout');
                await supabase.auth.signOut({ scope: 'local' }).catch(e => console.log('Local signout fallback also aborted', e));
            } else {
                console.error('❌ Sign out error:', err);
            }
        } finally {
            // Ensure cleanup happens regardless of event firing
            setUser(null);
            setLoading(false);
            hasCheckedCloud.current = false;
            setShowSyncDialog(false);
            localStorage.removeItem('syncConflictPending');
            setCloudData([]);
            console.log('👋 Sign out completed - UI updated');

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


    const handleSyncOption = async (option: 'import' | 'merge' | 'fresh') => {
        if (!user) return;

        try {
            switch (option) {
                case 'import':
                    // Overwrite local data with cloud data
                    await db.clockworks.clear();
                    const cleanImportData = cloudData.map((item) => {
                        const rest = { ...item } as any;
                        delete rest.user_id;
                        delete rest.created_at;
                        return { ...rest, synced: true };
                    });
                    await db.clockworks.bulkAdd(cleanImportData);
                    break;

                case 'merge':
                    // Merge local and cloud
                    const localData = await db.clockworks.toArray();
                    const mergedData: Clockwork[] = [...localData];

                    for (const cloudRaw of cloudData) {
                        const cloudItem = { ...cloudRaw } as any;
                        delete cloudItem.user_id;
                        delete cloudItem.created_at;
                        const localIndex = mergedData.findIndex(
                            l => l.name === cloudItem.name && l.frequency === cloudItem.frequency
                        );

                        if (localIndex !== -1) {
                            // Match found: Merge
                            const localItem = mergedData[localIndex];
                            mergedData[localIndex] = {
                                ...cloudItem, // Start with cloud, but local is primary for non-array
                                ...localItem,
                                // Array attributes: merge unique
                                completedDates: Array.from(new Set([...(localItem.completedDates || []), ...(cloudItem.completedDates || [])])),
                                missedDates: Array.from(new Set([...(localItem.missedDates || []), ...(cloudItem.missedDates || [])])),
                                skippedDates: Array.from(new Set([...(localItem.skippedDates || []), ...(cloudItem.skippedDates || [])])),
                                synced: false
                            };
                        } else {
                            // No match: Add as new (could be different name or same name different frequency)
                            mergedData.push({ ...cloudItem, synced: false });
                        }
                    }

                    await db.clockworks.clear();
                    await db.clockworks.bulkAdd(mergedData);
                    break;

                case 'fresh':
                    // Remove all cloud data
                    const { error } = await supabase
                        .from('clockworks')
                        .delete()
                        .eq('user_id', user.id);

                    if (error) throw error;
                    // Mark all local items as unsynced so they get re-uploaded to the fresh cloud
                    await db.clockworks.toCollection().modify({ synced: false });
                    break;
            }

            setShowSyncDialog(false);
            localStorage.removeItem('syncConflictPending');
            setCloudData([]);

            // Sync to cloud immediately after choosing option
            await syncWithCloud();

        } catch (err) {
            console.error('Error handling sync option:', err);
        }
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
            isInstallable,
            showSyncDialog,
            setShowSyncDialog,
            handleSyncOption
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
