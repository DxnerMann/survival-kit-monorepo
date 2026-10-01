import {useId} from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import "@/components/stats/ActionChart.css";
import type {CaffeineEntry} from "@/models/CaffeineEntry.tsx";

type DailyMg = {
    date: string;
    label: string;
    mg: number;
    users: Set<string>;
};

const groupCaffeineByDay = (entries: CaffeineEntry[], days: number, perPerson: boolean): DailyMg[] => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);

    const buckets = new Map<string, DailyMg>();
    for (let i = 0; i <= days; i++) {
        const d = new Date(cutoff);
        d.setDate(cutoff.getDate() + i);
        const isoDate = d.toISOString().split("T")[0];
        const label = new Intl.DateTimeFormat("de-DE", {
            timeZone: "Europe/Berlin",
            day: "2-digit",
            month: "short",
        }).format(d);
        buckets.set(isoDate, { date: isoDate, label, mg: 0, users: new Set() });
    }

    entries.forEach((entry) => {
        const entryDate = new Date(entry.consumedAt);
        if (entryDate < cutoff || entryDate > now) return;
        const isoDate = entryDate.toISOString().split("T")[0];
        const bucket = buckets.get(isoDate);
        if (!bucket) return;
        bucket.mg += entry.amountMg;
        bucket.users.add(entry.userId);
    });

    return Array.from(buckets.values()).map((bucket) => ({
        ...bucket,
        mg: perPerson && bucket.users.size > 0 ? bucket.mg / bucket.users.size : bucket.mg,
    }));
};

type CaffeineDailyChartProps = {
    entries: CaffeineEntry[];
    title: string;
    perPerson?: boolean;
};

const CaffeineDailyChart = ({ entries, title, perPerson = false }: CaffeineDailyChartProps) => {
    const gradientId = useId().replace(/:/g, "");
    const data = groupCaffeineByDay(entries, 7, perPerson);

    return (
        <div className="action-chart">
            <h4 className="action-chart__title">{title}</h4>
            <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary-accent)" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="var(--color-primary-accent)" stopOpacity={0.05} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis
                        dataKey="label"
                        interval={Math.ceil(data.length / 8)}
                        tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
                        axisLine={{ stroke: "var(--color-border)" }}
                        tickLine={{ stroke: "var(--color-border)" }}
                    />
                    <YAxis
                        allowDecimals={perPerson}
                        width={40}
                        tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
                        axisLine={{ stroke: "var(--color-border)" }}
                        tickLine={{ stroke: "var(--color-border)" }}
                        unit="mg"
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--color-background-primary)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "0.5rem",
                            boxShadow: "0 2px 8px var(--color-shadow)",
                            color: "var(--color-text-primary)",
                        }}
                        formatter={(value) => [`${value} mg`, "Koffein"] as [string, string]}
                    />
                    <Area
                        type="monotone"
                        dataKey="mg"
                        stroke="var(--color-primary-accent)"
                        fill={`url(#${gradientId})`}
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CaffeineDailyChart;
