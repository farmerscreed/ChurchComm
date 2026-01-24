import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EscalationWidgetProps {
    urgent: number;
    high: number;
    medium: number;
    total: number;
}

export function EscalationWidget({ urgent, high, medium, total }: EscalationWidgetProps) {
    const navigate = useNavigate();

    const hasAlerts = total > 0;
    const borderClass = hasAlerts
        ? "border-orange-300 dark:border-orange-700 shadow-sm shadow-orange-100 dark:shadow-orange-900/20"
        : "border-border";

    return (
        <Card
            className={`cursor-pointer hover:shadow-md transition-shadow ${borderClass}`}
            onClick={() => navigate("/follow-ups")}
        >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Escalation Alerts</CardTitle>
                {hasAlerts ? (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                ) : (
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                )}
            </CardHeader>
            <CardContent>
                {hasAlerts ? (
                    <>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{total} Open</div>
                        <div className="flex gap-2 mt-3 flex-wrap">
                            {urgent > 0 && (
                                <Badge variant="destructive" className="text-xs">{urgent} Urgent</Badge>
                            )}
                            {high > 0 && (
                                <Badge className="bg-orange-500 hover:bg-orange-600 border-none text-xs">{high} High</Badge>
                            )}
                            {medium > 0 && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">{medium} Medium</Badge>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">All Clear</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            No open alerts requiring attention
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
