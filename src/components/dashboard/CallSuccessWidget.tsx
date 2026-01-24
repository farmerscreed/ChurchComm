import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface CallSuccessWidgetProps {
    completed: number;
    total: number;
}

export function CallSuccessWidget({ completed, total }: CallSuccessWidgetProps) {
    const percentage = total > 0 ? ((completed / total) * 100).toFixed(0) : 0;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Call Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-green-600">{percentage}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                    {completed} of {total} calls completed recently
                </p>
            </CardContent>
        </Card>
    );
}
