"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, type Clockwork, initialData } from '@/lib/db';

import { useLiveQuery } from 'dexie-react-hooks';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export type { Clockwork };



// Initial data is now handled in lib/db.ts populate event


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

    addClockwork: (clockwork: Omit<Clockwork, 'id' | 'lastCompleted' | 'streak' | 'completedDates' | 'synced'>) => void;


    completeClockwork: (id: string) => void;
    deleteClockwork: (id: string) => void;
    skipClockwork: (id: string) => void;
    missClockwork: (id: string, missDate: string) => void;
    updateClockwork: (id: string, updates: Partial<Clockwork>) => void;
}


const ClockworkContext = createContext<ClockworkContextType | undefined>(undefined);

export function ClockworkProvider({ children }: { children: React.ReactNode }) {
    const clockworks = useLiveQuery(() => db.clockworks.toArray()) || [];
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const supabase = createClient();

    // Load lastSyncTime from localStorage on mount
    useEffect(() => {
        const savedTime = localStorage.getItem('lastSyncTime');
        if (savedTime) setLastSyncTime(savedTime);
    }, []);




    // Auto-seed if empty
    useEffect(() => {
        const seedIfEmpty = async () => {
            const count = await db.clockworks.count();
            if (count === 0) {
                await db.clockworks.bulkAdd(initialData);
            }
        };
        seedIfEmpty();
    }, []);


    // Local-first: Check for unsynced changes
    const hasUnsyncedChanges = !!useLiveQuery(
        async () => {
            const unsynced = await db.clockworks.filter(c => !c.synced).toArray();
            return unsynced.length > 0;
        },
        []
    );

    // Removed auto-sync trigger to allow manual sync only


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


    const addClockwork = async (clockwork: Omit<Clockwork, 'id' | 'lastCompleted' | 'streak' | 'completedDates' | 'synced'>) => {

        const newClockwork: Clockwork = {
            ...clockwork,
            id: Date.now().toString(),
            lastCompleted: null,
            streak: 0,
            completedDates: [],
            missedDates: [],
            skippedDates: [],
            synced: false
        };
        await db.clockworks.add(newClockwork);
    };

    const completeClockwork = async (id: string) => {
        const clockwork = await db.clockworks.get(id);
        if (!clockwork) return;

        const today = new Date().toISOString().split('T')[0];
        const newCompletedDates = [today, ...clockwork.completedDates];
        const newStreak = clockwork.streak + 1;
        const nextDue = calculateNextDue(today, clockwork.frequency);

        await db.clockworks.update(id, {
            lastCompleted: today,
            completedDates: newCompletedDates,
            streak: newStreak,
            nextDue,
            synced: false
        });
    };

    const deleteClockwork = async (id: string) => {
        const clockwork = await db.clockworks.get(id);
        if (clockwork && user) {
            // Delete from Cloud too
            await supabase.from('clockworks').delete().eq('id', id);
        }
        await db.clockworks.delete(id);
    };

    const skipClockwork = async (id: string) => {
        const clockwork = await db.clockworks.get(id);
        if (!clockwork) return;

        const today = new Date().toISOString().split('T')[0];
        const newSkippedDates = [today, ...clockwork.skippedDates];
        const nextDue = calculateNextDue(today, clockwork.frequency);

        await db.clockworks.update(id, {
            skippedDates: newSkippedDates,
            nextDue,
            synced: false
        });
    };

    const missClockwork = async (id: string, missDate: string) => {
        const clockwork = await db.clockworks.get(id);
        if (!clockwork) return;

        const newMissedDates = [missDate, ...clockwork.missedDates];

        await db.clockworks.update(id, {
            missedDates: newMissedDates,
            streak: 0,
            synced: false
        });
    };

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

            addClockwork,

            completeClockwork,
            deleteClockwork,
            skipClockwork,
            missClockwork,
            updateClockwork
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
