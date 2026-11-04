import { createContext, useContext, useState, type ReactNode } from 'react';

export interface DateRange {
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD
}

interface DateRangeContextValue {
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;
}

// Default: current month
const getDefaultRange = (): DateRange => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0];
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString().split('T')[0];
    return { from, to };
};

const DateRangeContext = createContext<DateRangeContextValue>({
    dateRange: getDefaultRange(),
    setDateRange: () => {},
});

export function DateRangeProvider({ children }: { children: ReactNode }) {
    const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange());
    return (
        <DateRangeContext.Provider value={{ dateRange, setDateRange }}>
            {children}
        </DateRangeContext.Provider>
    );
}

export function useDateRange() {
    return useContext(DateRangeContext);
}

/** Format a YYYY-MM-DD string into a readable label like "Apr 1, 2025" */
export function formatDateLabel(iso: string): string {
    if (!iso) return '';
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

/** Common quick-select presets */
export const DATE_PRESETS = [
    {
        label: 'Today',
        getRange: (): DateRange => {
            const today = new Date().toISOString().split('T')[0];
            return { from: today, to: today };
        },
    },
    {
        label: 'This Week',
        getRange: (): DateRange => {
            const now = new Date();
            const day = now.getDay();
            const from = new Date(now);
            from.setDate(now.getDate() - day);
            const to = new Date(from);
            to.setDate(from.getDate() + 6);
            return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
        },
    },
    {
        label: 'This Month',
        getRange: (): DateRange => {
            const now = new Date();
            const from = new Date(now.getFullYear(), now.getMonth(), 1);
            const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
        },
    },
    {
        label: 'Last Month',
        getRange: (): DateRange => {
            const now = new Date();
            const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const to = new Date(now.getFullYear(), now.getMonth(), 0);
            return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
        },
    },
    {
        label: 'Last 3 Months',
        getRange: (): DateRange => {
            const now = new Date();
            const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
        },
    },
    {
        label: 'This Year',
        getRange: (): DateRange => {
            const now = new Date();
            return {
                from: `${now.getFullYear()}-01-01`,
                to: `${now.getFullYear()}-12-31`,
            };
        },
    },
];
