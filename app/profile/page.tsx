"use client";

import { useClockwork } from '../context/ClockworkContext';
import { Calendar, TrendingUp, Zap, User, LogOut, Bell, BellOff, BellRing, Globe, Download } from 'lucide-react';
import { useState, useEffect } from 'react';

function LiveTime({ timezone }: { timezone: string }) {
    const [time, setTime] = useState('');

    useEffect(() => {
        const update = () => {
            const now = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            }).format(new Date());
            setTime(now);
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [timezone]);

    return (
        <span className="text-[10px] font-mono font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
            {time}
        </span>
    );
}

const utcOffsets = [
    { label: 'UTC -12', value: 'Etc/GMT+12' },
    { label: 'UTC -11', value: 'Etc/GMT+11' },
    { label: 'UTC -10', value: 'Etc/GMT+10' },
    { label: 'UTC -9', value: 'Etc/GMT+9' },
    { label: 'UTC -8', value: 'Etc/GMT+8' },
    { label: 'UTC -7', value: 'Etc/GMT+7' },
    { label: 'UTC -6', value: 'Etc/GMT+6' },
    { label: 'UTC -5', value: 'Etc/GMT+5' },
    { label: 'UTC -4', value: 'Etc/GMT+4' },
    { label: 'UTC -3', value: 'Etc/GMT+3' },
    { label: 'UTC -2', value: 'Etc/GMT+2' },
    { label: 'UTC -1', value: 'Etc/GMT+1' },
    { label: 'UTC 0', value: 'Etc/GMT-0' },
    { label: 'UTC +1', value: 'Etc/GMT-1' },
    { label: 'UTC +2', value: 'Etc/GMT-2' },
    { label: 'UTC +3', value: 'Etc/GMT-3' },
    { label: 'UTC +4', value: 'Etc/GMT-4' },
    { label: 'UTC +5', value: 'Etc/GMT-5' },
    { label: 'UTC +6', value: 'Etc/GMT-6' },
    { label: 'UTC +7', value: 'Etc/GMT-7' },
    { label: 'UTC +8', value: 'Etc/GMT-8' },
    { label: 'UTC +9', value: 'Etc/GMT-9' },
    { label: 'UTC +10', value: 'Etc/GMT-10' },
    { label: 'UTC +11', value: 'Etc/GMT-11' },
    { label: 'UTC +12', value: 'Etc/GMT-12' },
    { label: 'UTC +13', value: 'Etc/GMT-13' },
    { label: 'UTC +14', value: 'Etc/GMT-14' },
];
export default function Profile() {
    const {
        clockworks,
        user,
        loading,
        isSyncing,
        syncWithCloud,
        signInWithGoogle,
        signOut,
        requestNotificationPermission,
        timezone,
        updateTimezone,
        installApp,
        isInstallable
    } = useClockwork();

    const [showTzModal, setShowTzModal] = useState(false);
    const [pendingTz, setPendingTz] = useState('');

    const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'default'>(
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
    );

    const handleRequestPermission = async () => {
        const granted = await requestNotificationPermission();
        if (granted) {
            setNotificationStatus('granted');
        } else {
            setNotificationStatus('denied');
        }
    };



    const totalClockworks = clockworks.length;
    const activeClockworks = clockworks.filter(c => c.streak > 0).length;
    const longestStreak = clockworks.reduce((max, c) => Math.max(max, c.streak), 0);
    const totalStreakDays = clockworks.reduce((sum, c) => sum + c.streak, 0);

    const stats = [
        { label: 'Total Clockworks', value: totalClockworks, icon: Calendar, color: '#8B5CF6' },
        { label: 'Active Streaks', value: activeClockworks, icon: TrendingUp, color: '#F59E0B' },
        { label: 'Longest Streak', value: longestStreak, icon: Zap, color: '#EF4444' }
    ];

    // Calculate frequency distribution
    const frequencyCount = clockworks.reduce((acc, c) => {
        acc[c.frequency] = (acc[c.frequency] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const frequencyLabels: Record<string, string> = {
        daily: 'Daily',
        alternate: 'Alternate Days',
        every3days: 'Every 3 Days',
        weekly: 'Weekly',
        biweekly: 'Bi-weekly',
        monthly: 'Monthly'
    };

    return (
        <div className="max-w-md mx-auto px-4 py-4">
            {/* User Info */}
            <div className="relative bg-white rounded-2xl p-6 shadow-sm mb-6 text-center overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                {loading ? (
                    <div className="animate-pulse">
                        <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4" />
                        <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-6" />
                        <div className="h-12 bg-gray-200 rounded-2xl w-full" />
                    </div>
                ) : user ? (
                    <>
                        <div className="relative inline-block mb-4">
                            {user.user_metadata.avatar_url ? (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt={user.user_metadata.full_name}
                                    className="w-20 h-20 rounded-full border-4 border-gray-50 shadow-md"
                                />
                            ) : (
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                                    <User className="w-10 h-10 text-white" />
                                </div>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">
                            {user.user_metadata.full_name || 'My Profile'}
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">{user.email}</p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={syncWithCloud}
                                disabled={isSyncing}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                <Globe className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
                            </button>

                            <button
                                onClick={signOut}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="w-10 h-10 text-gray-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Guest User</h2>
                        <p className="text-sm text-gray-500 mb-6">Sign in to sync your clockworks across devices</p>

                        <button
                            onClick={signInWithGoogle}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-gray-700 font-semibold hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.13l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continue with Google
                        </button>
                    </>
                )}
            </div>




            {/* Notification Status */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex items-center justify-between border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${notificationStatus === 'granted' ? 'bg-green-50' : notificationStatus === 'denied' ? 'bg-red-50' : 'bg-blue-50'}`}>
                        {notificationStatus === 'granted' ? (
                            <BellRing className="w-5 h-5 text-green-600" />
                        ) : notificationStatus === 'denied' ? (
                            <BellOff className="w-5 h-5 text-red-500" />
                        ) : (
                            <Bell className="w-5 h-5 text-blue-500" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">
                            {notificationStatus === 'granted' ? 'Notifications Active' : 'Enable Reminders'}
                        </p>
                        <p className="text-xs text-gray-500">
                            {notificationStatus === 'granted'
                                ? 'You will receive morning alerts for due tasks'
                                : notificationStatus === 'denied'
                                    ? 'Permission was denied. Enable in browser settings'
                                    : 'Get push-style notifications on your device'}
                        </p>
                    </div>
                </div>
                {notificationStatus === 'default' && (
                    <button
                        onClick={handleRequestPermission}
                        className="text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                    >
                        Enable
                    </button>
                )}
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        <Globe className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Preferences</h3>
                        <p className="text-xs text-gray-500">Customize your experience</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Timezone
                            </label>
                            <LiveTime timezone={timezone} />
                        </div>
                        <div className="relative">
                            <select
                                value={timezone}
                                onChange={(e) => {
                                    setPendingTz(e.target.value);
                                    setShowTzModal(true);
                                }}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                            >
                                {!utcOffsets.find(o => o.value === timezone) && (
                                    <option value={timezone}>{timezone.replace(/_/g, ' ')}</option>
                                )}
                                {utcOffsets.map((offset) => (
                                    <option key={offset.value} value={offset.value}>
                                        {offset.label}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                        <p className="mt-2 text-[10px] text-gray-400">
                            This affects when your day resets and when you receive notifications.
                        </p>
                    </div>
                </div>
            </div>
            {/* Preference Section End */}

            {/* Install App Section (Only if installable) */}
            {isInstallable && (
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-5 shadow-lg mb-6 text-white relative overflow-hidden">
                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                    <div className="relative z-10 text-center">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Download className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-bold text-lg mb-1">Get the App</h3>
                        <p className="text-white/80 text-xs mb-4 max-w-[200px] mx-auto leading-relaxed">
                            Install for a full-screen experience and reliable reminders.
                        </p>
                        <button
                            onClick={installApp}
                            className="w-full py-3 bg-white text-indigo-600 rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all hover:bg-gray-50"
                        >
                            Add to Home Screen
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                                style={{ backgroundColor: `${stat.color}20` }}
                            >
                                <Icon className="w-5 h-5" style={{ color: stat.color }} />
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                            <p className="text-xs text-gray-600">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Total Streak Days */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-5 shadow-sm mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-orange-900 mb-1">Total Streak Days</p>
                        <p className="text-3xl font-bold text-orange-600">{totalStreakDays}</p>
                    </div>
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">🔥</span>
                    </div>
                </div>
            </div>

            {/* Frequency Breakdown */}
            {totalClockworks > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Clockwork Breakdown</h3>
                    <div className="space-y-3">
                        {Object.entries(frequencyCount).map(([freq, count]) => (
                            <div key={freq} className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">{frequencyLabels[freq]}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full transition-all"
                                            style={{ width: `${(count / totalClockworks) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">{count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Streaks */}
            {clockworks.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4">Top Streaks</h3>
                    <div className="space-y-3">
                        {clockworks
                            .sort((a, b) => b.streak - a.streak)
                            .slice(0, 5)
                            .map((schedule, index) => (
                                <div key={schedule.id} className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                                        style={{ backgroundColor: `${schedule.color}20` }}
                                    >
                                        {schedule.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{schedule.name}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-lg">🔥</span>
                                        <span className="font-bold text-orange-600">{schedule.streak}</span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
            {/* Timezone Confirmation Modal */}
            {showTzModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <Globe className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">Change Timezone?</h3>
                        <p className="text-sm text-gray-500 text-center mb-6">
                            Changing your timezone to <span className="font-semibold text-indigo-600">{utcOffsets.find(o => o.value === pendingTz)?.label}</span> will shift your daily schedule. This change will be saved locally.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowTzModal(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    updateTimezone(pendingTz);
                                    setShowTzModal(false);
                                }}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}