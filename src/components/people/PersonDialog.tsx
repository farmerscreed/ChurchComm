import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Trash2, MessageSquare, Phone, Send, Loader2 } from 'lucide-react';

const personSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone_number: z.string().optional(),
  member_status: z.enum(['visitor', 'first_time_visitor', 'prospect', 'member', 'inactive', 'child']),
  tags: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }).optional(),
  birthday: z.string().optional(),
  notes: z.string().optional(),
});

type PersonFormData = z.infer<typeof personSchema>;

interface Person {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  member_status: string;
  tags: string[] | null;
  address: any | null;
  birthday: string | null;
  notes: string | null;
}

interface PersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: Person | null;
  onSuccess?: () => void;
}

export const PersonDialog: React.FC<PersonDialogProps> = ({
  open,
  onOpenChange,
  person,
  onSuccess
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuthStore();
  const isEditMode = !!person;

  // Quick action states
  const [showSmsForm, setShowSmsForm] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [showCallForm, setShowCallForm] = useState(false);
  const [callScript, setCallScript] = useState('');
  const [initiatingCall, setInitiatingCall] = useState(false);

  const form = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      member_status: 'visitor',
      tags: '',
      address: { street: '', city: '', state: '', zip: '' },
      birthday: '',
      notes: '',
    },
  });

  // Reset form and quick action states when dialog opens/closes
  useEffect(() => {
    if (open && person) {
      form.reset({
        first_name: person.first_name || '',
        last_name: person.last_name || '',
        email: person.email || '',
        phone_number: person.phone_number || '',
        member_status: (person.member_status as any) || 'visitor',
        tags: person.tags?.join(', ') || '',
        address: {
          street: person.address?.street || '',
          city: person.address?.city || '',
          state: person.address?.state || '',
          zip: person.address?.zip || '',
        },
        birthday: person.birthday || '',
        notes: person.notes || '',
      });
    } else if (open && !person) {
      form.reset({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        member_status: 'visitor',
        tags: '',
        address: { street: '', city: '', state: '', zip: '' },
        birthday: '',
        notes: '',
      });
    }
    // Reset quick action states
    setShowSmsForm(false);
    setShowCallForm(false);
    setSmsMessage('');
    setCallScript('');
  }, [open, person, form]);

  // Send SMS to individual
  const handleSendSms = async () => {
    if (!person?.phone_number || !smsMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Phone number and message are required',
        variant: 'destructive'
      });
      return;
    }

    setSendingSms(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: person.phone_number,
          message: smsMessage,
          organizationId: currentOrganization?.id,
          personId: person.id
        }
      });

      if (error) throw error;

      toast({
        title: 'SMS Sent',
        description: `Message sent to ${person.first_name} ${person.last_name}`,
      });
      setSmsMessage('');
      setShowSmsForm(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send SMS. Check your Twilio configuration.',
        variant: 'destructive'
      });
    } finally {
      setSendingSms(false);
    }
  };

  // Initiate AI call to individual
  const handleInitiateCall = async () => {
    if (!person?.phone_number) {
      toast({
        title: 'Error',
        description: 'This person does not have a phone number',
        variant: 'destructive'
      });
      return;
    }

    setInitiatingCall(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-group-call', {
        body: {
          recipients: [{
            id: person.id,
            phone_number: person.phone_number,
            first_name: person.first_name,
            last_name: person.last_name
          }],
          script: callScript || `Hello ${person.first_name}, this is a call from ${currentOrganization?.name || 'our church'}. How are you doing today?`,
          organizationId: currentOrganization?.id,
          campaignName: `Individual call to ${person.first_name} ${person.last_name}`
        }
      });

      if (error) throw error;

      toast({
        title: 'Call Initiated',
        description: `AI call started to ${person.first_name} ${person.last_name}`,
      });
      setCallScript('');
      setShowCallForm(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate call. Check your Vapi configuration.',
        variant: 'destructive'
      });
    } finally {
      setInitiatingCall(false);
    }
  };

  const savePerson = useMutation({
    mutationFn: async (formData: PersonFormData) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const tagsArray = formData.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [];

      const personData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone_number: formData.phone_number || null,
        member_status: formData.member_status,
        tags: tagsArray.length > 0 ? tagsArray : null,
        birthday: formData.birthday || null,
        notes: formData.notes || null,
        address: formData.address?.street ? formData.address : null,
        organization_id: currentOrganization.id,
      };

      if (isEditMode && person) {
        const { data, error } = await supabase
          .from('people')
          .update(personData)
          .eq('id', person.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('people')
          .insert([personData])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast({
        title: 'Success',
        description: isEditMode ? 'Person updated successfully.' : 'Person added successfully.',
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save person. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const deletePerson = useMutation({
    mutationFn: async () => {
      if (!person?.id) throw new Error('No person to delete');

      const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', person.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast({
        title: 'Success',
        description: 'Person deleted successfully.',
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete person. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this person? This action cannot be undone.')) {
      deletePerson.mutate();
    }
  };

  const onSubmit = (data: PersonFormData) => {
    savePerson.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Person' : 'Add New Person'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the information for this person.'
              : 'Add a new person to your church directory. Fields marked with * are required.'}
          </DialogDescription>
        </DialogHeader>

        {/* Quick Actions - Only show in edit mode with phone number */}
        {isEditMode && person?.phone_number && (
          <>
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button
                    type="button"
                    variant={showSmsForm ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setShowSmsForm(!showSmsForm);
                      setShowCallForm(false);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send SMS
                  </Button>
                  <Button
                    type="button"
                    variant={showCallForm ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setShowCallForm(!showCallForm);
                      setShowSmsForm(false);
                    }}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    AI Call
                  </Button>
                </div>

                {/* SMS Form */}
                {showSmsForm && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Type your message..."
                      value={smsMessage}
                      onChange={e => setSmsMessage(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {smsMessage.length}/160 characters
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSendSms}
                        disabled={sendingSms || !smsMessage.trim()}
                      >
                        {sendingSms ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />{' '}
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" /> Send SMS
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Call Form */}
                {showCallForm && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Optional: Custom script for the AI call (leave blank for default greeting)..."
                      value={callScript}
                      onChange={e => setCallScript(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleInitiateCall}
                        disabled={initiatingCall}
                      >
                        {initiatingCall ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />{' '}
                            Calling...
                          </>
                        ) : (
                          <>
                            <Phone className="h-4 w-4 mr-2" /> Start Call
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Separator />
          </>
        )}

        {/* No phone number warning */}
        {isEditMode && !person?.phone_number && (
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            Add a phone number to enable SMS and calling features.
          </p>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status and Birthday */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="member_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="first_time_visitor">
                          First Time Visitor
                        </SelectItem>
                        <SelectItem value="visitor">Visitor</SelectItem>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="child">Child</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birthday</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="volunteer, small group leader, etc. (comma separated)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Section */}
            <div className="space-y-2">
              <FormLabel>Address</FormLabel>
              <div className="grid grid-cols-1 gap-2">
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Street Address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <FormField
                    control={form.control}
                    name="address.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="ZIP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about this person..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col sm:flex-row-reverse sm:justify-between w-full">
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savePerson.isPending}>
                  {savePerson.isPending
                    ? isEditMode
                      ? 'Saving...'
                      : 'Adding...'
                    : isEditMode
                    ? 'Save Changes'
                    : 'Add Person'}
                </Button>
              </div>
              {isEditMode && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deletePerson.isPending}
                  className="mt-2 sm:mt-0"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deletePerson.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

