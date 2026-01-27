"use client";

import React, { useState } from 'react';
import { useClockwork, Clockwork } from '../context/ClockworkContext';
import { Bell, Calendar } from 'lucide-react';
import DatePicker from '../components/DatePicker';
import { useRouter } from 'next/navigation';

const iconOptions = ['🧴', '🌱', '🛏️', '💆', '🚿', '🧹', '🧺', '🔧', '🚗', '💊', '🐕', '🐱', '🏃', '🏋️', '🧘', '💅'];
const colorOptions = [
    '#EF4444', '#F59E0B', '#EAB308', '#10B981',
    '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1'
];

const frequencyOptions: { value: Clockwork['frequency']; label: string; description: string }[] = [
    { value: 'daily', label: 'Daily', description: 'Every day' },
    { value: 'alternate', label: 'Alternate Days', description: 'Every 2 days' },
    { value: 'every3days', label: 'Every 3 Days', description: 'Twice a week' },
    { value: 'weekly', label: 'Weekly', description: 'Once a week' },
    { value: 'biweekly', label: 'Bi-weekly', description: 'Every 2 weeks' },
    { value: 'monthly', label: 'Monthly', description: 'Once a month' }
];

export default function CreateClockwork() {
    const { addClockwork } = useClockwork();
    const router = useRouter();
    const today = new Date().toISOString().split('T')[0];

    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState(iconOptions[0]);
    const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
    const [frequency, setFrequency] = useState<Clockwork['frequency']>('alternate');
    const [remindersEnabled, setRemindersEnabled] = useState(true);
    const [startDate, setStartDate] = useState(today);
    const [hasEndDate, setHasEndDate] = useState(false);
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedName = name.trim();
        const trimmedNotes = notes.trim();

        if (trimmedName && trimmedName.length <= 50 && trimmedNotes.length <= 500) {
            addClockwork({
                name: trimmedName,
                icon: selectedIcon,
                color: selectedColor,
                frequency,
                nextDue: startDate,
                remindersEnabled,
                notes: trimmedNotes || undefined,

                startDate,
                endDate: hasEndDate && endDate ? endDate : null,
                missedDates: [],
                skippedDates: []
            });

            router.push('/today');
        }
    };

    return (
        <div className="max-w-md mx-auto px-4 py-4">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Clockwork Name */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Clockwork Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Shampoo hair"
                        maxLength={50}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                    />
                    <p className="text-[10px] text-right text-gray-400 mt-1">{name.length}/50</p>
                </div>


                {/* Icon Selection */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Choose an Icon
                    </label>
                    <div className="grid grid-cols-8 gap-2">
                        {iconOptions.map((icon) => (
                            <button
                                key={icon}
                                type="button"
                                onClick={() => setSelectedIcon(icon)}
                                className={`aspect-square text-2xl rounded-xl flex items-center justify-center transition-all ${selectedIcon === icon
                                    ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110'
                                    : 'bg-gray-50 hover:bg-gray-100'
                                    }`}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Color Selection */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Choose a Color
                    </label>
                    <div className="flex gap-3 flex-wrap">
                        {colorOptions.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setSelectedColor(color)}
                                className={`w-12 h-12 rounded-full transition-all ${selectedColor === color
                                    ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                                    : 'hover:scale-105'
                                    }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>

                {/* Frequency */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Frequency
                    </label>
                    <div className="space-y-2">
                        {frequencyOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setFrequency(option.value)}
                                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${frequency === option.value
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">{option.label}</p>
                                        <p className="text-xs text-gray-500">{option.description}</p>
                                    </div>
                                    {frequency === option.value && (
                                        <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Reminders */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setRemindersEnabled(!remindersEnabled)}
                        className="w-full flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${remindersEnabled ? 'bg-indigo-100' : 'bg-gray-100'
                                }`}>
                                <Bell className={`w-5 h-5 ${remindersEnabled ? 'text-indigo-600' : 'text-gray-400'}`} />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-gray-900">Enable Reminders</p>
                                <p className="text-xs text-gray-500">Get notified when due</p>
                            </div>
                        </div>
                        <div className={`w-12 h-7 rounded-full transition-colors ${remindersEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                            }`}>
                            <div className={`w-5 h-5 bg-white rounded-full mt-1 transition-transform ${remindersEnabled ? 'ml-6' : 'ml-1'
                                }`} />
                        </div>
                    </button>
                </div>

                {/* Start Date */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <DatePicker
                        value={startDate}
                        onChange={setStartDate}
                        label="Start Date"
                    />
                </div>

                {/* End Date */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setHasEndDate(!hasEndDate)}
                        className="w-full flex items-center justify-between mb-3"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasEndDate ? 'bg-indigo-100' : 'bg-gray-100'
                                }`}>
                                <Calendar className={`w-5 h-5 ${hasEndDate ? 'text-indigo-600' : 'text-gray-400'}`} />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-gray-900">Set End Date</p>
                                <p className="text-xs text-gray-500">No limit by default</p>
                            </div>
                        </div>
                        <div className={`w-12 h-7 rounded-full transition-colors ${hasEndDate ? 'bg-indigo-600' : 'bg-gray-300'
                            }`}>
                            <div className={`w-5 h-5 bg-white rounded-full mt-1 transition-transform ${hasEndDate ? 'ml-6' : 'ml-1'
                                }`} />
                        </div>
                    </button>
                    {hasEndDate && (
                        <DatePicker
                            value={endDate}
                            onChange={setEndDate}
                            minDate={startDate}
                            label="End Date"
                        />
                    )}
                </div>

                {/* Notes */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Notes (Optional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any additional details..."
                        rows={3}
                        maxLength={500}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                    <p className="text-[10px] text-right text-gray-400 mt-1">{notes.length}/500</p>
                </div>


                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={!name.trim()}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm active:scale-95"
                >
                    Create Clockwork
                </button>
            </form>
        </div>
    );
}