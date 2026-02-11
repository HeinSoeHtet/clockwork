/**
 * Formats the current date or a given date into a YYYY-MM-DD string
 * according to the specified timezone.
 */
export function getLocalToday(timezone: string = 'UTC', date: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

/**
 * Calculates the next due date string based on frequency.
 * Ensures the date is valid in the specified timezone.
 */
export function calculateNextDueDate(completedDate: string, frequency: string, timezone: string = 'UTC'): string {
    // Use a date at noon to avoid boundary issues during day additions
    const date = new Date(`${completedDate}T12:00:00Z`);

    switch (frequency) {
        case 'daily': date.setUTCDate(date.getUTCDate() + 1); break;
        case 'alternate': date.setUTCDate(date.getUTCDate() + 2); break;
        case 'every3days': date.setUTCDate(date.getUTCDate() + 3); break;
        case 'weekly': date.setUTCDate(date.getUTCDate() + 7); break;
        case 'biweekly': date.setUTCDate(date.getUTCDate() + 14); break;
        case 'monthly': date.setUTCMonth(date.getUTCMonth() + 1); break;
    }

    // Format back to YYYY-MM-DD using our timezone helper
    return getLocalToday(timezone, date);
}

/**
 * Gets the effective next due date considering the offset.
 */
export function getEffectiveDate(nextDue: string, offset: number): string {
    if (!offset) return nextDue;
    const date = new Date(`${nextDue}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().split('T')[0];
}
