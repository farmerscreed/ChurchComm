import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Globe,
  Building2,
  BookOpen,
  ExternalLink,
} from 'lucide-react';

interface EligibilityState {
  q1_501c3: '501c3_yes' | '501c3_no' | '501c3_pending' | null;
  q2_us_based: 'us_yes' | 'us_no' | null;
  q3_website: 'website_yes' | 'website_no' | null;
  q3_website_url: string;
  q4_google_ads: 'google_ads_yes' | 'google_ads_no' | 'google_ads_unsure' | null;
  q5_restricted: 'restricted_yes' | 'restricted_no' | null;
}

interface EligibilityCheckerProps {
  onQualified?: (websiteUrl: string) => void;
}

type EligibilityResult =
  | { outcome: 'qualified'; websiteUrl: string }
  | { outcome: 'disqualified'; reason: string }
  | { outcome: 'pending_501c3' }
  | null;

const TOTAL_QUESTIONS = 5;

function evaluateEligibility(state: EligibilityState): EligibilityResult {
  if (state.q1_501c3 === '501c3_no') {
    return {
      outcome: 'disqualified',
      reason:
        'Google Ad Grants requires your organization to hold 501(c)(3) tax-exempt status. Without it, you are not eligible to apply.',
    };
  }
  if (state.q1_501c3 === '501c3_pending') {
    return { outcome: 'pending_501c3' };
  }
  if (state.q2_us_based === 'us_no') {
    return {
      outcome: 'disqualified',
      reason:
        'Google Ad Grants is currently available to nonprofits in eligible countries. US-based organizations qualify — international organizations should check the Google for Nonprofits eligibility list.',
    };
  }
  if (state.q3_website === 'website_no') {
    return {
      outcome: 'disqualified',
      reason:
        'A functional website is required to participate in Google Ad Grants. All ads must link to your approved website domain.',
    };
  }
  if (state.q5_restricted === 'restricted_yes') {
    return {
      outcome: 'disqualified',
      reason:
        'Hospitals, healthcare organizations, schools, government entities, and political or religious organizations that primarily promote a religion are not eligible for Google Ad Grants.',
    };
  }
  // All checks passed
  return { outcome: 'qualified', websiteUrl: state.q3_website_url };
}

export function EligibilityChecker({ onQualified }: EligibilityCheckerProps) {
  const { currentOrganization } = useAuthStore();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<EligibilityState>({
    q1_501c3: null,
    q2_us_based: null,
    q3_website: null,
    q3_website_url: '',
    q4_google_ads: null,
    q5_restricted: null,
  });
  const [result, setResult] = useState<EligibilityResult>(null);

  function setAnswer<K extends keyof EligibilityState>(key: K, value: EligibilityState[K]) {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return answers.q1_501c3 !== null;
      case 2:
        return answers.q2_us_based !== null;
      case 3:
        return (
          answers.q3_website !== null &&
          (answers.q3_website === 'website_no' || answers.q3_website_url.trim().length > 0)
        );
      case 4:
        return answers.q4_google_ads !== null;
      case 5:
        return answers.q5_restricted !== null;
      default:
        return false;
    }
  }

  async function handleNext() {
    // Early exit on disqualifying answers
    if (step === 1 && answers.q1_501c3 !== 'us_yes') {
      if (answers.q1_501c3 === '501c3_no' || answers.q1_501c3 === '501c3_pending') {
        finalizeResult();
        return;
      }
    }
    if (step === 2 && answers.q2_us_based === 'us_no') {
      finalizeResult();
      return;
    }
    if (step === 3 && answers.q3_website === 'website_no') {
      finalizeResult();
      return;
    }

    if (step < TOTAL_QUESTIONS) {
      setStep(s => s + 1);
    } else {
      finalizeResult();
    }
  }

  async function finalizeResult() {
    const evaluation = evaluateEligibility(answers);
    setResult(evaluation);

    if (evaluation?.outcome === 'qualified' && currentOrganization?.id) {
      setSaving(true);
      try {
        const { error } = await supabase.from('grant_accounts').upsert(
          {
            org_id: currentOrganization.id,
            grant_status: 'not_started',
            preflight_last_score: null,
          },
          { onConflict: 'org_id' }
        );
        if (error) throw error;
      } catch (err: unknown) {
        console.error('Error saving eligibility result:', err);
      } finally {
        setSaving(false);
      }
    }
  }

  function handleReset() {
    setStep(1);
    setResult(null);
    setAnswers({
      q1_501c3: null,
      q2_us_based: null,
      q3_website: null,
      q3_website_url: '',
      q4_google_ads: null,
      q5_restricted: null,
    });
  }

  if (result) {
    return <EligibilityResultPanel result={result} onReset={handleReset} onQualified={onQualified} saving={saving} />;
  }

  const progress = ((step - 1) / TOTAL_QUESTIONS) * 100;

  return (
    <Card className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-white text-lg">Eligibility Checker</CardTitle>
          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
            Question {step} of {TOTAL_QUESTIONS}
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5 bg-slate-800" />
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 1 && (
          <QuestionBlock
            question="Does your organization have 501(c)(3) tax-exempt status?"
            hint="This is the IRS designation for charitable nonprofits in the United States."
          >
            <OptionGroup
              options={[
                { value: '501c3_yes', label: 'Yes, we have it', icon: <CheckCircle2 className="h-4 w-4 text-green-400" /> },
                { value: '501c3_pending', label: 'Pending / In process', icon: <AlertCircle className="h-4 w-4 text-amber-400" /> },
                { value: '501c3_no', label: 'No', icon: <XCircle className="h-4 w-4 text-red-400" /> },
              ]}
              selected={answers.q1_501c3}
              onSelect={v => setAnswer('q1_501c3', v as EligibilityState['q1_501c3'])}
            />
          </QuestionBlock>
        )}

        {step === 2 && (
          <QuestionBlock
            question="Is your organization based in the United States?"
            hint="Google Ad Grants is available in many countries. US-based orgs are always eligible."
          >
            <OptionGroup
              options={[
                { value: 'us_yes', label: 'Yes', icon: <CheckCircle2 className="h-4 w-4 text-green-400" /> },
                { value: 'us_no', label: 'No', icon: <XCircle className="h-4 w-4 text-red-400" /> },
              ]}
              selected={answers.q2_us_based}
              onSelect={v => setAnswer('q2_us_based', v as EligibilityState['q2_us_based'])}
            />
          </QuestionBlock>
        )}

        {step === 3 && (
          <QuestionBlock
            question="Does your organization have a working website?"
            hint="All Google Ad Grant ads must link to a website you own and control."
          >
            <OptionGroup
              options={[
                { value: 'website_yes', label: 'Yes', icon: <Globe className="h-4 w-4 text-green-400" /> },
                { value: 'website_no', label: 'No', icon: <XCircle className="h-4 w-4 text-red-400" /> },
              ]}
              selected={answers.q3_website}
              onSelect={v => setAnswer('q3_website', v as EligibilityState['q3_website'])}
            />
            {answers.q3_website === 'website_yes' && (
              <div className="mt-4">
                <label className="block text-sm text-slate-400 mb-2">Enter your website URL</label>
                <Input
                  type="url"
                  placeholder="https://yourchurch.org"
                  value={answers.q3_website_url}
                  onChange={e => setAnswer('q3_website_url', e.target.value)}
                  className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500"
                />
              </div>
            )}
          </QuestionBlock>
        )}

        {step === 4 && (
          <QuestionBlock
            question="Does your organization currently run Google Ads?"
            hint="Organizations already running Google Ads can still apply — the grant is a separate program."
          >
            <OptionGroup
              options={[
                { value: 'google_ads_yes', label: 'Yes', icon: <CheckCircle2 className="h-4 w-4 text-green-400" /> },
                { value: 'google_ads_no', label: 'No', icon: <XCircle className="h-4 w-4 text-slate-400" /> },
                { value: 'google_ads_unsure', label: "Not sure", icon: <AlertCircle className="h-4 w-4 text-amber-400" /> },
              ]}
              selected={answers.q4_google_ads}
              onSelect={v => setAnswer('q4_google_ads', v as EligibilityState['q4_google_ads'])}
            />
          </QuestionBlock>
        )}

        {step === 5 && (
          <QuestionBlock
            question="Is your organization a hospital, school, or government entity?"
            hint="These entity types are explicitly excluded from the Google for Nonprofits program."
          >
            <OptionGroup
              options={[
                { value: 'restricted_yes', label: 'Yes', icon: <Building2 className="h-4 w-4 text-red-400" /> },
                { value: 'restricted_no', label: 'No', icon: <CheckCircle2 className="h-4 w-4 text-green-400" /> },
              ]}
              selected={answers.q5_restricted}
              onSelect={v => setAnswer('q5_restricted', v as EligibilityState['q5_restricted'])}
            />
          </QuestionBlock>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canAdvance()}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === TOTAL_QUESTIONS ? 'Check eligibility' : 'Next'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Sub-components ----

interface QuestionBlockProps {
  question: string;
  hint?: string;
  children: React.ReactNode;
}

function QuestionBlock({ question, hint, children }: QuestionBlockProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-white font-medium text-base leading-snug">{question}</p>
        {hint && <p className="text-slate-400 text-sm mt-1">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

interface OptionItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface OptionGroupProps {
  options: OptionItem[];
  selected: string | null;
  onSelect: (value: string) => void;
}

function OptionGroup({ options, selected, onSelect }: OptionGroupProps) {
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={[
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left',
            selected === opt.value
              ? 'border-indigo-500/60 bg-indigo-500/10 text-white'
              : 'border-white/10 bg-slate-800/30 text-slate-300 hover:border-white/20 hover:bg-slate-800/60',
          ].join(' ')}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface EligibilityResultPanelProps {
  result: EligibilityResult;
  saving: boolean;
  onReset: () => void;
  onQualified?: (websiteUrl: string) => void;
}

function EligibilityResultPanel({ result, saving, onReset, onQualified }: EligibilityResultPanelProps) {
  if (!result) return null;

  if (result.outcome === 'qualified') {
    return (
      <Card className="bg-slate-900/50 backdrop-blur-xl border border-green-500/30 rounded-2xl">
        <CardContent className="pt-8 pb-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <div>
            <h3 className="text-white text-xl font-bold mb-2">You qualify for Google Ad Grants!</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
              Your organization meets the basic eligibility requirements. The next step is a preflight scan of your website to check technical readiness.
            </p>
          </div>
          {saving && (
            <p className="text-slate-500 text-xs">Saving your eligibility status...</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => onQualified?.(result.websiteUrl)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
            >
              Run preflight scan
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              variant="ghost"
              onClick={onReset}
              className="text-slate-400 hover:text-white hover:bg-white/5"
            >
              Start over
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result.outcome === 'pending_501c3') {
    return (
      <Card className="bg-slate-900/50 backdrop-blur-xl border border-amber-500/30 rounded-2xl">
        <CardContent className="pt-8 pb-8 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white text-lg font-bold mb-1">Your 501(c)(3) application is pending</h3>
              <p className="text-slate-400 text-sm">
                You cannot apply to Google Ad Grants until your 501(c)(3) status is approved by the IRS. Here is how to get started:
              </p>
            </div>
          </div>

          <div className="space-y-3 pl-4 border-l border-amber-500/20">
            {[
              {
                step: '1',
                title: 'File IRS Form 1023 or 1023-EZ',
                desc: 'Small organizations (under $50K projected revenue) can use the simpler 1023-EZ.',
              },
              {
                step: '2',
                title: 'Get a Determination Letter',
                desc: 'This official IRS letter confirms your 501(c)(3) status. Processing typically takes 3–6 months.',
              },
              {
                step: '3',
                title: 'Register with Google for Nonprofits',
                desc: 'Once approved, visit nonprofits.google.com and submit your determination letter.',
              },
              {
                step: '4',
                title: 'Come back and apply for Ad Grants',
                desc: 'Return to REACH once you have your 501(c)(3) status and complete your application.',
              },
            ].map(item => (
              <div key={item.step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{item.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <a
              href="https://www.irs.gov/charities-non-profits/applying-for-tax-exempt-status"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm"
            >
              <BookOpen className="h-4 w-4" />
              IRS 501(c)(3) guide
              <ExternalLink className="h-3 w-3" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-slate-400 hover:text-white hover:bg-white/5 ml-auto"
            >
              Start over
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Disqualified
  return (
    <Card className="bg-slate-900/50 backdrop-blur-xl border border-red-500/20 rounded-2xl">
      <CardContent className="pt-8 pb-8 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
            <XCircle className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-white text-lg font-bold mb-1">Not eligible at this time</h3>
            <p className="text-slate-400 text-sm">{result.reason}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={onReset}
          className="text-slate-400 hover:text-white hover:bg-white/5"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Retake the checker
        </Button>
      </CardContent>
    </Card>
  );
}
