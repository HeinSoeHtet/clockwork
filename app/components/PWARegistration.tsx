'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useClockwork } from '../context/ClockworkContext';

export default function PWARegistration() {
    const { installApp, isInstallable } = useClockwork();
    const [showInstallDialog, setShowInstallDialog] = useState(false);

    useEffect(() => {
        if (isInstallable) {
            const frame = requestAnimationFrame(() => {
                setShowInstallDialog(true);
            });
            return () => cancelAnimationFrame(frame);
        }
    }, [isInstallable]);

    useEffect(() => {
        // Handle Service Worker Updates in background
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                // If there's already a waiting worker, skip waiting immediately
                if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }

                // Listen for new workers and skip waiting automatically when installed
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                            }
                        });
                    }
                });
            });

            // Reload when the new service worker takes control
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    console.log('✨ App updated to latest version in background. Refreshing...');
                    window.location.reload();
                }
            });
        }
    }, []);

    const handleInstallClick = async () => {
        await installApp();
        setShowInstallDialog(false);
    };

    return (
        <>
            {/* Install Dialog */}
            {showInstallDialog && (
                <div className="fixed bottom-24 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-80 z-[100] animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-5 relative overflow-hidden group">
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-700" />
                        <button
                            onClick={() => setShowInstallDialog(false)}
                            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 flex-shrink-0">
                                <Download className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1 pr-6">
                                <h3 className="font-bold text-gray-900 text-base leading-tight">Install Clockwork</h3>
                                <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                                    Add to your home screen for a faster, full-screen experience and offline access.
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 flex gap-2">
                            <button
                                onClick={() => setShowInstallDialog(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                Later
                            </button>
                            <button
                                onClick={handleInstallClick}
                                className="flex-[2] px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
                            >
                                Install Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
