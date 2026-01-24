import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

export function DemoBadge() {
    return (
        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
            <Info className="h-3 w-3 mr-1" />
            Demo
        </Badge>
    );
}
