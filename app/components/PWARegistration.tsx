'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useClockwork } from '../context/ClockworkContext';

export default function PWARegistration() {
    const { installApp, isInstallable } = useClockwork();
    const [showInstallDialog, setShowInstallDialog] = useState(false);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        if (isInstallable) {
            setShowInstallDialog(true);
        }
    }, [isInstallable]);

    useEffect(() => {
        // Handle Service Worker Updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                // Check if there is already a waiting worker on load
                if (registration.waiting) {
                    setWaitingWorker(registration.waiting);
                    setShowUpdateDialog(true);
                }

                // Listen for new waiting workers
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setWaitingWorker(newWorker);
                                setShowUpdateDialog(true);
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
                    window.location.reload();
                }
            });
        }
    }, []);

    const handleInstallClick = async () => {
        await installApp();
        setShowInstallDialog(false);
    };

    const handleUpdateClick = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
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

            {/* Update Dialog */}
            {showUpdateDialog && (
                <div className="fixed top-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-[110] animate-in fade-in slide-in-from-top-8 duration-500">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 shadow-2xl rounded-3xl p-5 relative overflow-hidden">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Download className="w-6 h-6 text-white animate-bounce" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white text-base leading-tight">Update Available</h3>
                                <p className="text-indigo-100 text-xs mt-1 leading-relaxed">
                                    A new version of Clockwork is ready. Update now to get the latest features.
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 flex gap-2">
                            <button
                                onClick={() => setShowUpdateDialog(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                Later
                            </button>
                            <button
                                onClick={handleUpdateClick}
                                className="flex-[2] px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-indigo-600 shadow-lg hover:bg-indigo-50 active:scale-[0.98] transition-all"
                            >
                                Update Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
