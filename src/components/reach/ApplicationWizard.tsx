import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import type { GrantStatus } from './StatusTracker';
import {
  FileText,
  UserPlus,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Clock,
  CheckCircle2,
  Zap,
  Send,
  Loader2,
} from 'lucide-react';

// ---- Types ----

interface DocItem {
  id: string;
  label: string;
  hint?: string;
  required: boolean;
}

const DOCUMENT_CHECKLIST: DocItem[] = [
  { id: 'ein', label: 'EIN (Employer Identification Number)', hint: 'Your 9-digit federal tax ID', required: true },
  { id: 'determination_letter', label: '501(c)(3) Determination Letter', hint: 'Official IRS approval letter (PDF)', required: true },
  { id: 'org_name', label: 'Legal organization name', hint: 'Exactly as it appears on your IRS letter', required: true },
  { id: 'website_url', label: 'Website URL', hint: 'Must match the domain you will use for ads', required: true },
  { id: 'google_account', label: 'Google account email', hint: 'The Gmail/Workspace address you will use for registration', required: true },
  { id: 'phone', label: 'Organization phone number', hint: 'For Google verification', required: false },
  { id: 'address', label: 'Physical mailing address', hint: 'Must match IRS records', required: false },
];

interface WizardStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  grantStatus?: GrantStatus;
}

const STEPS: WizardStep[] = [
  {
    id: 1,
    title: 'Gather your documents',
    subtitle: 'Collect everything you need before you start the application',
    icon: FileText,
    grantStatus: 'gathering_docs',
  },
  {
    id: 2,
    title: 'Create your Google account',
    subtitle: 'Set up the Google account you will use for your nonprofit',
    icon: UserPlus,
    grantStatus: 'gathering_docs',
  },
  {
    id: 3,
    title: 'Apply at nonprofits.google.com',
    subtitle: 'Submit your application through the official Google for Nonprofits portal',
    icon: Send,
    grantStatus: 'submitted',
  },
  {
    id: 4,
    title: 'What happens next',
    subtitle: 'Understand the review timeline and what to expect',
    icon: Clock,
    grantStatus: 'under_review',
  },
  {
    id: 5,
    title: 'Activate your Ad Grants',
    subtitle: 'Once approved, activate your $10,000/month grant account',
    icon: Zap,
    grantStatus: 'grants_activated',
  },
];

// ---- Component ----

interface ApplicationWizardProps {
  grantAccountId: string | null;
  currentStatus: GrantStatus;
  onStatusChange?: (status: GrantStatus) => void;
}

export function ApplicationWizard({ grantAccountId, currentStatus, onStatusChange }: ApplicationWizardProps) {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const currentStepDef = STEPS.find(s => s.id === step)!;
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;
  const isApproved = currentStatus === 'approved' || currentStatus === 'grants_activated' || currentStatus === 'campaigns_live';

  function toggleDoc(id: string) {
    setCheckedDocs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveStatus(newStatus: GrantStatus) {
    if (!currentOrganization?.id) return;
    setSaving(true);
    try {
      if (grantAccountId) {
        const { error } = await supabase
          .from('grant_accounts')
          .update({ grant_status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', grantAccountId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('grant_accounts').upsert(
          { org_id: currentOrganization.id, grant_status: newStatus },
          { onConflict: 'org_id' }
        );
        if (error) throw error;
      }
      onStatusChange?.(newStatus);
    } catch (err: unknown) {
      console.error('Error saving wizard status:', err);
      toast({ title: 'Could not save progress', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (currentStepDef.grantStatus) {
      await saveStatus(currentStepDef.grantStatus);
    }
    if (step < STEPS.length) setStep(s => s + 1);
  }

  function handleBack() {
    if (step > 1) setStep(s => s - 1);
  }

  return (
    <Card className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-white text-lg">Application Wizard</CardTitle>
          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
            Step {step} of {STEPS.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5 bg-slate-800" />

        {/* Step indicators */}
        <div className="flex justify-between mt-3">
          {STEPS.map(s => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={[
                'flex flex-col items-center gap-1 text-center transition-all',
                s.id === step ? 'opacity-100' : s.id < step ? 'opacity-70' : 'opacity-30',
              ].join(' ')}
              aria-label={`Go to step ${s.id}: ${s.title}`}
            >
              <div
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center border text-xs font-bold transition-all',
                  s.id === step
                    ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-300'
                    : s.id < step
                    ? 'border-green-500/50 bg-green-500/10 text-green-400'
                    : 'border-slate-700 bg-slate-800/50 text-slate-600',
                ].join(' ')}
              >
                {s.id < step ? <CheckCircle2 className="h-4 w-4" /> : s.id}
              </div>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step header */}
        <div>
          <h3 className="text-white font-semibold text-base">{currentStepDef.title}</h3>
          <p className="text-slate-400 text-sm mt-1">{currentStepDef.subtitle}</p>
        </div>

        {/* Step content */}
        {step === 1 && (
          <StepGatherDocs checkedDocs={checkedDocs} onToggle={toggleDoc} />
        )}
        {step === 2 && <StepCreateGoogleAccount />}
        {step === 3 && <StepApplyPortal />}
        {step === 4 && <StepWhatHappensNext />}
        {step === 5 && <StepActivateGrants isApproved={isApproved} />}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
            className="text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {step < STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => saveStatus('grants_activated')}
              disabled={saving || !isApproved}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white disabled:opacity-40"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Mark grants activated
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Step 1: Gather Documents ----

function StepGatherDocs({
  checkedDocs,
  onToggle,
}: {
  checkedDocs: Set<string>;
  onToggle: (id: string) => void;
}) {
  const requiredCount = DOCUMENT_CHECKLIST.filter(d => d.required).length;
  const checkedRequired = DOCUMENT_CHECKLIST.filter(d => d.required && checkedDocs.has(d.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">Check off each item as you locate it.</p>
        <Badge className="bg-slate-700/50 text-slate-300 border-slate-600/30 text-xs">
          {checkedRequired}/{requiredCount} required
        </Badge>
      </div>

      <div className="space-y-2">
        {DOCUMENT_CHECKLIST.map(doc => (
          <label
            key={doc.id}
            className={[
              'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
              checkedDocs.has(doc.id)
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-white/5 bg-slate-800/30 hover:border-white/10',
            ].join(' ')}
          >
            <Checkbox
              checked={checkedDocs.has(doc.id)}
              onCheckedChange={() => onToggle(doc.id)}
              className="mt-0.5 border-slate-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={['text-sm font-medium', checkedDocs.has(doc.id) ? 'text-slate-400 line-through' : 'text-white'].join(' ')}>
                  {doc.label}
                </span>
                {doc.required && (
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] px-1 py-0">
                    Required
                  </Badge>
                )}
              </div>
              {doc.hint && (
                <p className="text-slate-500 text-xs mt-0.5">{doc.hint}</p>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ---- Step 2: Create Google Account ----

function StepCreateGoogleAccount() {
  const steps = [
    {
      n: '1',
      title: 'Use or create a Google Workspace for Nonprofits account',
      desc: 'If your church already has a Google Workspace, use that. Otherwise, you can apply for Google Workspace for Nonprofits — it\'s free.',
    },
    {
      n: '2',
      title: 'Use a professional email address',
      desc: 'Avoid personal Gmail accounts (john@gmail.com). Use your organization\'s domain email (office@yourchurch.org).',
    },
    {
      n: '3',
      title: 'Keep login credentials safe',
      desc: 'Save the Google account email and password in a secure password manager. Multiple staff members should have access.',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {steps.map(s => (
          <div key={s.n} className="flex gap-3 p-3 rounded-xl bg-slate-800/30 border border-white/5">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-bold flex items-center justify-center shrink-0">
              {s.n}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{s.title}</p>
              <p className="text-slate-400 text-xs mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <a
        href="https://workspace.google.com/nonprofits/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium"
      >
        <UserPlus className="h-4 w-4" />
        Apply for Google Workspace for Nonprofits
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

// ---- Step 3: Apply at Portal ----

function StepApplyPortal() {
  const steps = [
    { n: '1', title: 'Go to nonprofits.google.com', desc: 'Click "Get started" or "Sign in" if you have an account.' },
    { n: '2', title: 'Sign in with your Google account', desc: 'Use the professional Google account you set up in the previous step.' },
    { n: '3', title: 'Select your country and fill in org details', desc: 'Enter your organization name, EIN, and website URL exactly as they appear on your IRS letter.' },
    { n: '4', title: 'Upload your 501(c)(3) determination letter', desc: 'Scan or photograph the letter from the IRS. PDF format preferred.' },
    { n: '5', title: 'Request access to Google Ad Grants', desc: 'After your Google for Nonprofits account is approved, request the Ad Grants product specifically.' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {steps.map(s => (
          <div key={s.n} className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {s.n}
            </div>
            <div className="pb-3">
              <p className="text-white text-sm font-medium">{s.title}</p>
              <p className="text-slate-400 text-xs mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <a
        href="https://nonprofits.google.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
      >
        Open nonprofits.google.com
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}

// ---- Step 4: What Happens Next ----

function StepWhatHappensNext() {
  const timeline = [
    { range: '0–2 days', label: 'Application received', desc: 'Google acknowledges your submission.', color: 'indigo' },
    { range: '2–5 days', label: 'Initial review', desc: 'Google verifies your nonprofit status and website.', color: 'purple' },
    { range: '5–10 days', label: 'Decision', desc: 'Approval or request for more information sent via email.', color: 'blue' },
    { range: 'After approval', label: 'Activate Ad Grants', desc: 'Log in and request the Ad Grants product in your dashboard.', color: 'green' },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300',
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
    green: 'bg-green-500/20 border-green-500/30 text-green-300',
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {timeline.map((item, idx) => (
          <div key={idx} className="flex gap-3 items-start">
            <Badge className={`${colorMap[item.color]} shrink-0 text-[10px] font-mono px-2 py-0.5 whitespace-nowrap`}>
              {item.range}
            </Badge>
            <div>
              <p className="text-white text-sm font-medium">{item.label}</p>
              <p className="text-slate-400 text-xs">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-1">
        <p className="text-amber-300 text-sm font-semibold">Check your spam folder</p>
        <p className="text-slate-400 text-xs">
          Google's decision email sometimes lands in spam. Whitelist noreply@google.com and check regularly during the review window.
        </p>
      </div>
    </div>
  );
}

// ---- Step 5: Activate Grants ----

function StepActivateGrants({ isApproved }: { isApproved: boolean }) {
  const steps = [
    { n: '1', title: 'Log in to nonprofits.google.com', desc: 'Use the same Google account you registered with.' },
    { n: '2', title: 'Go to "Products" in your dashboard', desc: 'Find the Google Ad Grants product in the list.' },
    { n: '3', title: 'Click "Activate" next to Ad Grants', desc: 'This creates a new Google Ads account pre-loaded with your grant.' },
    { n: '4', title: 'Accept the Ad Grants terms of service', desc: 'You must agree to the usage policies before running campaigns.' },
    { n: '5', title: 'Set up your first campaign', desc: 'Add at least one campaign, ad group, 2 ads, and 10 keywords to activate spending.' },
  ];

  return (
    <div className="space-y-5">
      {!isApproved && (
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-medium">Waiting for approval</p>
            <p className="text-slate-400 text-xs mt-0.5">
              These steps become available once Google approves your application. Check your email for their decision.
            </p>
          </div>
        </div>
      )}

      <div className={['space-y-2', !isApproved && 'opacity-50 pointer-events-none select-none'].join(' ')}>
        {steps.map(s => (
          <div key={s.n} className="flex gap-3">
            <div className={[
              'w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5',
              isApproved
                ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                : 'bg-slate-800 border border-slate-700 text-slate-600',
            ].join(' ')}>
              {s.n}
            </div>
            <div className="pb-3">
              <p className="text-white text-sm font-medium">{s.title}</p>
              <p className="text-slate-400 text-xs mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {isApproved && (
        <a
          href="https://ads.google.com/intl/en_us/home/nonprofit/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm"
        >
          <Zap className="h-4 w-4" />
          Open Google Ad Grants dashboard
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
