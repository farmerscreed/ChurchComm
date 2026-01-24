import { Card, CardContent } from "@/components/ui/card";
import { Phone } from "lucide-react";

interface MinuteUsageWidgetProps {
    minutesUsed: number;
    minutesIncluded: number;
}

export function MinuteUsageWidget({ minutesUsed, minutesIncluded }: MinuteUsageWidgetProps) {
    const percentage = minutesIncluded > 0 ? Math.min((minutesUsed / minutesIncluded) * 100, 100) : 0;
    const remaining = Math.max(0, minutesIncluded - minutesUsed);

    // SVG ring chart values
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const getStrokeColor = () => {
        if (percentage >= 80) return "#ef4444";
        if (percentage >= 60) return "#eab308";
        return "#22c55e";
    };

    const getTrackColor = () => {
        if (percentage >= 80) return "#fecaca";
        if (percentage >= 60) return "#fef9c3";
        return "#dcfce7";
    };

    return (
        <Card data-tour="minute-usage" className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
                <div className="flex items-center gap-5">
                    {/* Ring Chart */}
                    <div className="relative flex-shrink-0">
                        <svg width="96" height="96" viewBox="0 0 96 96" className="transform -rotate-90">
                            {/* Track */}
                            <circle
                                cx="48"
                                cy="48"
                                r={radius}
                                fill="none"
                                stroke={getTrackColor()}
                                strokeWidth="8"
                            />
                            {/* Progress */}
                            <circle
                                cx="48"
                                cy="48"
                                r={radius}
                                fill="none"
                                stroke={getStrokeColor()}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-700 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-bold leading-none">{percentage.toFixed(0)}%</span>
                            <span className="text-[10px] text-muted-foreground">used</span>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">AI Minutes</span>
                        </div>
                        <div className="text-2xl font-bold">
                            {remaining.toFixed(0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            minutes remaining
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {minutesUsed.toFixed(0)} of {minutesIncluded} used
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
