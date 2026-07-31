import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import "./ActionChart.css";

type CaffeineChartProps = {
    data: { time: string; mg: number }[];
    title: string;
    showWarningLine?: boolean;
};

const CaffeineChart = ({ data, title, showWarningLine = false }: CaffeineChartProps) => {
    return (
        <div className="action-chart">
            <h4 className="action-chart__title">{title}</h4>
            <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="caffeineChartGradient" x1="0" y1="0" x2="0" y2="1">
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
                        dataKey="time"
                        interval={Math.max(1, Math.ceil(data.length / 12) - 1)}
                        tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
                        axisLine={{ stroke: "var(--color-border)" }}
                        tickLine={{ stroke: "var(--color-border)" }}
                    />
                    <YAxis
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
                        labelStyle={{ color: "var(--color-text-primary)" }}
                        itemStyle={{ color: "var(--color-primary-accent)" }}
                        formatter={(value) => [`${value} mg`, "Koffein"] as [string, string]}
                        labelFormatter={(label) => `${label} Uhr`}
                    />
                    {showWarningLine && (
                        <ReferenceLine
                            y={400}
                            stroke="var(--color-warning, #e6a23c)"
                            strokeDasharray="4 4"
                            label={{ value: "400mg", fill: "var(--color-text-secondary)", fontSize: 12 }}
                        />
                    )}
                    <Area
                        type="monotone"
                        dataKey="mg"
                        stroke="var(--color-primary-accent)"
                        fill="url(#caffeineChartGradient)"
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

export default CaffeineChart;
