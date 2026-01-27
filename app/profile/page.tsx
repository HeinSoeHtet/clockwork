"use client";

import { useClockwork } from '../context/ClockworkContext';
import { Calendar, TrendingUp, Zap, User, LogOut, CloudSync, CloudCheck, CloudOff } from 'lucide-react';


export default function Profile() {
    const { clockworks, user, loading, isSyncing, syncWithCloud, signInWithGoogle, signOut } = useClockwork();


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

                        <button
                            onClick={signOut}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
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

            {/* Sync Status (Local First) */}
            {user && (
                <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isSyncing ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                            {isSyncing ? (
                                <CloudSync className="w-5 h-5 text-indigo-600 animate-spin" />
                            ) : (
                                <CloudCheck className="w-5 h-5 text-green-600" />
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">
                                {isSyncing ? 'Syncing with cloud...' : 'All synced'}
                            </p>
                            <p className="text-xs text-gray-500">
                                {isSyncing ? 'Updating your clockworks' : 'Your data is safe in the cloud'}
                            </p>
                        </div>
                    </div>
                    {!isSyncing && (
                        <button
                            onClick={() => syncWithCloud()}
                            className="text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Sync Now
                        </button>
                    )}
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
        </div>
    );
}