import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Cake,
  ArrowLeft,
  Plus,
  MessageSquare,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Settings2,
  Sparkles,
  Gift,
  Send,
  Edit,
  Trash2,
  PartyPopper
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Person {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  birthday: string;
}

interface BirthdayAutomation {
  id: string;
  name: string;
  status: string;
  action_type: string;
  action_config: {
    message_content?: string;
  };
  trigger_config: {
    days_before?: number;
    send_time?: string;
  };
  total_executions: number;
}

export default function BirthdayAutomations() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [automations, setAutomations] = useState<BirthdayAutomation[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Person[]>([]);
  const [todaysBirthdays, setTodaysBirthdays] = useState<Person[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: 'Birthday Wishes',
    message: 'Happy Birthday, {Name}! Wishing you a wonderful day filled with joy and blessings. From all of us at {ChurchName}.',
    daysBefore: '0',
    sendTime: '09:00',
  });

  const [directMessage, setDirectMessage] = useState('');

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

      if (autoError && autoError.code !== 'PGRST116') {
        console.error('Error fetching automations:', autoError);
      }

      setAutomations(autoData || []);

      // Fetch people with birthdays
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentDay = today.getDate();

      const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select('id, first_name, last_name, phone_number, email, birthday')
        .eq('organization_id', currentOrganization.id)
        .not('birthday', 'is', null)
        .order('birthday', { ascending: true });

      if (peopleError) {
        console.error('Error fetching people:', peopleError);
      }

      const people = peopleData || [];

      // Filter today's birthdays and upcoming
      const todayList: Person[] = [];
      const upcomingList: Person[] = [];

      people.forEach((person) => {
        if (!person.birthday) return;

        const bday = new Date(person.birthday);
        const bdayMonth = bday.getMonth() + 1;
        const bdayDay = bday.getDate();

        if (bdayMonth === currentMonth && bdayDay === currentDay) {
          todayList.push(person);
        } else {
          // Calculate days until birthday
          const thisYearBday = new Date(today.getFullYear(), bdayMonth - 1, bdayDay);
          if (thisYearBday < today) {
            thisYearBday.setFullYear(today.getFullYear() + 1);
          }
          const daysUntil = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntil <= 30) {
            upcomingList.push({
              ...person,
              birthday: person.birthday,
            });
          }
        }
      });

      // Sort upcoming by days until birthday
      upcomingList.sort((a, b) => {
        const getDaysUntil = (bday: string) => {
          const d = new Date(bday);
          const today = new Date();
          const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
          if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
          return Math.ceil((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        };
        return getDaysUntil(a.birthday) - getDaysUntil(b.birthday);
      });

      setTodaysBirthdays(todayList);
      setUpcomingBirthdays(upcomingList);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntil = (birthday: string) => {
    const today = new Date();
    const bday = new Date(birthday);
    const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
    if (thisYearBday < today) {
      thisYearBday.setFullYear(today.getFullYear() + 1);
    }
    const days = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const createAutomation = async () => {
    if (!currentOrganization?.id) return;

    try {
      const { error } = await supabase.from('automations').insert({
        organization_id: currentOrganization.id,
        name: formData.name,
        trigger_type: 'birthday',
        status: 'active',
        action_type: 'send_sms',
        action_config: {
          message_content: formData.message,
        },
        trigger_config: {
          days_before: parseInt(formData.daysBefore),
          send_time: formData.sendTime,
        },
      });

      if (error) throw error;

      toast({
        title: 'Automation created',
        description: 'Birthday automation has been created successfully.',
      });

      setShowCreateDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error creating automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create automation.',
        variant: 'destructive',
      });
    }
  };

  const toggleAutomation = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    try {
      const { error } = await supabase
        .from('automations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );

      toast({
        title: newStatus === 'active' ? 'Automation activated' : 'Automation paused',
      });
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update automation.',
        variant: 'destructive',
      });
    }
  };

  const sendBirthdayMessage = async () => {
    if (!selectedPerson || !directMessage) return;

    try {
      // Call the send-sms function
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          recipientType: 'individual',
          personId: selectedPerson.id,
          message: directMessage.replace('{Name}', selectedPerson.first_name),
          organizationId: currentOrganization?.id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Message sent!',
        description: `Birthday message sent to ${selectedPerson.first_name}.`,
      });

      setShowSendDialog(false);
      setSelectedPerson(null);
      setDirectMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message.',
        variant: 'destructive',
      });
    }
  };

  const openSendDialog = (person: Person) => {
    setSelectedPerson(person);
    setDirectMessage(`Happy Birthday, ${person.first_name}! Wishing you a wonderful day filled with joy and blessings. From all of us at ${currentOrganization?.name || 'our church'}.`);
    setShowSendDialog(true);
  };

  const formatBirthday = (birthday: string) => {
    const date = new Date(birthday);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/automations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Cake className="h-6 w-6 text-pink-500" />
            Birthday Automations
          </h1>
          <p className="text-muted-foreground mt-1">
            Automatically celebrate your members on their special day
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Automation
        </Button>
      </div>

      {/* Today's Birthdays Alert */}
      {todaysBirthdays.length > 0 && (
        <Card className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 border-pink-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                <PartyPopper className="h-6 w-6 text-pink-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Today's Birthdays!</h3>
                <p className="text-sm text-muted-foreground">
                  {todaysBirthdays.length} member{todaysBirthdays.length > 1 ? 's have' : ' has'} a birthday today
                </p>
              </div>
              <div className="flex gap-2">
                {todaysBirthdays.slice(0, 3).map((person) => (
                  <Button
                    key={person.id}
                    size="sm"
                    variant="outline"
                    onClick={() => openSendDialog(person)}
                  >
                    <Gift className="h-4 w-4 mr-1" />
                    {person.first_name}
                  </Button>
                ))}
                {todaysBirthdays.length > 3 && (
                  <Badge variant="secondary">+{todaysBirthdays.length - 3} more</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            <Calendar className="h-4 w-4 mr-2" />
            Upcoming Birthdays
          </TabsTrigger>
          <TabsTrigger value="automations">
            <Sparkles className="h-4 w-4 mr-2" />
            Automations
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Birthdays Tab */}
        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Birthdays (Next 30 Days)</CardTitle>
              <CardDescription>
                Members with birthdays coming up soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : upcomingBirthdays.length === 0 ? (
                <div className="text-center py-12">
                  <Cake className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-1">No upcoming birthdays</h3>
                  <p className="text-sm text-muted-foreground">
                    No members have birthdays in the next 30 days
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingBirthdays.map((person) => {
                    const daysUntil = getDaysUntil(person.birthday);
                    return (
                      <div
                        key={person.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-pink-500" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {person.first_name} {person.last_name}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatBirthday(person.birthday)}
                              </span>
                              {person.phone_number && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {person.phone_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={daysUntil <= 7 ? 'default' : 'secondary'}
                            className={daysUntil <= 7 ? 'bg-pink-500' : ''}
                          >
                            {daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSendDialog(person)}
                            disabled={!person.phone_number}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Send
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Birthday Automations</CardTitle>
              <CardDescription>
                Automated birthday messages for your members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <Skeleton className="h-5 w-40 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : automations.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-1">No birthday automations</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create an automation to automatically send birthday wishes
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Automation
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {automations.map((automation) => (
                    <div
                      key={automation.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{automation.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Sends {automation.trigger_config.days_before === 0 ? 'on' : `${automation.trigger_config.days_before} days before`} birthday at {automation.trigger_config.send_time}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={automation.status === 'active' ? 'default' : 'secondary'}
                            className={automation.status === 'active' ? 'bg-emerald-500' : ''}
                          >
                            {automation.status}
                          </Badge>
                          <Switch
                            checked={automation.status === 'active'}
                            onCheckedChange={() =>
                              toggleAutomation(automation.id, automation.status)
                            }
                          />
                        </div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <p className="text-muted-foreground">
                          {automation.action_config.message_content}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          {automation.total_executions} messages sent
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Birthday Settings</CardTitle>
              <CardDescription>
                Configure default settings for birthday messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Send Time</Label>
                  <Input type="time" defaultValue="09:00" />
                  <p className="text-xs text-muted-foreground">
                    Time of day to send birthday messages
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Days Before Birthday</Label>
                  <Select defaultValue="0">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">On the day</SelectItem>
                      <SelectItem value="1">1 day before</SelectItem>
                      <SelectItem value="2">2 days before</SelectItem>
                      <SelectItem value="7">1 week before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Message Template</Label>
                <Textarea
                  rows={3}
                  defaultValue="Happy Birthday, {Name}! Wishing you a wonderful day filled with joy and blessings. From all of us at {ChurchName}."
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {'{Name}'}, {'{ChurchName}'}, {'{Age}'}
                </p>
              </div>
              <Button>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Automation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Birthday Automation</DialogTitle>
            <DialogDescription>
              Set up automatic birthday messages for your members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Automation Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Birthday Wishes"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Use {'{Name}'} to personalize the message
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>When to Send</Label>
                <Select
                  value={formData.daysBefore}
                  onValueChange={(value) => setFormData({ ...formData, daysBefore: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">On birthday</SelectItem>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="2">2 days before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Send Time</Label>
                <Input
                  type="time"
                  value={formData.sendTime}
                  onChange={(e) => setFormData({ ...formData, sendTime: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createAutomation}>Create Automation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Send Birthday Message to {selectedPerson?.first_name}
            </DialogTitle>
            <DialogDescription>
              Send a personalized birthday message
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPerson && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="h-10 w-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <p className="font-medium">
                    {selectedPerson.first_name} {selectedPerson.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPerson.phone_number}
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={4}
                value={directMessage}
                onChange={(e) => setDirectMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendBirthdayMessage} disabled={!directMessage}>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
