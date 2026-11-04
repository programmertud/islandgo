import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
    end: number;
    duration?: number;   // ms
    start?: number;
    decimals?: number;
    enabled?: boolean;   // only start counting when element is visible
}

export function useCountUp({
    end,
    duration = 1800,
    start = 0,
    decimals = 0,
    enabled = true,
}: UseCountUpOptions): string {
    const [count, setCount] = useState(start);
    const rafRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const elapsed = timestamp - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(start + (end - start) * eased);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            startTimeRef.current = null;
        };
    }, [end, duration, start, enabled]);

    return decimals > 0 ? count.toFixed(decimals) : Math.round(count).toString();
}
