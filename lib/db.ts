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

