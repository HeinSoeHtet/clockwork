"use client";

import { useState } from 'react';
import { useClockwork, getEffectiveNextDue } from '../../context/ClockworkContext';
import { Bell, BellOff, Flame, Trash2, CheckCircle2, XCircle, SkipForward, Plus } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

type HistoryEntry = {
    date: string;
    status: 'completed' | 'skipped' | 'missed';
};

export default function ClockworkDetail() {
    const { clockworks, deleteClockwork, missClockwork } = useClockwork();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const clockwork = clockworks.find(c => c.id === id);

    const [showAddMissModal, setShowAddMissModal] = useState(false);
    const [missDate, setMissDate] = useState('');

    const today = new Date().toISOString().split('T')[0];

    if (!clockwork) {
        return (
            <div className="flex items-center justify-center p-4 text-center">
                <div className="py-20">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Clockwork not found</h2>
                    <button
                        onClick={() => router.push('/list')}
                        className="text-indigo-600 font-medium"
                    >
                        Go back to list
                    </button>
                </div>
            </div>
        );
    }

    const effectiveDue = getEffectiveNextDue(clockwork);

    const frequencyLabels = {
        daily: 'Daily',
        alternate: 'Every 2 days',
        every3days: 'Every 3 days',
        weekly: 'Weekly',
        biweekly: 'Bi-weekly',
        monthly: 'Monthly'
    };

    const getDaysUntil = (dateStr: string) => {
        const dueDate = new Date(dateStr);
        const todayDate = new Date(today);
        const diff = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diff < 0) return `${Math.abs(diff)} days overdue`;
        if (diff === 0) return 'Due today';
        if (diff === 1) return 'Due tomorrow';
        return `Due in ${diff} days`;
    };

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete "${clockwork.name}"? This action cannot be undone.`)) {
            deleteClockwork(clockwork.id);
            router.push('/list');
        }
    };

    const handleAddMiss = () => {
        if (missDate) {
            missClockwork(clockwork.id, missDate);
            setMissDate('');
            setShowAddMissModal(false);
        }
    };

    const history: HistoryEntry[] = [
        ...clockwork.completedDates.map(date => ({ date, status: 'completed' as const })),
        ...clockwork.skippedDates.map(date => ({ date, status: 'skipped' as const })),
        ...clockwork.missedDates.map(date => ({ date, status: 'missed' as const }))
    ].sort((a, b) => b.date.localeCompare(a.date));

    const getStatusColor = (status: HistoryEntry['status']) => {
        switch (status) {
            case 'completed': return { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600', badge: 'bg-green-100' };
            case 'skipped': return { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600', badge: 'bg-blue-100' };
            case 'missed': return { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600', badge: 'bg-red-100' };
        }
    };

    return (
        <div className="max-w-md mx-auto px-4 py-4">
            {/* Icon and Title */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
                <div className="flex items-start gap-4 mb-4">
                    <div
                        className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                        style={{ backgroundColor: `${clockwork.color}20` }}
                    >
                        {clockwork.icon}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{clockwork.name}</h1>
                        <div className="flex items-center gap-2">
                            <span
                                className="px-3 py-1 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: clockwork.color }}
                            >
                                {frequencyLabels[clockwork.frequency]}
                            </span>
                            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100">
                                {clockwork.remindersEnabled ? (
                                    <>
                                        <Bell className="w-3 h-3 text-indigo-600" />
                                        <span className="text-xs font-medium text-indigo-600">Alerts On</span>
                                    </>
                                ) : (
                                    <>
                                        <BellOff className="w-3 h-3 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-500">Alerts Off</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {clockwork.notes && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-700">{clockwork.notes}</p>
                    </div>
                )}
            </div>

            {/* Status Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Status</h2>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Next Due Date</span>
                        <span className="text-sm font-semibold text-gray-900 text-right">
                            {new Date(effectiveDue).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                            })}
                            {clockwork.dueDateOffset !== 0 && (
                                <span className="text-[10px] text-indigo-500 block font-normal">
                                    Shifted by {clockwork.dueDateOffset}d
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <span className={`text-sm font-semibold ${effectiveDue < today ? 'text-red-600' : effectiveDue === today ? 'text-indigo-600' : 'text-gray-600'}`}>
                            {getDaysUntil(effectiveDue)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Statistics</h2>
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-4 bg-orange-50 rounded-xl">
                        <div className="flex items-center justify-center gap-1 mb-2">
                            <Flame className="w-5 h-5 text-orange-600" />
                            <span className="text-2xl font-bold text-orange-600">{clockwork.streak}</span>
                        </div>
                        <p className="text-xs text-orange-900">Streak</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-xl">
                        <div className="flex items-center justify-center gap-1 mb-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="text-2xl font-bold text-red-600">{clockwork.missedDates.length}</span>
                        </div>
                        <p className="text-xs text-red-900">Missed</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <div className="flex items-center justify-center gap-1 mb-2">
                            <SkipForward className="w-5 h-5 text-blue-600" />
                            <span className="text-2xl font-bold text-blue-600">{clockwork.skippedDates.length}</span>
                        </div>
                        <p className="text-xs text-blue-900">Skipped</p>
                    </div>
                </div>
            </div>

            {/* History */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900">Clockwork History</h2>
                    <button onClick={() => setShowAddMissModal(true)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add Miss
                    </button>
                </div>
                {history.length === 0 ? (
                    <div className="text-center py-8"><p className="text-sm text-gray-500">No history yet</p></div>
                ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {history.map((entry, index) => {
                            const colors = getStatusColor(entry.status);
                            return (
                                <div key={entry.date + index} className={`flex items-center justify-between py-3 px-3 ${colors.bg} rounded-lg`}>
                                    <span className="text-sm text-gray-700">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    <span className={`text-xs font-medium ${colors.text} ${colors.badge} px-2 py-0.5 rounded`}>{entry.status}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delete Button */}
            <button onClick={handleDelete} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 mb-6">
                <Trash2 className="w-5 h-5" /> Delete Clockwork
            </button>

            {/* Add Miss Modal */}
            {showAddMissModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Add Missed Date</h3>
                        <input type="date" value={missDate} onChange={(e) => setMissDate(e.target.value)} max={today} className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4" />
                        <div className="flex gap-3">
                            <button onClick={() => setShowAddMissModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl">Cancel</button>
                            <button onClick={handleAddMiss} disabled={!missDate} className="flex-1 py-3 bg-red-600 text-white rounded-xl">Add Miss</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}