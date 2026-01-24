import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Church, CheckCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TIMEZONES = [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Phoenix", label: "Arizona (no DST)" },
    { value: "America/Anchorage", label: "Alaska Time" },
    { value: "Pacific/Honolulu", label: "Hawaii Time" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Central European Time" },
    { value: "Africa/Lagos", label: "West Africa Time" },
];

const SIZE_OPTIONS = [
    { value: "small", label: "Small (under 100 members)" },
    { value: "medium", label: "Medium (100-500 members)" },
    { value: "large", label: "Large (500-2,000 members)" },
    { value: "mega", label: "Mega (2,000+ members)" },
];

export default function OnboardingPage() {
    const [step, setStep] = useState(1);
    const [churchName, setChurchName] = useState("");
    const [estimatedSize, setEstimatedSize] = useState("");
    const [timezone, setTimezone] = useState("America/New_York");
    const [channels, setChannels] = useState({ voice: true, sms: true });
    const [loading, setLoading] = useState(false);

    const { user, currentOrganization, refreshOrganization } = useAuthStore();
    const navigate = useNavigate();
    const { toast } = useToast();

    const totalSteps = 4;
    const progress = (step / totalSteps) * 100;

    const handleNext = () => {
        if (step === 1 && !churchName.trim()) {
            toast({ title: "Please enter your church name", variant: "destructive" });
            return;
        }
        if (step === 2 && !estimatedSize) {
            toast({ title: "Please select your church size", variant: "destructive" });
            return;
        }
        setStep(step + 1);
    };

    const handleBack = () => setStep(step - 1);

    const handleComplete = async () => {
        setLoading(true);

        const { error } = await supabase
            .from("organizations")
            .update({
                name: churchName,
                estimated_size: estimatedSize,
                timezone: timezone,
                preferred_channels: Object.entries(channels)
                    .filter(([_, enabled]) => enabled)
                    .map(([channel]) => channel),
            })
            .eq("id", currentOrganization?.id);

        if (error) {
            toast({ title: "Setup failed", description: error.message, variant: "destructive" });
        } else {
            // Mark onboarding as complete
            await supabase
                .from("organization_members")
                .update({ onboarding_completed: true })
                .eq("organization_id", currentOrganization?.id)
                .eq("user_id", user?.id);

            // Seed demo data for new organizations
            await supabase.functions.invoke("seed-demo-data", {
                body: { organization_id: currentOrganization?.id },
            });

            await refreshOrganization();
            toast({ title: "Welcome to ChurchComm!", description: "Your church is ready to go." });
            navigate("/dashboard");
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Church className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Set Up Your Church</CardTitle>
                    <CardDescription>Step {step} of {totalSteps}</CardDescription>
                    <Progress value={progress} className="mt-4" />
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Step 1: Church Name */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Welcome! Let's get started.</h3>
                            <p className="text-muted-foreground">First, tell us about your church.</p>
                            <div className="space-y-2">
                                <Label htmlFor="churchName">Church Name</Label>
                                <Input
                                    id="churchName"
                                    placeholder="e.g., Grace Community Church"
                                    value={churchName}
                                    onChange={(e) => setChurchName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Church Details */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Church Details</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Estimated Membership Size</Label>
                                    <Select value={estimatedSize} onValueChange={setEstimatedSize}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select size" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SIZE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Timezone</Label>
                                    <Select value={timezone} onValueChange={setTimezone}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TIMEZONES.map((tz) => (
                                                <SelectItem key={tz.value} value={tz.value}>
                                                    {tz.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Communication Preferences */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Communication Preferences</h3>
                            <p className="text-muted-foreground">How would you like to reach your members?</p>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <Checkbox
                                        id="voice"
                                        checked={channels.voice}
                                        onCheckedChange={(checked) => setChannels({ ...channels, voice: !!checked })}
                                    />
                                    <label htmlFor="voice" className="flex-1 cursor-pointer">
                                        <p className="font-medium">AI Voice Calls</p>
                                        <p className="text-sm text-muted-foreground">Automated pastoral care calls</p>
                                    </label>
                                </div>
                                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <Checkbox
                                        id="sms"
                                        checked={channels.sms}
                                        onCheckedChange={(checked) => setChannels({ ...channels, sms: !!checked })}
                                    />
                                    <label htmlFor="sms" className="flex-1 cursor-pointer">
                                        <p className="font-medium">SMS Messages</p>
                                        <p className="text-sm text-muted-foreground">Text message campaigns</p>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Review & Complete */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-5 w-5" />
                                <h3 className="text-lg font-medium">Ready to Launch!</h3>
                            </div>
                            <div className="bg-muted p-4 rounded-lg space-y-2">
                                <p><strong>Church:</strong> {churchName}</p>
                                <p><strong>Size:</strong> {SIZE_OPTIONS.find(s => s.value === estimatedSize)?.label}</p>
                                <p><strong>Timezone:</strong> {TIMEZONES.find(t => t.value === timezone)?.label}</p>
                                <p><strong>Channels:</strong> {Object.entries(channels).filter(([_, v]) => v).map(([k]) => k === "voice" ? "Voice Calls" : "SMS").join(", ") || "None selected"}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                You'll start with a 14-day free trial including 15 minutes of AI calling.
                            </p>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-4">
                        {step > 1 ? (
                            <Button variant="outline" onClick={handleBack} disabled={loading}>
                                Back
                            </Button>
                        ) : (
                            <div />
                        )}
                        {step < 4 ? (
                            <Button onClick={handleNext}>Continue</Button>
                        ) : (
                            <Button onClick={handleComplete} disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Setting up...
                                    </>
                                ) : (
                                    "Start Free Trial"
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
