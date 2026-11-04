import { useRef, useEffect, useState, type ReactNode } from 'react';

interface RevealProps {
    children: ReactNode;
    /** 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' */
    variant?: 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right';
    delay?: number;   // ms
    duration?: number; // ms
    className?: string;
    threshold?: number;
}

const VARIANTS: Record<string, { hidden: string; visible: string }> = {
    'fade-up':    { hidden: 'opacity-0 translate-y-8',     visible: 'opacity-100 translate-y-0' },
    'fade-in':    { hidden: 'opacity-0',                   visible: 'opacity-100' },
    'slide-left': { hidden: 'opacity-0 -translate-x-8',    visible: 'opacity-100 translate-x-0' },
    'slide-right':{ hidden: 'opacity-0 translate-x-8',     visible: 'opacity-100 translate-x-0' },
};

export default function Reveal({
    children,
    variant = 'fade-up',
    delay = 0,
    duration = 600,
    className = '',
    threshold = 0.15,
}: RevealProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold]);

    const { hidden, visible: vis } = VARIANTS[variant] ?? VARIANTS['fade-up'];

    return (
        <div
            ref={ref}
            className={`transition-all ${className} ${visible ? vis : hidden}`.trim()}
            style={{
                transitionDuration: `${duration}ms`,
                transitionDelay: `${delay}ms`,
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            {children}
        </div>
    );
}
