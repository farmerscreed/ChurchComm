import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EscalationWidgetProps {
    urgent: number;
    high: number;
    medium: number;
    total: number;
}

export function EscalationWidget({ urgent, high, medium, total }: EscalationWidgetProps) {
    const navigate = useNavigate();

    return (
        <Card
            className="cursor-pointer hover:bg-muted/50 border-orange-200"
            onClick={() => navigate("/follow-ups")}
        >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Escalation Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{total} Open</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                    {urgent > 0 && (
                        <Badge variant="destructive">{urgent} Urgent</Badge>
                    )}
                    {high > 0 && (
                        <Badge className="bg-orange-500 hover:bg-orange-600 border-none">{high} High</Badge>
                    )}
                    {medium > 0 && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{medium} Medium</Badge>
                    )}
                    {total === 0 && (
                        <span className="text-xs text-muted-foreground">No open alerts</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
