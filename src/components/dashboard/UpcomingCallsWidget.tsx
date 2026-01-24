import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Gift, UserPlus, Heart } from "lucide-react";

interface UpcomingCall {
    id: string;
    person_name: string;
    trigger_type: string;
    scheduled_at: string;
}

export function UpcomingCallsWidget({ calls }: { calls: UpcomingCall[] }) {
    const getTriggerIcon = (type: string) => {
        switch (type) {
            case "birthday": return <Gift className="h-4 w-4 text-pink-500" />;
            case "first_timer": return <UserPlus className="h-4 w-4 text-green-500" />;
            case "anniversary": return <Heart className="h-4 w-4 text-purple-500" />;
            default: return <Calendar className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Auto-Calls (24h)</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {calls.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No scheduled calls</p>
                ) : (
                    <div className="space-y-3">
                        {calls.slice(0, 5).map(call => (
                            <div key={call.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {getTriggerIcon(call.trigger_type)}
                                    <span className="text-sm truncate max-w-[120px]">{call.person_name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground capitalize">
                                    {call.trigger_type?.replace("_", " ")}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
