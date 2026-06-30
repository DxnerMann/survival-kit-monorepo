import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import "./ActionChart.css";
import type {TrackAction} from "../models/TrackAction.tsx";

type DailyCount = {
    date: string;
    label: string;
    count: number;
};

const groupActionsByDay = (
    actions: TrackAction[],
    days: number = 30
): DailyCount[] => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);

    const buckets = new Map<string, DailyCount>();
    for (let i = 0; i <= days; i++) {
        const d = new Date(cutoff);
        d.setDate(cutoff.getDate() + i);
        const isoDate = d.toISOString().split("T")[0];
        const label = new Intl.DateTimeFormat("de-DE", {
            timeZone: "Europe/Berlin",
            day: "2-digit",
            month: "short",
        }).format(d);
        buckets.set(isoDate, { date: isoDate, label, count: 0 });
    }

    actions.forEach((action) => {
        const actionDate = new Date(action.timestamp);
        if (actionDate < cutoff || actionDate > now) return;

        const isoDate = actionDate.toISOString().split("T")[0];
        const bucket = buckets.get(isoDate);
        if (bucket) bucket.count += 1;
    });

    return Array.from(buckets.values());
};

type ActionChartProps = {
    actions: TrackAction[];
    title: string;
};

const ActionChart = ({ actions, title }: ActionChartProps) => {
    const data = groupActionsByDay(actions, 30);

    return (
        <div className="action-chart">
            <h4 className="action-chart__title">{title}</h4>
            <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="actionChartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop
                                offset="5%"
                                stopColor="var(--color-primary-accent)"
                                stopOpacity={0.5}
                            />
                            <stop
                                offset="95%"
                                stopColor="var(--color-primary-accent)"
                                stopOpacity={0.05}
                            />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--color-border)"
                    />
                    <XAxis
                        dataKey="label"
                        interval={Math.ceil(data.length / 10)}
                        tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
                        axisLine={{ stroke: "var(--color-border)" }}
                        tickLine={{ stroke: "var(--color-border)" }}
                    />
                    <YAxis
                        allowDecimals={false}
                        width={30}
                        tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
                        axisLine={{ stroke: "var(--color-border)" }}
                        tickLine={{ stroke: "var(--color-border)" }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--color-background-primary)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "0.5rem",
                            boxShadow: "0 2px 8px var(--color-shadow)",
                            color: "var(--color-text-primary)",
                        }}
                        labelStyle={{ color: "var(--color-text-primary)" }}
                        itemStyle={{ color: "var(--color-primary-accent)" }}
                        formatter={(value) => [`${value}`, "Anzahl"] as [string, string]}
                        labelFormatter={(label) => `${label}`}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="var(--color-primary-accent)"
                        fill="url(#actionChartGradient)"
                        strokeWidth={2}
                        activeDot={{
                            r: 5,
                            fill: "var(--color-primary-accent)",
                            stroke: "var(--color-background-primary)",
                            strokeWidth: 2,
                        }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ActionChart;