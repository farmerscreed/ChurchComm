import { Lock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePlanFeatures, type BooleanFeatureKey } from "@/hooks/usePlanFeatures";

interface PlanGateProps {
  /** The boolean feature key to check */
  feature: BooleanFeatureKey;
  /** Content to render when the user has access */
  children: React.ReactNode;
  /**
   * "page" — renders a centered full-area upgrade card (for page-level gates)
   * "inline" — renders a small lock badge inline (for button/card-level gates)
   * Default: "inline"
   */
  mode?: "page" | "inline";
}

/**
 * Gates content behind a subscription plan check.
 *
 * Usage (page-level):
 *   <PlanGate feature="hasScheduledOutreach" mode="page">
 *     <ScheduledOutreachContent />
 *   </PlanGate>
 *
 * Usage (inline):
 *   <PlanGate feature="hasGroupCalling">
 *     <CreateScriptButton />
 *   </PlanGate>
 */
export function PlanGate({ feature, children, mode = "inline" }: PlanGateProps) {
  const features = usePlanFeatures();
  const hasAccess = features[feature] as boolean;

  if (hasAccess) return <>{children}</>;

  const required = features.requiredPlan(feature);
  const current = features.planName;

  if (mode === "page") {
    return <UpgradePage requiredPlan={required} currentPlan={current} />;
  }

  return <UpgradeBadge requiredPlan={required} />;
}

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

function UpgradePage({
  requiredPlan,
  currentPlan,
}: {
  requiredPlan: string;
  currentPlan: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] text-center space-y-6 px-4">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
        <Lock className="h-9 w-9 text-purple-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">
          {requiredPlan} Plan Required
        </h2>
        <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
          This feature is available on the{" "}
          <span className="text-white font-medium">{requiredPlan}</span> plan
          and above. You're currently on the{" "}
          <span className="text-white font-medium">{currentPlan}</span> plan.
        </p>
      </div>

      <Button
        asChild
        size="lg"
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 shadow-lg"
      >
        <Link to="/pricing">
          <Zap className="h-4 w-4 mr-2" />
          Upgrade to {requiredPlan}
        </Link>
      </Button>
    </div>
  );
}

function UpgradeBadge({ requiredPlan }: { requiredPlan: string }) {
  return (
    <Link
      to="/pricing"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-colors"
    >
      <Lock className="h-3 w-3" />
      {requiredPlan} Plan
    </Link>
  );
}
