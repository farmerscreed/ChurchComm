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
import { Label } from '@/components/ui/label';
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
  stage: z.enum(['first_timer', 'prospect', 'regular_attendee', 'member']).optional(),
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
  stage: string | null;
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
      stage: 'prospect',
      tags: '',
      address: { street: '', city: '', state: '', zip: '' },
      birthday: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (person) {
        form.reset({
          first_name: person.first_name || '',
          last_name: person.last_name || '',
          email: person.email || '',
          phone_number: person.phone_number || '',
          member_status: (person.member_status as any) || 'visitor',
          stage: (person.stage as any) || 'prospect',
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
      } else {
        form.reset();
      }
      setShowSmsForm(false);
      setShowCallForm(false);
      setSmsMessage('');
      setCallScript('');
    }
  }, [open, person, form]);

  const handleSendSms = async () => {
    // ... (logic unchanged)
  };
  const handleInitiateCall = async () => {
    // ... (logic unchanged)
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
        stage: formData.stage,
        tags: tagsArray.length > 0 ? tagsArray : null,
        birthday: formData.birthday || null,
        notes: formData.notes || null,
        address: formData.address?.street ? formData.address : null,
        organization_id: currentOrganization.id,
      };

      if (isEditMode && person) {
        const { data, error } = await supabase.from('people').update(personData).eq('id', person.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from('people').insert([personData]).select().single();
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
      // ... (logic unchanged)
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
            {isEditMode ? 'Update the information for this person.' : 'Add a new person to your church directory.'}
          </DialogDescription>
        </DialogHeader>
        
        {/* Quick Actions and other UI unchanged */}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>First Name *</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="last_name" render={({ field }) => (<FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="phone_number" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+1 (555) 123-4567" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="member_status" render={({ field }) => (<FormItem><FormLabel>Member Status *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="first_time_visitor">First Time Visitor</SelectItem><SelectItem value="visitor">Visitor</SelectItem><SelectItem value="prospect">Prospect</SelectItem><SelectItem value="member">Member</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="child">Child</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="stage" render={({ field }) => (<FormItem><FormLabel>Lead Stage</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger></FormControl><SelectContent><SelectItem value="first_timer">First-Timer</SelectItem><SelectItem value="prospect">Prospect</SelectItem><SelectItem value="regular_attendee">Regular Attendee</SelectItem><SelectItem value="member">Member</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="birthday" render={({ field }) => (<FormItem><FormLabel>Birthday</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="tags" render={({ field }) => (<FormItem><FormLabel>Tags</FormLabel><FormControl><Input placeholder="volunteer, small group, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="space-y-2">
                <Label>Address</Label>
                {/* ... address fields ... */}
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any additional notes..." rows={3} {...field} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter>{/* ... unchanged ... */}</DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};