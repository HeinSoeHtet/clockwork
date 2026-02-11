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
    dueDateOffset: number;
}

export class MyDatabase extends Dexie {
    clockworks!: Table<Clockwork>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings!: Table<{ id: string; value: any; timestamp: number }>;

    constructor() {
        super('ClockworkDB');
        this.version(3).stores({
            clockworks: 'id, name, frequency, nextDue, synced',
            settings: 'id'
        });
    }
}

export const db = new MyDatabase();

