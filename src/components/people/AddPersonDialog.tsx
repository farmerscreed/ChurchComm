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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

const addPersonSchema = z.object({
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

type AddPersonFormData = z.infer<typeof addPersonSchema>;

interface AddPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonAdded?: () => void;
}

export const AddPersonDialog: React.FC<AddPersonDialogProps> = ({ open, onOpenChange, onPersonAdded }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuthStore();

  const form = useForm<AddPersonFormData>({
    resolver: zodResolver(addPersonSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      member_status: 'visitor',
      tags: '',
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
      },
      birthday: '',
      notes: '',
    },
  });

  const createPerson = useMutation({
    mutationFn: async (formData: AddPersonFormData) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Transform tags from a comma-separated string to an array
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

      const { data: person, error } = await supabase
        .from('people')
        .insert([personData])
        .select()
        .single();

      if (error) throw error;

      return person;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast({
        title: 'Success',
        description: 'Person added successfully to your directory.',
      });
      form.reset();
      onOpenChange(false);
      onPersonAdded?.();
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.message || 'Failed to add person. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const onSubmit = (data: AddPersonFormData) => {
    createPerson.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Person</DialogTitle>
          <DialogDescription>
            Add a new person to your church directory. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

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
                      <Input type="email" placeholder="john@example.com" {...field} />
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
                      <Input placeholder="(555) 123-4567" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="first_time_visitor">First Time Visitor</SelectItem>
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
                    <Input placeholder="volunteer, small group leader, etc. (comma separated)" {...field} />
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPerson.isPending}>
                {createPerson.isPending ? 'Adding...' : 'Add Person'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
