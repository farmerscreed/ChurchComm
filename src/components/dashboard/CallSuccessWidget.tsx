import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, CheckCircle } from "lucide-react";

interface CallSuccessWidgetProps {
    completed: number;
    total: number;
}

export function CallSuccessWidget({ completed, total }: CallSuccessWidgetProps) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    const getColorClasses = () => {
        if (percentage >= 80) return "from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800";
        if (percentage >= 50) return "from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 border-yellow-200 dark:border-yellow-800";
        return "from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700";
    };

    const getPercentColor = () => {
        if (percentage >= 80) return "text-green-600 dark:text-green-400";
        if (percentage >= 50) return "text-yellow-600 dark:text-yellow-400";
        return "text-muted-foreground";
    };

    return (
        <Card className={`bg-gradient-to-br ${getColorClasses()}`}>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Success Rate</span>
                    </div>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className={`text-3xl font-bold ${getPercentColor()}`}>
                    {percentage}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {completed} of {total} calls completed
                </p>
                <p className="text-[11px] text-muted-foreground">
                    Last 30 days
                </p>
            </CardContent>
        </Card>
    );
}
