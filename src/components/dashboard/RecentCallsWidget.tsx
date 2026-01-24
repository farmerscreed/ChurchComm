import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneCall, CheckCircle, XCircle, Clock, Phone, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface RecentCall {
    id: string;
    person_name: string;
    status: string;
    created_at: string;
}

export function RecentCallsWidget({ calls }: { calls: RecentCall[] }) {
    const navigate = useNavigate();

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
        <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Recent Calls</CardTitle>
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {calls.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-3">
                            <PhoneCall className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-sm font-medium">No calls yet</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                            Launch a campaign to start connecting with your congregation
                        </p>
                        <button
                            onClick={() => navigate("/communications")}
                            className="mt-3 text-xs text-primary hover:underline flex items-center gap-1"
                        >
                            <Rocket className="h-3 w-3" />
                            Start a campaign
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {calls.slice(0, 5).map(call => (
                            <div key={call.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {getStatusIcon(call.status)}
                                    <span className="text-sm truncate max-w-[150px]">{call.person_name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
