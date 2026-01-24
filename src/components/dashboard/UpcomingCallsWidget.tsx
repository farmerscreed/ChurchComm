import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Gift, UserPlus, Heart, Sparkles } from "lucide-react";

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

    const getTriggerLabel = (type: string) => {
        switch (type) {
            case "birthday": return "Birthday";
            case "first_timer": return "Welcome";
            case "anniversary": return "Anniversary";
            default: return type?.replace("_", " ");
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Auto-Calls</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {calls.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                        <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-2">
                            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <p className="text-sm font-medium">No upcoming calls</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Triggers will auto-schedule calls for birthdays and new visitors
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {calls.slice(0, 5).map(call => (
                            <div key={call.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {getTriggerIcon(call.trigger_type)}
                                    <span className="text-sm truncate max-w-[120px]">{call.person_name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 rounded-full bg-muted">
                                    {getTriggerLabel(call.trigger_type)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
