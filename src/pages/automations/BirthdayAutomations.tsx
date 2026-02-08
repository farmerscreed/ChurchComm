import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Cake,
  MessageSquare,
  Clock,
  Save,
  Loader2,
  Sparkles,
  PartyPopper,
  Gift,
  Check,
  Globe
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  status: string;
  action_config: any;
  trigger_config: any;
}

export default function BirthdayAutomations() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [birthdayCount, setBirthdayCount] = useState(0);

  // Default state for new automation if none exists
  const [config, setConfig] = useState({
    id: '',
    status: 'active',
    message: 'Happy Birthday {Name}! We hope you have a blessed day filled with joy. - {Church}',
    sendTime: '09:00',
    daysBefore: 0,
  });

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchData();
    }
  }, [currentOrganization?.id]);

  const fetchData = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      // Fetch birthday automations
      const { data: autoData, error: autoError } = await supabase
        .from('automations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('trigger_type', 'birthday');

      if (autoError && autoError.code !== 'PGRST116' && autoError.code !== 'PGRST205') {
        console.error('Error fetching automations:', autoError);
      }

      // Fetch upcoming birthdays check
      const { data: bdayData } = await supabase
        .from('people')
        .select('id', { count: 'exact' })
        .eq('organization_id', currentOrganization.id)
        .not('birthday', 'is', null);

      setBirthdayCount(bdayData?.length || 0);

      if (autoData && autoData.length > 0) {
        setAutomations(autoData);
        // Load first birthday automation into config
        const auto = autoData[0];
        setConfig({
          id: auto.id,
          status: auto.status,
          message: auto.action_config?.message_template || auto.action_config?.message_content || 'Happy Birthday {Name}!',
          sendTime: auto.trigger_config?.send_time || '09:00',
          daysBefore: auto.trigger_config?.days_before || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentOrganization?.id) return;

    setSaving(true);
    try {
      const automationData = {
        organization_id: currentOrganization.id,
        name: 'Birthday Greetings',
        trigger_type: 'birthday',
        status: config.status,
        action_type: 'sms',
        action_config: {
          message_template: config.message,
        },
        trigger_config: {
          send_time: config.sendTime,
          days_before: config.daysBefore,
        },
        updated_at: new Date().toISOString(),
      };

      let error;

      if (config.id) {
        // Update existing
        const { error: updateError } = await supabase
          .from('automations')
          .update(automationData)
          .eq('id', config.id);
        error = updateError;
      } else {
        // Create new
        const { data, error: insertError } = await supabase
          .from('automations')
          .insert(automationData)
          .select()
          .single();

        if (data) setConfig(prev => ({ ...prev, id: data.id }));
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: 'Changes saved',
        description: 'Your birthday automation settings have been updated.',
      });
    } catch (error) {
      console.error('Error saving automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-500 to-rose-600 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-white/20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-48 w-48 rounded-full bg-yellow-400/20 blur-3xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 px-0 hover:px-2 transition-all -ml-2">
              <Link to="/automations">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Automations
              </Link>
            </Button>
            <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <Cake className="h-10 w-10 text-pink-100" />
              Birthday Automations
            </h1>
            <p className="text-lg text-pink-50 max-w-xl">
              Make your members feel loved on their special day. Automatically send personalized birthday wishes.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{birthdayCount}</p>
              <p className="text-sm text-pink-100">Members with birthdays</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-lg overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Configure how and when messages are sent</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium px-2 py-1 rounded-full",
                    config.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {config.status === 'active' ? 'Active' : 'Paused'}
                  </span>
                  <Switch
                    checked={config.status === 'active'}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, status: checked ? 'active' : 'paused' }))}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-base">Send Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      type="time"
                      value={config.sendTime}
                      onChange={(e) => setConfig(prev => ({ ...prev, sendTime: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" />
                    <span>Timezone: {currentOrganization?.timezone || 'America/New_York'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-base">Timing</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400 font-bold text-xs">DAYS</span>
                    <Input
                      type="number"
                      min="0"
                      max="30"
                      value={config.daysBefore}
                      onChange={(e) => setConfig(prev => ({ ...prev, daysBefore: parseInt(e.target.value) || 0 }))}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">0 = On birthday, 1 = Day before</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base">Message Content</Label>
                <Textarea
                  value={config.message}
                  onChange={(e) => setConfig(prev => ({ ...prev, message: e.target.value }))}
                  className="min-h-[120px] font-medium"
                  placeholder="Type your message here..."
                />
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200" onClick={() => setConfig(prev => ({ ...prev, message: prev.message + ' {Name}' }))}>
                    + Name
                  </Badge>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200" onClick={() => setConfig(prev => ({ ...prev, message: prev.message + ' {Church}' }))}>
                    + Church Name
                  </Badge>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t p-4 flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-pink-600 hover:bg-pink-700">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card className="bg-slate-950 text-white border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-pink-500 to-purple-500"></div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-200">
                <MessageSquare className="h-5 w-5" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-2xl p-4 rounded-tl-none border border-slate-700">
                  <p className="text-sm leading-relaxed">
                    {config.message
                      .replace(/\{Name\}/g, 'John')
                      .replace(/\{Church\}/g, currentOrganization?.name || 'Grace Church')}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-2 text-right uppercase tracking-wider">
                    {config.sendTime} AM • SMS
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                  <span>Will send automatically</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-pink-50 dark:from-indigo-900/10 dark:to-pink-900/10 border-none">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                  <PartyPopper className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">Did you know?</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Personalized birthday messages have a 98% open rate and significantly increase member retention.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
