import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to redirect users who haven't completed onboarding
 * to the onboarding page.
 */
export function useOnboardingRedirect() {
    const { user, currentOrganization } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [checked, setChecked] = useState(false);
    // Track if we already confirmed onboarding is done to avoid re-checking
    // during refreshOrganization() calls that temporarily null the org.
    const onboardingDone = useRef(false);

    useEffect(() => {
        const checkOnboarding = async () => {
            // Skip if no user or org yet (still loading)
            if (!user || !currentOrganization) {
                // Don't set checked=true here — wait for org to load
                return;
            }

            // Skip if already on onboarding page
            if (location.pathname === "/onboarding") {
                setChecked(true);
                return;
            }

            // Skip if we already confirmed onboarding is complete
            if (onboardingDone.current) {
                setChecked(true);
                return;
            }

            try {
                // Check if onboarding is completed
                const { data, error } = await supabase
                    .from("organization_members")
                    .select("onboarding_completed")
                    .eq("user_id", user.id)
                    .eq("organization_id", currentOrganization.id)
                    .single();

                if (error) {
                    console.error("Error checking onboarding status:", error);
                    setChecked(true);
                    return;
                }

                if (data && data.onboarding_completed === false) {
                    navigate("/onboarding", { replace: true });
                } else {
                    onboardingDone.current = true;
                }
            } catch (err) {
                console.error("Onboarding check failed:", err);
            }

            setChecked(true);
        };

        checkOnboarding();
    }, [user, currentOrganization, location.pathname, navigate]);

    return { checked };
}
