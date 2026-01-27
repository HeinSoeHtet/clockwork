import { Clockwork } from '../context/ClockworkContext';
import { Flame, CheckCircle2, Calendar, Bell, BellOff } from 'lucide-react';

interface ClockworkCardProps {
    clockwork: Clockwork;
    onComplete: (id: string) => void;
    onSkip: (id: string) => void;
    onDelete?: (id: string) => void;
    isOverdue?: boolean;
}

export default function ClockworkCard({ clockwork, onComplete, onSkip, isOverdue }: ClockworkCardProps) {
    const today = new Date().toISOString().split('T')[0];
    const isCompletedToday = clockwork.lastCompleted === today;

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

    return (
        <div className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isOverdue ? 'ring-2 ring-red-200' : ''}`}>
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
                        <h3 className="font-semibold text-gray-900 mb-1">{clockwork.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                            <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {frequencyLabels[clockwork.frequency]}
                            </span>
                            {clockwork.remindersEnabled ? (
                                <span className="inline-flex items-center gap-1">
                                    <Bell className="w-3 h-3" />
                                    Alerts on
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-gray-400">
                                    <BellOff className="w-3 h-3" />
                                    Alerts off
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                            <span
                                className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-indigo-600'
                                    }`}
                            >
                                {getDaysUntil(clockwork.nextDue)}
                            </span>
                            {clockwork.streak > 0 && (
                                <div className="flex items-center gap-1">
                                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                                    <span className="text-xs font-semibold text-orange-600">{clockwork.streak} streak</span>
                                </div>
                            )}
                        </div>

                        {clockwork.notes && (
                            <p className="text-xs text-gray-500 mb-3">{clockwork.notes}</p>
                        )}

                        {/* Complete Button */}
                        {!isCompletedToday ? (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => onComplete(clockwork.id)}
                                    className="w-full py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95"
                                    style={{
                                        backgroundColor: clockwork.color,
                                        color: 'white'
                                    }}
                                >
                                    Mark as Complete
                                </button>
                                <button
                                    onClick={() => onSkip(clockwork.id)}
                                    className="w-full py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 border border-gray-100 text-gray-600 hover:bg-gray-50"
                                >
                                    Skip for Now
                                </button>
                            </div>
                        ) : (
                            <div
                                className="w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                                style={{
                                    backgroundColor: `${clockwork.color}20`,
                                    color: clockwork.color
                                }}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Completed Today
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
