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
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [birthdayCount, setBirthdayCount] = useState(0);
  const [birthdayPeople, setBirthdayPeople] = useState<BirthdayPerson[]>([]);

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

      // Fetch upcoming birthdays with full person data
      const { data: bdayData } = await supabase
        .from('people')
        .select('id, first_name, last_name, birthday, phone_number')
        .eq('organization_id', currentOrganization.id)
        .not('birthday', 'is', null)
        .order('birthday', { ascending: true });

      setBirthdayCount(bdayData?.length || 0);
      setBirthdayPeople(bdayData || []);

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
                Make your members feel loved on their special day with automated, personalized birthday wishes.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 min-w-[180px]">
            <div className="h-14 w-14 bg-white/20 rounded-full flex items-center justify-center mb-1">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{birthdayCount}</p>
              <p className="text-sm font-medium text-pink-100 uppercase tracking-wide">Upcoming Birthdays</p>
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

      {/* Members with Birthdays Section */}
      <Card className="border-none shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/10 dark:to-rose-900/10 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-500" />
                Members with Birthdays
              </CardTitle>
              <CardDescription>All members who have their birthday on file</CardDescription>
            </div>
            <Badge variant="secondary" className="text-pink-600 bg-pink-100">
              {birthdayCount} {birthdayCount === 1 ? 'member' : 'members'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {birthdayPeople.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <Cake className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No birthdays on file</p>
              <p className="text-sm">Add birthdays to member profiles to enable automation.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...birthdayPeople].sort((a, b) => {
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
                const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
                if (thisYearBirthday < today) {
                  thisYearBirthday.setFullYear(today.getFullYear() + 1);
                }
                const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isToday = daysUntil === 0;
                const isSoon = daysUntil <= 7 && daysUntil > 0;

                return (
                  <div key={person.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        isToday ? "bg-pink-500 text-white" : isSoon ? "bg-pink-100 text-pink-600" : "bg-slate-100 text-slate-500"
                      )}>
                        <Cake className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          {person.first_name} {person.last_name}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>{birthday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                          {person.phone_number && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Check className="h-3 w-3 text-emerald-500" />
                                Has phone
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {isToday ? (
                        <Badge className="bg-pink-500 text-white">Today!</Badge>
                      ) : isSoon ? (
                        <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                          In {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-sm text-slate-400">
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
    </div>
  );
}
