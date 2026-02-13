"use client";

import React from 'react';
import { useClockwork } from '../context/ClockworkContext';
import { CloudDownload, Merge, RefreshCw, AlertCircle } from 'lucide-react';

export default function SyncConflictDialog() {
    const { showSyncDialog, handleSyncOption } = useClockwork();

    if (!showSyncDialog) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card text-card-foreground w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-border">
                <div className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <AlertCircle className="w-6 h-6 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Sync Data</h2>
                    </div>

                    <p className="text-muted-foreground mb-8 leading-relaxed">
                        We found existing data in the cloud. How would you like to proceed with your local records?
                    </p>

                    <div className="space-y-4">
                        <button
                            onClick={() => handleSyncOption('import')}
                            className="w-full group flex items-start gap-4 p-4 rounded-2xl bg-secondary/50 hover:bg-secondary transition-all duration-200 text-left border border-border/50 hover:border-primary/20"
                        >
                            <div className="p-2 bg-background rounded-xl group-hover:scale-110 transition-transform">
                                <CloudDownload className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <div className="font-semibold text-foreground">Import from Cloud</div>
                                <div className="text-sm text-muted-foreground">Overwrite everything with cloud data.</div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleSyncOption('merge')}
                            className="w-full group flex items-start gap-4 p-4 rounded-2xl bg-secondary/50 hover:bg-secondary transition-all duration-200 text-left border border-border/50 hover:border-primary/20"
                        >
                            <div className="p-2 bg-background rounded-xl group-hover:scale-110 transition-transform">
                                <Merge className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <div className="font-semibold text-foreground">Merge Data</div>
                                <div className="text-sm text-muted-foreground">Combine local and cloud data smartly.</div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleSyncOption('fresh')}
                            className="w-full group flex items-start gap-4 p-4 rounded-2xl bg-secondary/50 hover:bg-secondary transition-all duration-200 text-left border border-border/50 hover:border-primary/20"
                        >
                            <div className="p-2 bg-background rounded-xl group-hover:scale-110 transition-transform">
                                <RefreshCw className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <div className="font-semibold text-foreground">Fresh Start</div>
                                <div className="text-sm text-muted-foreground">Keep local data and wipe cloud records.</div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="px-8 py-6 bg-secondary/30 border-t border-border mt-2">
                    <p className="text-xs text-center text-muted-foreground">
                        All actions will sync to the cloud immediately.
                    </p>
                </div>
            </div>
        </div>
    );
}
