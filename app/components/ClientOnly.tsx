"use client";

import { useEffect, useState, ReactNode } from "react";

export default function ClientOnly({ children }: { children: ReactNode }) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setHasMounted(true);
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    if (!hasMounted) {
        return null;
    }

    return <>{children}</>;
}