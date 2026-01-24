import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Phone } from "lucide-react";

interface MinuteUsageWidgetProps {
    minutesUsed: number;
    minutesIncluded: number;
}

export function MinuteUsageWidget({ minutesUsed, minutesIncluded }: MinuteUsageWidgetProps) {
    const percentage = minutesIncluded > 0 ? (minutesUsed / minutesIncluded) * 100 : 0;
    const remaining = Math.max(0, minutesIncluded - minutesUsed);

    const getColor = () => {
        if (percentage >= 80) return "text-red-500";
        if (percentage >= 60) return "text-yellow-500";
        return "text-green-500";
    };

    return (
        <Card data-tour="minute-usage">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Minutes Usage</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${getColor()}`}>
                    {remaining.toFixed(0)} remaining
                </div>
                <Progress value={percentage} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                    {minutesUsed.toFixed(0)} of {minutesIncluded} minutes used
                </p>
            </CardContent>
        </Card>
    );
}
