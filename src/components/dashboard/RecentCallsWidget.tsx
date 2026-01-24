import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneCall, CheckCircle, XCircle, Clock, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentCall {
    id: string;
    person_name: string;
    status: string;
    created_at: string;
}

export function RecentCallsWidget({ calls }: { calls: RecentCall[] }) {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
            case "scheduled": return <Clock className="h-4 w-4 text-blue-500" />;
            case "in-progress": return <Phone className="h-4 w-4 text-yellow-500 animate-pulse" />;
            default: return <Clock className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Recent Calls</CardTitle>
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {calls.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No recent calls</p>
                    ) : (
                        calls.slice(0, 5).map(call => (
                            <div key={call.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {getStatusIcon(call.status)}
                                    <span className="text-sm truncate max-w-[120px]">{call.person_name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
