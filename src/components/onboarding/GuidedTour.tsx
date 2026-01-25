import { useState, useEffect } from "react";
import type { Step, CallBackProps } from "react-joyride";
import Joyride, { STATUS } from "react-joyride";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

const TOUR_STEPS: Step[] = [
    {
        target: '[data-tour="dashboard"]',
        content: "Welcome to ChurchComm! This is your command center where you can see key metrics at a glance.",
        disableBeacon: true,
        placement: "center",
    },
    {
        target: '[data-tour="people-nav"]',
        content: "Manage your congregation here. Add members, visitors, and track their journey.",
        disableBeacon: true,
        placement: "right",
    },
    {
        target: '[data-tour="communications-nav"]',
        content: "Launch AI voice calls and SMS campaigns to reach your members.",
        disableBeacon: true,
        placement: "right",
    },
    {
        target: '[data-tour="settings-nav"]',
        content: "Configure calling preferences, manage your team, and set up call scripts.",
        disableBeacon: true,
        placement: "right",
    },
    {
        target: '[data-tour="minute-usage"]',
        content: "Track your AI calling minutes here. Your plan includes a set number of minutes each month.",
        disableBeacon: true,
        placement: "bottom",
    },
];

export function GuidedTour() {
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const { user, currentOrganization } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        checkTourStatus();
    }, [user, currentOrganization]);

    const checkTourStatus = async () => {
        if (!user || !currentOrganization) return;

        try {
            // Check if tour completed
            const { data, error } = await supabase
                .from("organization_members")
                .select("tour_completed")
                .eq("user_id", user.id)
                .eq("organization_id", currentOrganization.id)
                .single();

            // If error (e.g., column doesn't exist), don't show tour
            if (error) {
                console.warn("Tour status check failed:", error.message);
                return;
            }

            if (data && !data.tour_completed) {
                // Wait for element to exist safely
                const checkForElement = () => {
                    const el = document.querySelector('[data-tour="dashboard"]');
                    if (el) {
                        setRun(true);
                    } else {
                        // Try again in 500ms, up to 5 times
                        let retries = 0;
                        const interval = setInterval(() => {
                            retries++;
                            if (document.querySelector('[data-tour="dashboard"]')) {
                                setRun(true);
                                clearInterval(interval);
                            } else if (retries > 5) {
                                clearInterval(interval);
                            }
                        }, 500);
                    }
                };

                // Small initial delay
                setTimeout(checkForElement, 1000);
            }
        } catch (err) {
            console.warn("Tour status check error:", err);
        }
    };

    const handleCallback = async (data: CallBackProps) => {
        const { status, index, type, action } = data;

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRun(false);

            // Mark tour as completed (ignore errors if column doesn't exist)
            try {
                await supabase
                    .from("organization_members")
                    .update({ tour_completed: true })
                    .eq("user_id", user?.id)
                    .eq("organization_id", currentOrganization?.id);
            } catch (err) {
                console.warn("Failed to mark tour complete:", err);
            }
        } else if (type === "step:after" || action === "next") {
            // Basic navigation logic if we want to change routes during tour
        }
    };

    return (
        <Joyride
            steps={TOUR_STEPS}
            run={run}
            stepIndex={stepIndex}
            callback={handleCallback}
            continuous
            showProgress
            showSkipButton
            disableOverlayClose
            spotlightClicks
            floaterProps={{
                disableAnimation: true,
            }}
            styles={{
                options: {
                    primaryColor: "#6366f1", // Indigo-500
                    textColor: "#1f2937",
                    backgroundColor: "#ffffff",
                    zIndex: 10000,
                },
                tooltip: {
                    borderRadius: 8,
                    padding: 16,
                },
                buttonNext: {
                    borderRadius: 6,
                    padding: "8px 16px",
                },
                buttonBack: {
                    marginRight: 8,
                },
            }}
            locale={{
                back: "Back",
                close: "Close",
                last: "Finish",
                next: "Next",
                skip: "Skip Tour",
            }}
        />
    );
}
