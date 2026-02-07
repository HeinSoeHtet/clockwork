"use client";

import { usePathname, useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useClockwork } from '../context/ClockworkContext';
import { ArrowLeft } from 'lucide-react';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const params = useParams();
    const { clockworks } = useClockwork();

    const dateString = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    const getHeaderConfig = () => {
        if (pathname === '/today') {
            return {
                title: "Today's Clockworks",
                subtitle: dateString,
                gradient: "from-indigo-500 to-purple-600",
                subtitleColor: "text-indigo-100",
                themeColor: "#6366f1", // indigo-500
                backgroundClass: "bg-indigo-500",
                showBack: false
            };
        }
        if (pathname === '/list') {
            return {
                title: "All Clockworks",
                subtitle: `${clockworks.length} clockwork${clockworks.length !== 1 ? 's' : ''} total`,
                gradient: "from-amber-500 to-orange-600",
                subtitleColor: "text-amber-100",
                themeColor: "#f59e0b", // amber-500
                backgroundClass: "bg-amber-500",
                showBack: false
            };
        }
        if (pathname === '/create') {
            return {
                title: "Create Clockwork",
                subtitle: "Set up recurring tasks and reminders",
                gradient: "from-emerald-500 to-teal-600",
                subtitleColor: "text-emerald-100",
                themeColor: "#10b981", // emerald-500
                backgroundClass: "bg-emerald-500",
                showBack: false
            };
        }
        if (pathname === '/profile') {
            return {
                title: "Profile",
                subtitle: "Your clockwork tracking journey",
                gradient: "from-pink-500 to-rose-600",
                subtitleColor: "text-pink-100",
                themeColor: "#ec4899", // pink-500
                backgroundClass: "bg-pink-500",
                showBack: false
            };
        }
        if (pathname.startsWith('/list/')) {
            return {
                title: "Details",
                subtitle: null,
                gradient: "from-blue-500 to-indigo-600",
                subtitleColor: "text-blue-100",
                themeColor: "#3b82f6", // blue-500
                backgroundClass: "bg-blue-500",
                showBack: true
            };
        }
        return null;
    };

    const config = getHeaderConfig();

    useEffect(() => {
        if (config?.themeColor) {
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) {
                meta.setAttribute('content', config.themeColor);
            } else {
                const newMeta = document.createElement('meta');
                newMeta.name = 'theme-color';
                newMeta.content = config.themeColor;
                document.head.appendChild(newMeta);
            }
        }
    }, [config?.themeColor]);

    if (!config) return null;

    return (
        <div className={`sticky top-0 z-50 flex-shrink-0 bg-gradient-to-br ${config.gradient} transition-all duration-500`}>
            <div className="safe-area-top" />
            <div className="relative pb-10 md:pb-6 tracking-tight">
                <div className="max-w-md mx-auto px-4 pt-4">
                    <div className="flex items-center gap-3">
                        {config.showBack && (
                            <button
                                onClick={() => router.back()}
                                className="p-2 -ml-2 hover:bg-white/20 rounded-full transition-all active:scale-90"
                            >
                                <ArrowLeft className="w-5 h-5 text-white" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-white mb-0.5 tracking-tight">{config.title}</h1>
                            {config.subtitle && (
                                <p className={`text-xs font-medium ${config.subtitleColor} opacity-90 tracking-wide`}>{config.subtitle}</p>
                            )}
                        </div>
                    </div>
                </div>
                {/* Wave SVG - Only visible on mobile, overlapping slightly to avoid artifacts */}
                <div className="absolute -bottom-px left-0 right-0 md:hidden pointer-events-none">
                    <svg
                        viewBox="0 0 1440 64"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-12 block translate-y-px"
                        preserveAspectRatio="none"
                        shapeRendering="geometricPrecision"
                    >
                        <path d="M0 0 C360 64 1080 64 1440 0 V64 H0 Z" fill="#F9FAFB" />
                    </svg>
                </div>
                {/* Desktop straight bottom border */}
                <div className="hidden md:block absolute bottom-0 left-0 right-0 h-px bg-white/10" />
            </div>
        </div>
    );
}
