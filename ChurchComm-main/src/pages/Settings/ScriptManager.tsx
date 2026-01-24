import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, PlusCircle, Loader2, Trash2, Edit, Sparkles, BookOpen, Heart, Users } from 'lucide-react';
import { format } from 'date-fns';

// Pre-built script templates
const SCRIPT_TEMPLATES = [
  {
    id: 'soul-winning',
    name: 'Soul Winning',
    icon: Heart,
    description: 'Share the Gospel and lead people to Christ',
    content: `Goals: Share the Gospel message in a warm, conversational way and offer the opportunity to accept Christ as Savior.

Opening:
- Greet {{person.first_name}} warmly and introduce yourself as calling from the church
- Ask how they're doing and if they have a few minutes to chat
- Express genuine care and interest in their well-being

Building Connection:
- Ask about their spiritual journey: "Have you been attending any church lately?" or "What's your experience been like with faith or spirituality?"
- Listen actively and respond with empathy
- Share briefly about how the church has been a blessing to you or others

Sharing the Gospel (if appropriate and they're open):
- "Can I share something that has changed my life?"
- Explain God's love: "God loves you so much and has an amazing plan for your life"
- Share about sin and our need for a Savior: "We've all made mistakes, but God offers forgiveness"
- Present Jesus: "Jesus died for us so we could have eternal life and a relationship with God"
- Offer the invitation: "Would you like to invite Jesus into your heart today?"

If they say YES:
- Guide them in a simple prayer of salvation
- Celebrate with them!
- Offer to connect them with a mentor or small group
- Schedule a follow-up call or visit
- Mark as HIGH PRIORITY for pastoral follow-up

If they want to think about it:
- Respect their decision warmly
- Offer to send them some resources
- Ask if they'd like another call in a week or two
- Invite them to visit a service

If they're not interested:
- Thank them for their time graciously
- Let them know the church is always here if they need prayer or support
- Don't push - plant the seed with love

Tone: Warm, loving, patient, non-judgmental, Spirit-led

Escalation Triggers:
- Accepts Christ as Savior -> URGENT: Immediate pastoral follow-up
- Expresses spiritual hunger or questions -> HIGH priority
- Going through difficult times -> HIGH priority for pastoral care
- Wants to visit the church -> MEDIUM priority`
  },
  {
    id: 'evangelism',
    name: 'Evangelism Outreach',
    icon: Users,
    description: 'Reach out to community members and invite them to church',
    content: `Goals: Connect with community members, share about the church, and invite them to upcoming services or events.

Opening:
- "Hi {{person.first_name}}, this is [Your Name] calling from [Church Name]. How are you doing today?"
- Be warm and friendly, not salesy
- If they're busy, offer to call back at a better time

Introduction to the Church:
- Briefly share what makes the church special: "We're a friendly community that..."
- Mention the church's mission: helping people know God and make a difference
- Share about recent church activities or community involvement

Understanding Their Situation:
- "Are you currently connected to a church family?"
- "What's been your experience with church in the past?"
- Listen for needs, concerns, or past hurts related to church
- Be empathetic if they've had negative experiences

Invitation:
- Invite them to an upcoming service: "We'd love to have you visit this Sunday..."
- Mention special events, small groups, or programs that might interest them
- Offer specific service times and what to expect
- "Is there anything that would make you more comfortable visiting?"

Addressing Common Concerns:
- "I understand. Many people feel that way..." (acknowledge their feelings)
- Offer low-pressure options: online services, community events, coffee meetups
- Let them know there's no pressure to commit to anything

Follow-Up Offer:
- "Can I send you some information about the church?"
- "Would you like me to save you a seat and meet you at the door?"
- Offer to answer any questions they have

Closing:
- Thank them for their time regardless of their response
- "Feel free to reach out if you ever need prayer or support"
- "We're here for the community, whether you visit or not"

Tone: Warm, inviting, patient, understanding, not pushy

Escalation Triggers:
- Wants to visit this week -> HIGH priority - arrange welcome team
- Has questions about faith -> HIGH priority for follow-up
- Experienced church hurt -> MEDIUM priority for pastoral care
- Needs practical help -> Connect with benevolence/outreach team`
  },
  {
    id: 'first-timer-welcome',
    name: 'First-Timer Welcome',
    icon: Sparkles,
    description: 'Welcome first-time visitors and connect them to the church',
    content: `Goals: Welcome first-time visitors warmly, get feedback on their experience, and help them take next steps.

Opening:
- "Hi {{person.first_name}}, this is [Your Name] from [Church Name]. I wanted to personally thank you for visiting us!"
- "We noticed this was your first time with us and wanted to check in"

Getting Feedback:
- "How was your experience on Sunday?"
- "Was there anything that stood out to you?"
- "Did you find everything okay - parking, seating, kids area?"
- Listen carefully and take notes

Addressing Any Concerns:
- If they had any issues, apologize and explain how we can do better
- "I'm sorry to hear that. Let me make sure we address that..."
- Thank them for the feedback

Helping Them Connect:
- "Are you currently part of a church family or are you looking for a church home?"
- If looking: "What are you hoping to find in a church?"
- Share about small groups, serving opportunities, or classes
- "What's the best way for you to connect - small groups, volunteering, or just attending services for now?"

Next Steps:
- Invite them back: "We'd love to see you again this Sunday!"
- Offer specific programs: "We have a newcomers class that helps people learn more about the church"
- "Is there anything specific I can help you with or any questions you have?"

Prayer:
- "Is there anything I can be praying for you about?"
- If yes, pray with them briefly on the call
- Note prayer requests for follow-up

Closing:
- "Thank you so much for giving us a chance to meet you"
- "Please don't hesitate to reach out if you need anything at all"
- Confirm their contact info is correct for future communication

Tone: Grateful, warm, helpful, not overwhelming

Escalation Triggers:
- Had a negative experience -> HIGH priority for staff follow-up
- Wants to get involved immediately -> MEDIUM priority - connect with ministry leader
- Has prayer needs or going through difficulty -> HIGH priority for pastoral care
- Interested in membership -> MEDIUM priority for membership class invite`
  },
  {
    id: 'prayer-follow-up',
    name: 'Prayer Follow-Up',
    icon: BookOpen,
    description: 'Follow up with those who requested prayer',
    content: `Goals: Follow up on prayer requests, show care, and offer continued support.

Opening:
- "Hi {{person.first_name}}, this is [Your Name] from [Church Name]"
- "I wanted to call and check in on you"
- "We've been praying for [their specific request] and wanted to see how you're doing"

Checking In:
- "How have things been going with [the situation]?"
- "Have you seen any changes or answers to prayer?"
- Listen attentively and show genuine care
- Acknowledge their feelings: "That sounds really challenging" or "That's wonderful news!"

Continued Prayer:
- "I'd love to pray with you right now if that's okay"
- Pray specifically for their situation
- Ask if there are any updates to their prayer request

Offering Support:
- "Is there anything the church can do to help?"
- If appropriate, offer pastoral counseling, support groups, or practical help
- "Would you like someone to visit you in person?"

Spiritual Encouragement:
- Share a relevant scripture if appropriate
- Encourage them in their faith
- "God is with you through this"

Next Steps:
- "Would you like us to continue praying for this?"
- "Can I call you again in a week to check in?"
- Invite them to prayer services or small groups

Tone: Compassionate, prayerful, supportive, patient

Escalation Triggers:
- Crisis situation (health, family, financial) -> URGENT for pastoral care
- Spiritual crisis or doubts -> HIGH priority for pastoral follow-up
- Answered prayer/testimony -> Note for celebration and encouragement
- Needs practical help -> Connect with appropriate ministry`
  }
];


interface Script {
  id: string;
  name: string;
  description: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function ScriptManager() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [scriptName, setScriptName] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');
  const [scriptContent, setScriptContent] = useState('');

  const loadScripts = async () => {
    if (!currentOrganization) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('call_scripts')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setScripts(data);
    } catch {
      toast({ title: "Error", description: "Could not load scripts.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScripts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id]);

  const handleOpenDialog = (script: Script | null = null) => {
    setEditingScript(script);
    setScriptName(script?.name || '');
    setScriptDescription(script?.description || '');
    setScriptContent(script?.content || '');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingScript(null);
    setScriptName('');
    setScriptDescription('');
    setScriptContent('');
  };

  const handleSaveScript = async () => {
    if (!scriptName.trim() || !scriptContent.trim() || !currentOrganization) {
      toast({ title: "Error", description: "Script name and content are required.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const scriptData = {
        organization_id: currentOrganization.id,
        name: scriptName,
        description: scriptDescription,
        content: scriptContent,
        updated_at: new Date().toISOString(),
      };

      if (editingScript) {
        // Update existing script
        const { error } = await supabase.from('call_scripts').update(scriptData).eq('id', editingScript.id);
        if (error) throw error;
        toast({ title: "Success", description: "Script updated successfully." });
      } else {
        // Create new script
        const { error } = await supabase.from('call_scripts').insert(scriptData);
        if (error) throw error;
        toast({ title: "Success", description: "Script created successfully." });
      }
      
      handleCloseDialog();
      loadScripts();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to save script.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteScript = async (scriptId: string) => {
      if (!confirm('Are you sure you want to delete this script? This action cannot be undone.')) return;

      setLoading(true);
      try {
          const { error } = await supabase.from('call_scripts').delete().eq('id', scriptId);
          if (error) throw error;
          toast({ title: "Success", description: "Script deleted successfully." });
          loadScripts();
      } catch (error) {
          toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete script.", variant: "destructive" });
      } finally {
          setLoading(false);
      }
  };

  const handleAddTemplate = async (template: typeof SCRIPT_TEMPLATES[0]) => {
    if (!currentOrganization) return;

    // Check if a script with the same name already exists
    const existingScript = scripts.find(s => s.name.toLowerCase() === template.name.toLowerCase());
    if (existingScript) {
      toast({
        title: "Script Already Exists",
        description: `A script named "${template.name}" already exists. You can edit it from the list below.`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('call_scripts').insert({
        organization_id: currentOrganization.id,
        name: template.name,
        description: template.description,
        content: template.content,
      });

      if (error) throw error;
      toast({ title: "Success", description: `"${template.name}" script added successfully.` });
      loadScripts();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to add template.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Script Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Script Templates
          </CardTitle>
          <CardDescription>
            Pre-built scripts for common calling scenarios. Click to add them to your library.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCRIPT_TEMPLATES.map((template) => {
              const IconComponent = template.icon;
              const isAdded = scripts.some(s => s.name.toLowerCase() === template.name.toLowerCase());
              return (
                <div key={template.id} className="border rounded-lg p-4 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    <Accordion type="single" collapsible className="mt-2">
                      <AccordionItem value="preview" className="border-none">
                        <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
                          Preview script content
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md max-h-48 overflow-y-auto">
                            {template.content}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                  <Button
                    variant={isAdded ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleAddTemplate(template)}
                    disabled={loading || isAdded}
                    className="flex-shrink-0"
                  >
                    {isAdded ? 'Added' : 'Add'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Your Scripts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Scripts
            </CardTitle>
            <CardDescription>
              Create and manage reusable scripts for your AI calling campaigns.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Script
          </Button>
        </CardHeader>
        <CardContent>
        {loading && scripts.length === 0 ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-semibold">No scripts yet.</p>
            <p className="text-muted-foreground mt-1">Click "New Script" to create your first one.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scripts.map(script => (
              <div key={script.id} className="p-4 border rounded-lg flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{script.name}</h3>
                  <p className="text-sm text-muted-foreground">{script.description || 'No description'}</p>
                  <p className="text-xs text-muted-foreground mt-2">Last updated: {format(new Date(script.updated_at), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(script)}>
                      <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteScript(script.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingScript ? 'Edit Script' : 'Create New Script'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="script-name">Script Name</Label>
              <Input id="script-name" value={scriptName} onChange={(e) => setScriptName(e.target.value)} placeholder="e.g., First-Timer Welcome Call" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="script-description">Description (Optional)</Label>
              <Input id="script-description" value={scriptDescription} onChange={(e) => setScriptDescription(e.target.value)} placeholder="A short description of this script's purpose." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="script-content">Script Content (Conversation Guide)</Label>
              <Textarea
                id="script-content"
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                placeholder={`Goals: Welcome them as a new member and make them feel valued.

Topics to cover:
- Congratulate them on joining
- Ask how they're settling in
- Mention ways to connect (small groups, serving teams, classes)
- Offer to have someone reach out to help them

Tone: Warm, friendly, conversational

Escalation triggers:
- Wants to serve or join a group → Medium priority
- Has questions about beliefs → Medium priority
- Expresses any concerns → High priority`}
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                Write this as a <strong>conversation guide</strong>, not a script to be read word-for-word. Include goals, topics to cover, and the desired tone. The AI will use this as guidance to have a natural conversation. You can use {"{{person.first_name}}"} for the person's name.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSaveScript} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Script'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
