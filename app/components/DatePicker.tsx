import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    minDate?: string;
    label: string;
}

export default function DatePicker({ value, onChange, minDate, label }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => {
        return value || new Date().toISOString().split('T')[0];
    });

    const parseDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDisplayDate = (dateStr: string) => {
        const date = parseDate(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const viewDateObj = parseDate(viewDate);
    const currentMonth = viewDateObj.getMonth();
    const currentYear = viewDateObj.getFullYear();

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const previousMonth = () => {
        const newDate = new Date(currentYear, currentMonth - 1, 1);
        setViewDate(formatDate(newDate));
    };

    const nextMonth = () => {
        const newDate = new Date(currentYear, currentMonth + 1, 1);
        setViewDate(formatDate(newDate));
    };

    const selectDate = (day: number) => {
        const selectedDate = formatDate(new Date(currentYear, currentMonth, day));

        // Check if date is valid (not before minDate)
        if (minDate) {
            const minDateObj = parseDate(minDate);
            const selectedDateObj = parseDate(selectedDate);
            if (selectedDateObj < minDateObj) return;
        }

        onChange(selectedDate);
        setIsOpen(false);
    };

    const isDateDisabled = (day: number) => {
        if (!minDate) return false;
        const dateToCheck = formatDate(new Date(currentYear, currentMonth, day));
        return dateToCheck < minDate;
    };

    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear();
    };

    const isSelected = (day: number) => {
        if (!value) return false;
        const selectedDate = parseDate(value);
        return day === selectedDate.getDate() &&
            currentMonth === selectedDate.getMonth() &&
            currentYear === selectedDate.getFullYear();
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
        const days = [];

        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="aspect-square" />);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const disabled = isDateDisabled(day);
            const selected = isSelected(day);
            const today = isToday(day);

            days.push(
                <button
                    key={day}
                    type="button"
                    onClick={() => !disabled && selectDate(day)}
                    disabled={disabled}
                    className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all ${selected
                        ? 'bg-indigo-600 text-white'
                        : today
                            ? 'bg-indigo-100 text-indigo-600'
                            : disabled
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-700 hover:bg-gray-100'
                        }`}
                >
                    {day}
                </button>
            );
        }

        return days;
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
        <div className="relative">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
                {label}
            </label>

            {/* Display Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-left flex items-center justify-between"
            >
                <span className="text-gray-900">
                    {value ? formatDisplayDate(value) : 'Select date'}
                </span>
                <Calendar className="w-5 h-5 text-gray-400" />
            </button>

            {/* Calendar Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[60]"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Calendar */}
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 z-[70]">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={previousMonth}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>

                            <div className="font-semibold text-gray-900">
                                {monthNames[currentMonth]} {currentYear}
                            </div>

                            <button
                                type="button"
                                onClick={nextMonth}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        {/* Weekday Labels */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {renderCalendar()}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}