"use client";

import { useClockwork } from '../context/ClockworkContext';
import { Calendar, Bell, BellOff, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function ClockworkList() {
    const { clockworks, updateClockwork } = useClockwork();

    const frequencyLabels = {
        daily: 'Daily',
        alternate: 'Every 2 days',
        every3days: 'Every 3 days',
        weekly: 'Weekly',
        biweekly: 'Bi-weekly',
        monthly: 'Monthly'
    };

    const sortedClockworks = [...clockworks].sort((a, b) => a.name.localeCompare(b.name));

    const toggleReminders = (id: string, currentValue: boolean) => {
        updateClockwork(id, { remindersEnabled: !currentValue });
    };

    return (
        <div className="max-w-md mx-auto px-4 py-4">
            {clockworks.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-2">No clockworks yet</p>
                    <p className="text-sm text-gray-400">Tap Create to add your first clockwork</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedClockworks.map((clockwork) => (
                        <div key={clockwork.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-4">
                                <div className="flex items-start gap-3">
                                    {/* Icon */}
                                    <div
                                        className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                                        style={{ backgroundColor: `${clockwork.color}20` }}
                                    >
                                        {clockwork.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-1">
                                            <h3 className="font-semibold text-gray-900">{clockwork.name}</h3>
                                            {/* Alert Toggle Icon */}
                                            <button
                                                onClick={() => toggleReminders(clockwork.id, clockwork.remindersEnabled)}
                                                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                {clockwork.remindersEnabled ? (
                                                    <Bell className="w-5 h-5 text-indigo-600" />
                                                ) : (
                                                    <BellOff className="w-5 h-5 text-gray-400" />
                                                )}
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                                            <span className="inline-flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {frequencyLabels[clockwork.frequency]}
                                            </span>
                                        </div>

                                        {clockwork.notes && (
                                            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{clockwork.notes}</p>
                                        )}

                                        {/* View Details Button */}
                                        <Link
                                            href={`/list/${clockwork.id}`}
                                            className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            View Details
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
