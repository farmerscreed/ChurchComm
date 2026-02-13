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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Cake,
  MessageSquare,
  Phone,
  Clock,
  Save,
  Loader2,
  Sparkles,
  PartyPopper,
  Gift,
  Check,
  Globe,
  Filter,
  Calendar
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

interface AutoTrigger {
  id: string;
  trigger_type: 'birthday';
  enabled: boolean;
  script_id: string | null;
  delay_hours: number;
}

interface Script {
  id: string;
  name: string;
  template_type: string | null;
}

interface BirthdayPerson {
  id: string;
  first_name: string;
  last_name: string;
  birthday: string;
  phone_number: string | null;
}

export default function BirthdayAutomations() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data State
  const [birthdayCount, setBirthdayCount] = useState(0);
  const [birthdayPeople, setBirthdayPeople] = useState<BirthdayPerson[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);

  // Config State
  const [smsConfig, setSmsConfig] = useState({
    id: '',
    status: 'active',
    message: 'Happy Birthday {Name}! We hope you have a blessed day filled with joy. - {Church}',
    sendTime: '09:00',
    daysBefore: 0,
  });

  const [callConfig, setCallConfig] = useState<AutoTrigger>({
    id: '',
    trigger_type: 'birthday',
    enabled: false,
    script_id: null,
    delay_hours: 10, // Default 10 AM
  });

  // UI State
  const [periodFilter, setPeriodFilter] = useState('upcoming'); // upcoming, month, next_month

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchData();
    }
  }, [currentOrganization?.id]);

  const fetchData = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      // 1. Fetch SMS Automation (existing 'automations' table)
      const { data: autoData } = await supabase
        .from('automations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('trigger_type', 'birthday')
        .maybeSingle();

      if (autoData) {
        setSmsConfig({
          id: autoData.id,
          status: autoData.status,
          message: autoData.action_config?.message_template || autoData.action_config?.message_content || 'Happy Birthday {Name}!',
          sendTime: autoData.trigger_config?.send_time || '09:00',
          daysBefore: autoData.trigger_config?.days_before || 0,
        });
      }

      // 2. Fetch Call Automation (new 'auto_triggers' table)
      const { data: triggerData } = await supabase
        .from('auto_triggers')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('trigger_type', 'birthday')
        .maybeSingle();

      if (triggerData) {
        setCallConfig(triggerData);
      } else {
        // Create default trigger if missing
        const { data: newTrigger } = await supabase
          .from('auto_triggers')
          .insert({
            organization_id: currentOrganization.id,
            trigger_type: 'birthday',
            enabled: false,
            delay_hours: 10,
          })
          .select()
          .single();

        if (newTrigger) setCallConfig(newTrigger);
      }

      // 3. Fetch Call Scripts
      const { data: scriptData } = await supabase
        .from('call_scripts')
        .select('id, name, template_type')
        .or(`organization_id.eq.${currentOrganization.id},is_system.eq.true`)
        .order('name');

      setScripts(scriptData || []);

      // 4. Fetch Birthday People
      const { data: bdayData } = await supabase
        .from('people')
        .select('id, first_name, last_name, birthday, phone_number')
        .eq('organization_id', currentOrganization.id)
        .not('birthday', 'is', null)
        .order('birthday', { ascending: true });

      setBirthdayCount(bdayData?.length || 0);
      setBirthdayPeople(bdayData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error loading data',
        description: 'Please reload the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentOrganization?.id) return;

    setSaving(true);
    try {
      // 1. Save SMS Config
      const smsData = {
        organization_id: currentOrganization.id,
        name: 'Birthday Greetings',
        trigger_type: 'birthday',
        status: smsConfig.status,
        action_type: 'send_sms',
        action_config: { message_template: smsConfig.message },
        trigger_config: {
          send_time: smsConfig.sendTime,
          days_before: smsConfig.daysBefore,
        },
        updated_at: new Date().toISOString(),
      };

      if (smsConfig.id) {
        await supabase.from('automations').update(smsData).eq('id', smsConfig.id);
      } else {
        const { data } = await supabase.from('automations').insert(smsData).select().single();
        if (data) setSmsConfig(prev => ({ ...prev, id: data.id }));
      }

      // 2. Save Call Config
      if (callConfig.id) {
        await supabase
          .from('auto_triggers')
          .update({
            enabled: callConfig.enabled,
            script_id: callConfig.script_id,
            delay_hours: callConfig.delay_hours, // used as time of day (9, 10, etc.)
          })
          .eq('id', callConfig.id);
      }

      toast({
        title: 'Settings saved',
        description: 'Your birthday automation preferences have been updated.',
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredPeople = birthdayPeople.filter(person => {
    if (!person.birthday) return false;
    const bday = new Date(person.birthday + 'T00:00:00');
    const today = new Date();
    const currentMonth = today.getMonth();
    const bdayMonth = bday.getMonth();

    if (periodFilter === 'this_month') return bdayMonth === currentMonth;
    if (periodFilter === 'next_month') return bdayMonth === (currentMonth + 1) % 12;
    return true; // upcoming (all)
  });

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
      {/* Header Banner - Retaining existing design */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-80 w-80 rounded-full bg-orange-400/30 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-80 w-80 rounded-full bg-pink-400/30 blur-3xl animate-pulse delay-700"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-6">
            <Button variant="ghost" size="sm" asChild className="text-white/80 hover:text-white hover:bg-white/10 -ml-2 rounded-full px-4">
              <Link to="/automations">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Automations
              </Link>
            </Button>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight flex items-center gap-4 mb-3">
                <Cake className="h-12 w-12 text-pink-200" />
                Birthday Automations
              </h1>
              <p className="text-xl text-pink-100 max-w-xl leading-relaxed">
                Make your members feel loved on their special day with automated wishes via SMS or Call.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 min-w-[180px]">
            <div className="h-14 w-14 bg-white/20 rounded-full flex items-center justify-center mb-1">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{birthdayCount}</p>
              <p className="text-sm font-medium text-pink-100 uppercase tracking-wide">Upcoming</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* SMS Configuration */}
        <Card className="border-none shadow-lg overflow-hidden h-full">
          <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>SMS Greeting</CardTitle>
                  <CardDescription>Send a text message</CardDescription>
                </div>
              </div>
              <Switch
                checked={smsConfig.status === 'active'}
                onCheckedChange={(checked) => setSmsConfig(prev => ({ ...prev, status: checked ? 'active' : 'paused' }))}
              />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-base">Message Template</Label>
              <Textarea
                value={smsConfig.message}
                onChange={(e) => setSmsConfig(prev => ({ ...prev, message: e.target.value }))}
                className="min-h-[120px] font-medium"
                placeholder="Type your message here..."
              />
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200" onClick={() => setSmsConfig(prev => ({ ...prev, message: prev.message + ' {Name}' }))}>
                  + Name
                </Badge>
                <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200" onClick={() => setSmsConfig(prev => ({ ...prev, message: prev.message + ' {Church}' }))}>
                  + Church
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Send Time</Label>
                <Input
                  type="time"
                  value={smsConfig.sendTime}
                  onChange={(e) => setSmsConfig(prev => ({ ...prev, sendTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Timing</Label>
                <Select
                  value={String(smsConfig.daysBefore)}
                  onValueChange={(val) => setSmsConfig(prev => ({ ...prev, daysBefore: parseInt(val) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">On Birthday</SelectItem>
                    <SelectItem value="1">1 Day Before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice Call Configuration */}
        <Card className="border-none shadow-lg overflow-hidden h-full">
          <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Phone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle>Voice Call</CardTitle>
                  <CardDescription>Make an AI phone call</CardDescription>
                </div>
              </div>
              <Switch
                checked={callConfig.enabled}
                onCheckedChange={(checked) => setCallConfig(prev => ({ ...prev, enabled: checked }))}
              />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-base">Call Script</Label>
              <Select
                value={callConfig.script_id || ''}
                onValueChange={(val) => setCallConfig(prev => ({ ...prev, script_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a script..." />
                </SelectTrigger>
                <SelectContent>
                  {scripts.map(script => (
                    <SelectItem key={script.id} value={script.id}>{script.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {callConfig.enabled && !callConfig.script_id && (
                <p className="text-xs text-red-500">Please select a script to enable calls.</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>One-off Call Time</Label>
              <Select
                value={String(callConfig.delay_hours)}
                onValueChange={(val) => setCallConfig(prev => ({ ...prev, delay_hours: parseInt(val) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">9:00 AM</SelectItem>
                  <SelectItem value="10">10:00 AM</SelectItem>
                  <SelectItem value="12">12:00 PM (Noon)</SelectItem>
                  <SelectItem value="14">2:00 PM</SelectItem>
                  <SelectItem value="16">4:00 PM</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Calls are constrained to your organizations calling window. <br />
                Timezone: <span className="font-medium text-slate-700 dark:text-slate-300">{currentOrganization?.timezone || 'America/New_York'}</span>
              </p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="bg-pink-600 hover:bg-pink-700 text-white shadow-md">
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          Save All Changes
        </Button>
      </div>

      {/* Members with Birthdays Section */}
      <Card className="border-none shadow-lg overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-slate-800 dark:to-slate-800/50 border-b">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-500" />
                Members with Birthdays
              </CardTitle>
              <CardDescription>Upcoming birthdays in your congregation</CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/50 dark:bg-white/5 rounded-lg p-1 border border-pink-100 dark:border-white/10">
                <Filter className="h-4 w-4 text-slate-400 ml-2" />
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="border-0 bg-transparent h-8 w-[140px] focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">All Upcoming</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="next_month">Next Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="secondary" className="text-pink-600 bg-pink-100 dark:bg-pink-900/40 dark:text-pink-300">
                {filteredPeople.length} found
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPeople.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <Cake className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No birthdays found</p>
              <p className="text-sm">Try changing the filter or add birthdays to profiles.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPeople.sort((a, b) => {
                const today = new Date();
                const getNextBirthday = (bday: string) => {
                  const birthday = new Date(bday + 'T00:00:00');
                  const thisYear = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
                  if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
                  return thisYear.getTime();
                };
                return getNextBirthday(a.birthday) - getNextBirthday(b.birthday);
              }).map((person) => {
                const birthday = new Date(person.birthday + 'T00:00:00');
                const today = new Date();
                let thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
                if (thisYearBirthday < today) {
                  thisYearBirthday.setFullYear(today.getFullYear() + 1);
                }
                const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isToday = daysUntil === 0;
                const isSoon = daysUntil <= 7 && daysUntil > 0;

                return (
                  <div key={person.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center shadow-sm",
                        isToday ? "bg-pink-500 text-white" : isSoon ? "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400" : "bg-white text-slate-400 border border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                      )}>
                        <Cake className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          {person.first_name} {person.last_name}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {birthday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                          </span>
                          {person.phone_number && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                                <Check className="h-3 w-3 text-emerald-500" />
                                Phone
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {isToday ? (
                        <Badge className="bg-pink-500 text-white hover:bg-pink-600">Today!</Badge>
                      ) : isSoon ? (
                        <Badge variant="secondary" className="bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                          In {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                          In {daysUntil} days
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div >
  );
}
