"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db, type Clockwork } from '@/lib/db';


import { useLiveQuery } from 'dexie-react-hooks';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export type { Clockwork };

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


    addClockwork: (clockwork: Omit<Clockwork, 'id' | 'lastCompleted' | 'streak' | 'completedDates' | 'missedDates' | 'skippedDates' | 'synced' | 'dueDateOffset'>) => void;


    completeClockwork: (id: string) => void;
    deleteClockwork: (id: string) => void;
    skipClockwork: (id: string) => void;
    missClockwork: (id: string, missDate: string) => void;
    updateClockwork: (id: string, updates: Partial<Clockwork>) => void;
    shiftClockwork: (id: string, days: number) => void;
}


const ClockworkContext = createContext<ClockworkContextType | undefined>(undefined);

export function ClockworkProvider({ children }: { children: React.ReactNode }) {
    const clockworks = useLiveQuery(() => db.clockworks.toArray()) || [];
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const savedTime = localStorage.getItem('lastSyncTime');
        if (savedTime) setLastSyncTime(savedTime);
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

        const today = new Date().toISOString().split('T')[0];
        const newCompletedDates = [today, ...clockwork.completedDates];
        const newStreak = clockwork.streak + 1;
        // Maintain sequence by calculating from original nextDue, not today
        const nextDue = calculateNextDue(clockwork.nextDue, clockwork.frequency);

        await db.clockworks.update(id, {
            lastCompleted: today,
            completedDates: newCompletedDates,
            streak: newStreak,
            nextDue,
            dueDateOffset: 0,
            synced: false
        });
    }, []);

    const skipClockwork = useCallback(async (id: string) => {
        const clockwork = await db.clockworks.get(id);
        if (!clockwork) return;

        const today = new Date().toISOString().split('T')[0];
        const newSkippedDates = [today, ...clockwork.skippedDates];
        // Maintain sequence by calculating from original nextDue
        const nextDue = calculateNextDue(clockwork.nextDue, clockwork.frequency);

        await db.clockworks.update(id, {
            skippedDates: newSkippedDates,
            nextDue,
            dueDateOffset: 0,
            synced: false
        });
    }, []);

    const sendLocalNotification = (title: string, body: string, tag?: string) => {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const clockworkId = tag?.replace('clockwork-', '');

        const options = {
            body,
            icon: '/icon.png',
            badge: '/icon.png',
            tag: tag || 'clockwork-reminder',
            actions: [
                { action: 'complete', title: 'Mark as Complete' },
                { action: 'skip', title: 'Skip for Now' }
            ],
            vibrate: [100, 50, 100],
            data: {
                url: window.location.origin + '/today',
                clockworkId: clockworkId
            }
        } as any;

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification(title, options);
            });
        } else {
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

    // Periodic reminder check
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // Only notify if it's a reasonable hour (e.g., after 8 AM)
            if (now.getHours() < 8) return;

            const dueItems = clockworks.filter(c => {
                const effectiveDue = getEffectiveNextDue(c);
                return c.remindersEnabled && effectiveDue === todayStr;
            });

            if (dueItems.length > 0) {
                const lastNotified = localStorage.getItem('lastNotificationTimestamp');
                const fourHoursInMs = 4 * 60 * 60 * 1000;

                const shouldNotify = !lastNotified || (now.getTime() - parseInt(lastNotified)) >= fourHoursInMs;

                if (shouldNotify) {
                    dueItems.forEach(item => {
                        sendLocalNotification(
                            `${item.icon} ${item.name}`,
                            `It's time for your ${item.frequency} routine!`,
                            `clockwork-${item.id}`
                        );
                    });
                    localStorage.setItem('lastNotificationTimestamp', now.getTime().toString());
                }
            } else {
                // If nothing due, clear existing reminder
                clearNotifications();
                localStorage.removeItem('lastNotificationTimestamp');
            }
        };

        // Check every 1 hour to catch the 4-hour window accurately
        const interval = setInterval(checkReminders, 1000 * 60 * 60);
        checkReminders(); // Initial check

        return () => clearInterval(interval);
    }, [clockworks]);
    // Auto-miss overdue items
    useEffect(() => {
        const handleAutoMiss = async () => {
            const todayStr = new Date().toISOString().split('T')[0];
            const overdue = clockworks.filter(c => c.nextDue < todayStr);

            if (overdue.length > 0) {
                for (const item of overdue) {
                    console.log(`⏰ Auto-missing overdue task: ${item.name}`);
                    const newMissedDates = [item.nextDue, ...item.missedDates];
                    const newNextDue = calculateNextDue(item.nextDue, item.frequency);

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
    }, [clockworks]);






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
            console.log('User not logged in, redirecting to login...');
            await signInWithGoogle();
            return;
        }

        setIsSyncing(true);

        console.log('🔄 Starting cloud sync...');
        try {
            const unsynced = await db.clockworks.filter(c => !c.synced).toArray();
            console.log(`Found ${unsynced.length} unsynced items`);

            if (unsynced.length === 0) return;

            // Map local data to include user_id for Supabase
            const toSync = unsynced.map(({ synced, ...item }) => ({
                ...item,
                user_id: user.id
            }));

            const { data, error } = await supabase
                .from('clockworks')
                .upsert(toSync, { onConflict: 'id' });

            if (error) {
                console.error('❌ Supabase Upsert Error:', error);
                throw error;
            }

            console.log('✅ Cloud upsert successful:', data);

            // Mark as synced locally
            await Promise.all(
                unsynced.map(item => db.clockworks.update(item.id, { synced: true }))
            );
            const now = new Date().toISOString();
            setLastSyncTime(now);
            localStorage.setItem('lastSyncTime', now);
            console.log('✅ Local records marked as synced');

        } catch (error) {

            console.error('❌ Sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    };



    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
            } finally {
                setLoading(false);
            }
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/profile`
            }
        });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
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
        const nextDue = calculateNextDue(missDate, clockwork.frequency);

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
            shiftClockwork
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

function calculateNextDue(completedDate: string, frequency: Clockwork['frequency']): string {
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

export function getEffectiveNextDue(clockwork: Clockwork): string {
    if (!clockwork.dueDateOffset) return clockwork.nextDue;

    const date = new Date(clockwork.nextDue);
    date.setDate(date.getDate() + clockwork.dueDateOffset);
    return date.toISOString().split('T')[0];
}
