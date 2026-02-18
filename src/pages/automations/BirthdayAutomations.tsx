import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Cake,
  MessageSquare,
  Phone,
  Save,
  Loader2,
  Gift,
  Check,
  Globe,
  Filter,
  Calendar,
  Clock,
  Sparkles,
  Users,
  HelpCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
    delay_hours: 10,
  });

  // UI State
  const [periodFilter, setPeriodFilter] = useState('upcoming');
  const [activeTab, setActiveTab] = useState<'sms' | 'call'>('sms');

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchData();
    }
  }, [currentOrganization?.id]);

  const fetchData = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      // 1. Fetch SMS Automation
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

      // 2. Fetch Call Automation
      const { data: triggerData } = await supabase
        .from('auto_triggers')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('trigger_type', 'birthday')
        .maybeSingle();

      if (triggerData) {
        setCallConfig(triggerData);
      } else {
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
            delay_hours: callConfig.delay_hours,
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
    return true;
  });

  const today = new Date();
  const currentMonth = today.getMonth();
  const thisMonthCount = birthdayPeople.filter(p => {
    const bday = new Date(p.birthday + 'T00:00:00');
    return bday.getMonth() === currentMonth;
  }).length;

  const nextWeekCount = birthdayPeople.filter(p => {
    const bday = new Date(p.birthday + 'T00:00:00');
    const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
    if (thisYearBday < today) thisYearBday.setFullYear(today.getFullYear() + 1);
    const daysUntil = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 7;
  }).length;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[500px] lg:col-span-2" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/automations" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Automations
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <Cake className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Birthday Automations
            </span>
          </h1>
          <p className="text-slate-400 mt-1">
            Build relationships by automating personal birthday wishes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-slate-400">
            <Globe className="h-3.5 w-3.5" />
            {currentOrganization?.timezone || 'UTC'}
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white border-0 min-w-[120px]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Stats Cards - Gradient Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            title: "Upcoming (7 Days)",
            value: nextWeekCount,
            icon: Gift,
            color: "text-pink-400",
            bgColor: "bg-pink-500/20",
            cardBg: "from-pink-500/10 to-pink-500/5",
            borderColor: "border-pink-500/20"
          },
          {
            title: "This Month",
            value: thisMonthCount,
            icon: Calendar,
            color: "text-blue-400",
            bgColor: "bg-blue-500/20",
            cardBg: "from-blue-500/10 to-blue-500/5",
            borderColor: "border-blue-500/20"
          },
          {
            title: "SMS Status",
            value: smsConfig.status === 'active' ? 'Active' : 'Paused',
            icon: MessageSquare,
            color: smsConfig.status === 'active' ? "text-emerald-400" : "text-slate-400",
            bgColor: smsConfig.status === 'active' ? "bg-emerald-500/20" : "bg-slate-500/20",
            cardBg: smsConfig.status === 'active' ? "from-emerald-500/10 to-emerald-500/5" : "from-slate-500/10 to-slate-500/5",
            borderColor: smsConfig.status === 'active' ? "border-emerald-500/20" : "border-slate-500/20"
          },
          {
            title: "Call Status",
            value: callConfig.enabled ? 'Active' : 'Disabled',
            icon: Phone,
            color: callConfig.enabled ? "text-violet-400" : "text-slate-400",
            bgColor: callConfig.enabled ? "bg-violet-500/20" : "bg-slate-500/20",
            cardBg: callConfig.enabled ? "from-violet-500/10 to-violet-500/5" : "from-slate-500/10 to-slate-500/5",
            borderColor: callConfig.enabled ? "border-violet-500/20" : "border-slate-500/20"
          }
        ].map((stat, idx) => (
          <div key={idx} className={cn("p-5 rounded-xl bg-gradient-to-br border", stat.cardBg, stat.borderColor)}>
            <div className="flex items-center justify-between mb-4">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <p className="text-sm font-medium text-slate-400">{stat.title}</p>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Configuration Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Switcher */}
          <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1">
            {[
              { id: 'sms' as const, label: 'SMS Configuration', icon: MessageSquare },
              { id: 'call' as const, label: 'Call Configuration', icon: Phone },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'sms' && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">SMS Greeting</h3>
                  <p className="text-sm text-slate-400">Configure the automated text message sent on birthdays.</p>
                </div>
                <Switch
                  checked={smsConfig.status === 'active'}
                  onCheckedChange={(checked) => setSmsConfig(prev => ({ ...prev, status: checked ? 'active' : 'paused' }))}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-slate-300">Message Template</Label>
                <Textarea
                  value={smsConfig.message}
                  onChange={(e) => setSmsConfig(prev => ({ ...prev, message: e.target.value }))}
                  className="min-h-[120px] bg-white/5 border-white/10"
                  placeholder="Enter your birthday wish..."
                />
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="text-slate-500">Variables:</span>
                  <Badge variant="outline" className="cursor-pointer border-white/10 text-slate-400 hover:bg-white/5" onClick={() => setSmsConfig(prev => ({ ...prev, message: prev.message + ' {Name}' }))}>
                    {'{Name}'}
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer border-white/10 text-slate-400 hover:bg-white/5" onClick={() => setSmsConfig(prev => ({ ...prev, message: prev.message + ' {Church}' }))}>
                    {'{Church}'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-slate-300">Send Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      type="time"
                      value={smsConfig.sendTime}
                      onChange={(e) => setSmsConfig(prev => ({ ...prev, sendTime: e.target.value }))}
                      className="pl-9 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-300">When to Send</Label>
                  <Select
                    value={String(smsConfig.daysBefore)}
                    onValueChange={(val) => setSmsConfig(prev => ({ ...prev, daysBefore: parseInt(val) }))}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">On Birthday (Same Day)</SelectItem>
                      <SelectItem value="1">1 Day Before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'call' && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Voice Call</h3>
                  <p className="text-sm text-slate-400">Configure the AI phone call sent on birthdays.</p>
                </div>
                <Switch
                  checked={callConfig.enabled}
                  onCheckedChange={(checked) => setCallConfig(prev => ({ ...prev, enabled: checked }))}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-slate-300">Call Script</Label>
                <Select
                  value={callConfig.script_id || ''}
                  onValueChange={(val) => setCallConfig(prev => ({ ...prev, script_id: val }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select a script..." />
                  </SelectTrigger>
                  <SelectContent>
                    {scripts.map(script => (
                      <SelectItem key={script.id} value={script.id}>{script.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {callConfig.enabled && !callConfig.script_id && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Please select a script to enable calls.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-slate-300">Call Time</Label>
                <Select
                  value={String(callConfig.delay_hours)}
                  onValueChange={(val) => setCallConfig(prev => ({ ...prev, delay_hours: parseInt(val) }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9">9:00 AM</SelectItem>
                    <SelectItem value="10">10:00 AM</SelectItem>
                    <SelectItem value="11">11:00 AM</SelectItem>
                    <SelectItem value="12">12:00 PM</SelectItem>
                    <SelectItem value="14">2:00 PM</SelectItem>
                    <SelectItem value="16">4:00 PM</SelectItem>
                    <SelectItem value="18">6:00 PM</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Calls are scheduled in your organization's timezone ({currentOrganization?.timezone || 'UTC'}).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Members Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" /> Members
            </h3>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">All Upcoming</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="next_month">Next Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-[600px] flex flex-col rounded-xl bg-white/5 border border-white/10">
            <div className="flex-1 overflow-y-auto">
              {filteredPeople.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {filteredPeople
                    .sort((a, b) => {
                      const getNextBirthday = (bday: string) => {
                        const birthday = new Date(bday + 'T00:00:00');
                        const today = new Date();
                        const thisYear = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
                        if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
                        return thisYear.getTime();
                      };
                      return getNextBirthday(a.birthday) - getNextBirthday(b.birthday);
                    })
                    .map(person => {
                      const birthday = new Date(person.birthday + 'T00:00:00');
                      const today = new Date();
                      let thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
                      if (thisYearBirthday < today) {
                        thisYearBirthday.setFullYear(today.getFullYear() + 1);
                      }
                      const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      const isToday = daysUntil === 0;

                      return (
                        <div key={person.id} className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-pink-500/20 text-pink-400 text-xs">
                              {person.first_name[0]}{person.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white truncate">
                              {person.first_name} {person.last_name}
                            </h4>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {birthday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>

                          {isToday ? (
                            <Badge className="bg-pink-500 hover:bg-pink-600 text-[10px] px-1.5 py-0.5" variant="secondary">Today</Badge>
                          ) : (
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {daysUntil} days
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <Cake className="h-10 w-10 mb-3 text-slate-600" />
                  <p className="text-sm font-medium text-slate-400">No birthdays found</p>
                  <p className="text-xs mt-1 text-slate-500">Try changing the filter period</p>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-white/10 text-xs text-center text-slate-500">
              Showing {filteredPeople.length} members
            </div>
          </div>
        </div>

      </div>

      {/* Help Link */}
      <div className="flex justify-center pt-2">
        <div className="border-dashed border-2 border-white/10 rounded-xl px-6 py-4 text-center text-slate-400">
          <HelpCircle className="h-5 w-5 mx-auto mb-1 opacity-50" />
          <p className="text-sm">Need help getting started?</p>
          <Link to="/automations/docs" className="text-sm text-pink-400 font-medium hover:underline">
            View Automations Guide
          </Link>
        </div>
      </div>
    </div>
  );
}
