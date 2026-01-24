import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AVAILABLE_VARIABLES = [
  { name: "{first_name}", description: "Person's first name" },
  { name: "{last_name}", description: "Person's last name" },
  { name: "{church_name}", description: "Your church/organization name" },
  { name: "{pastor_name}", description: "Lead pastor's name" },
  { name: "{event_name}", description: "Campaign event name" },
  { name: "{event_date}", description: "Campaign event date" },
  { name: "{day_of_week}", description: "Current day (Monday, etc.)" },
  { name: "{membership_duration}", description: "How long they've been a member" },
];

export function VariableReference() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Available Variables</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {AVAILABLE_VARIABLES.map((v) => (
          <div key={v.name} className="flex items-start gap-2">
            <Badge variant="outline" className="font-mono text-xs shrink-0">
              {v.name}
            </Badge>
            <span className="text-xs text-muted-foreground">{v.description}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
