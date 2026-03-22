import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Campaign {
    id: string;
    name: string;
    status: string;
    progress?: number;
}

export function ActiveCampaignsWidget({ campaigns }: { campaigns: Campaign[] }) {
    const navigate = useNavigate();
    const activeCampaigns = campaigns.filter(c => c.status === "in_progress" || c.status === "scheduled");

    return (
        <Card
            className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/communications")}
        >
            <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Active Campaigns</span>
                    </div>
                    {activeCampaigns.length > 0 && (
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                        </span>
                    )}
                </div>
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {activeCampaigns.length}
                </div>
                {activeCampaigns.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                        {activeCampaigns.slice(0, 2).map(campaign => (
                            <div key={campaign.id} className="flex justify-between text-xs">
                                <span className="truncate max-w-[140px] text-foreground">{campaign.name}</span>
                                <span className="text-muted-foreground capitalize">{campaign.status.replace("_", " ")}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                        <Rocket className="h-3 w-3" />
                        <span>Launch your first campaign</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
