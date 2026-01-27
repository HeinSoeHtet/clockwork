import Dexie, { type Table } from 'dexie';

export interface Clockwork {
    id: string;
    name: string;
    icon: string;
    color: string;
    frequency: 'daily' | 'alternate' | 'every3days' | 'weekly' | 'biweekly' | 'monthly';
    lastCompleted: string | null;
    nextDue: string;
    streak: number;
    completedDates: string[];
    missedDates: string[];
    skippedDates: string[];
    remindersEnabled: boolean;
    startDate: string;
    endDate: string | null;
    notes?: string;
    synced: boolean;
}

export class MyDatabase extends Dexie {
    clockworks!: Table<Clockwork>;

    constructor() {
        super('ClockworkDB');
        this.version(2).stores({
            clockworks: 'id, name, frequency, nextDue, synced'
        });
    }
}

export const db = new MyDatabase();

export const initialData: Clockwork[] = [
    {
        id: '1',
        name: 'Shampoo Hair',
        icon: '🧴',
        color: '#EC4899',
        frequency: 'alternate',
        lastCompleted: '2026-01-25',
        nextDue: '2026-01-27',
        streak: 15,
        completedDates: ['2026-01-25', '2026-01-23', '2026-01-21'],
        missedDates: ['2026-01-15', '2026-01-10'],
        skippedDates: ['2026-01-17'],
        remindersEnabled: true,
        startDate: '2026-01-01',
        endDate: null,
        notes: 'Use moisturizing shampoo',
        synced: false
    },
    {
        id: '2',
        name: 'Water Plants',
        icon: '🌱',
        color: '#10B981',
        frequency: 'every3days',
        lastCompleted: '2026-01-24',
        nextDue: '2026-01-27',
        streak: 8,
        completedDates: ['2026-01-24', '2026-01-21', '2026-01-18'],
        missedDates: ['2026-01-12'],
        skippedDates: [],
        remindersEnabled: true,
        startDate: '2026-01-01',
        endDate: null,
        synced: false
    },
    {
        id: '3',
        name: 'Change Bed Sheets',
        icon: '🛏️',
        color: '#8B5CF6',
        frequency: 'weekly',
        lastCompleted: '2026-01-20',
        nextDue: '2026-01-27',
        streak: 12,
        completedDates: ['2026-01-20', '2026-01-13', '2026-01-06'],
        missedDates: [],
        skippedDates: ['2025-12-30'],
        remindersEnabled: true,
        startDate: '2025-12-01',
        endDate: null,
        synced: false
    }
];
