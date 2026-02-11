"use client";

import { useClockwork, getEffectiveNextDue } from '../context/ClockworkContext';
import ClockworkCard from '../components/ClockworkCard';
import { Calendar, CloudSync, CloudCheck, AlertCircle, CloudOff, BellRing } from 'lucide-react';
import { useState } from 'react';
import { getLocalToday } from '@/lib/date-utils';



export default function TodayPage() {
    const {
        clockworks,
        completeClockwork,
        deleteClockwork,
        user,
        isSyncing,
        hasUnsyncedChanges,
        lastSyncTime,
        syncWithCloud,
        skipClockwork,
        requestNotificationPermission,
        timezone
    } = useClockwork();

    const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'default'>(
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
    );

    const handleRequestPermission = async () => {
        const granted = await requestNotificationPermission();
        setNotificationStatus(granted ? 'granted' : 'denied');
    };

    const today = getLocalToday(timezone);

    const dueToday = clockworks.filter(c => getEffectiveNextDue(c) === today);
    const overdue = clockworks.filter(c => getEffectiveNextDue(c) < today);
    const totalDueToday = dueToday.length + overdue.length;

    const formatSyncTime = (time: string | null) => {
        if (!time) return 'Never synced';
        const date = new Date(time);
        return `Last synced: ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <div className="max-w-md mx-auto px-4 py-4">
            {/* Notification Prompt */}
            {clockworks.length > 0 && notificationStatus === 'default' && (
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-lg mb-6 text-white animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <BellRing className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">Never miss a beat</p>
                                <p className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold">Enable morning reminders</p>
                            </div>
                        </div>
                        <button
                            onClick={handleRequestPermission}
                            className="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-50 transition-colors active:scale-95"
                        >
                            Enable
                        </button>
                    </div>
                </div>
            )}

            {/* Sync Header */}
            {clockworks.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${!user ? 'bg-blue-50' : isSyncing ? 'bg-indigo-50' : hasUnsyncedChanges ? 'bg-amber-50' : 'bg-green-50'}`}>
                                {!user ? (
                                    <CloudOff className="w-5 h-5 text-blue-500" />
                                ) : isSyncing ? (
                                    <CloudSync className="w-5 h-5 text-indigo-600 animate-spin" />
                                ) : hasUnsyncedChanges ? (
                                    <AlertCircle className="w-5 h-5 text-amber-500" />
                                ) : (
                                    <CloudCheck className="w-5 h-5 text-green-600" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">
                                    {!user ? 'Cloud Sync' : isSyncing ? 'Syncing...' : hasUnsyncedChanges ? 'Unsynced changes' : 'All caught up'}
                                </p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                                    {!user ? 'Sign in to backup data' : formatSyncTime(lastSyncTime)}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => syncWithCloud()}
                            disabled={!!isSyncing || !!(user && !hasUnsyncedChanges)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${(user && !hasUnsyncedChanges)
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700'
                                }`}
                        >
                            {isSyncing ? 'Syncing...' : !user ? 'Sign in to Sync' : 'Sync Now'}
                        </button>
                    </div>
                </div>
            )}


            {/* Overdue */}
            {overdue.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                        Overdue
                    </h2>
                    <div className="space-y-3">
                        {overdue.map(clockwork => (
                            <ClockworkCard
                                key={clockwork.id}
                                clockwork={clockwork}
                                onComplete={completeClockwork}
                                onSkip={skipClockwork}
                                onDelete={deleteClockwork}
                                isOverdue={true}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Due Today */}
            {dueToday.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-semibold text-indigo-600 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                        Due Today
                    </h2>
                    <div className="space-y-3">
                        {dueToday.map(clockwork => (
                            <ClockworkCard
                                key={clockwork.id}
                                clockwork={clockwork}
                                onComplete={completeClockwork}
                                onSkip={skipClockwork}
                                onDelete={deleteClockwork}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {clockworks.length === 0 && (
                <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-2">No clockworks yet</p>
                    <p className="text-sm text-gray-400">Tap Create to add your first clockwork</p>
                </div>
            )}

            {/* All done state */}
            {clockworks.length > 0 && totalDueToday === 0 && (
                <div className="text-center py-12">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-gray-900 font-semibold mb-2">All caught up!</p>
                    <p className="text-sm text-gray-500">No clockworks due today</p>
                </div>
            )}
        </div>
    );
}
