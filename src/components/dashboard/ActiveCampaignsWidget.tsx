import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Campaign {
    id: string;
    name: string;
    status: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    progress?: number;
}

export function ActiveCampaignsWidget({ campaigns }: { campaigns: Campaign[] }) {
    const navigate = useNavigate();
    const activeCampaigns = campaigns.filter(c => c.status === "in_progress" || c.status === "scheduled");

    return (
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/communications")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{activeCampaigns.length}</div>
                {activeCampaigns.slice(0, 2).map(campaign => (
                    <div key={campaign.id} className="flex justify-between text-xs mt-2">
                        <span className="truncate max-w-[150px]">{campaign.name}</span>
                        <span className="text-muted-foreground capitalize">{campaign.status.replace("_", " ")}</span>
                    </div>
                ))}
                {activeCampaigns.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">No active campaigns</p>
                )}
            </CardContent>
        </Card>
    );
}
