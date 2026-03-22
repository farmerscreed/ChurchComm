import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
// Using gradient divs instead of Card components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Search,
    Zap,
    Cake,
    CalendarClock,
    Play,
    PauseCircle,
    TrendingUp,
    LayoutList,
    LayoutGrid,
    MoreHorizontal,
    Plus,
    MessageSquare
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils'; // Assuming cn exists

interface Automation {
    id: string;
    name: string;
    trigger_type: string;
    status: string;
    total_executions: number;
    last_executed_at: string | null;
    created_at: string;
}

export function AutomationsList() {
    const { currentOrganization } = useAuthStore();
    const { toast } = useToast();
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

    const { data: automations, isLoading, refetch } = useQuery({
        queryKey: ['automations', currentOrganization?.id],
        queryFn: async () => {
            if (!currentOrganization?.id) return [];

            // Fetch automations
            const { data: autoData, error: autoError } = await supabase
                .from('automations')
                .select('*')
                .eq('organization_id', currentOrganization.id)
                .order('created_at', { ascending: false });

            if (autoError) throw autoError;

            // Fetch scheduled messages (outreach)
            const { data: smsData } = await supabase
                .from('scheduled_messages')
                .select('id, content, message_type, status, scheduled_for, created_at')
                .eq('organization_id', currentOrganization.id)
                .order('created_at', { ascending: false });

            // Map scheduled_messages into the Automation shape
            const smsMapped: Automation[] = (smsData || []).map((msg: any) => ({
                id: msg.id,
                name: msg.content ? msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '') : (msg.message_type || 'Scheduled Message'),
                trigger_type: 'scheduled',
                status: msg.status === 'scheduled' ? 'active' : (msg.status === 'sent' ? 'paused' : msg.status),
                total_executions: msg.status === 'sent' ? 1 : 0,
                last_executed_at: msg.status === 'sent' ? msg.scheduled_for : null,
                created_at: msg.created_at,
            }));

            return [...(autoData as Automation[]), ...smsMapped];
        },
        enabled: !!currentOrganization?.id,
    });

    const toggleAutomation = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        try {
            const { error } = await supabase
                .from('automations')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            toast({
                title: newStatus === 'active' ? 'Automation activated' : 'Automation paused',
                description: `The automation has been ${newStatus}.`,
            });
            refetch();
        } catch (error) {
            console.error('Error toggling automation:', error);
            toast({
                title: 'Error',
                description: 'Failed to update automation status.',
                variant: 'destructive',
            });
        }
    };

    const filteredAutomations = automations?.filter(auth => {
        const matchesSearch = auth.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || auth.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="relative w-full lg:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search automations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10"
                    />
                </div>

                <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
                    <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1">
                        {(['all', 'active', 'paused'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setStatusFilter(filter)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize",
                                    statusFilter === filter
                                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                                        : "text-slate-400 hover:text-white"
                                )}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>

                    <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1">
                        <button
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "p-1.5 rounded-full transition-all",
                                viewMode === 'table'
                                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <LayoutList className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-1.5 rounded-full transition-all",
                                viewMode === 'grid'
                                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                    </div>

                    <Button asChild className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0">
                        <Link to="/automations/triggers">
                            <Plus className="h-4 w-4 mr-2" />
                            New Automation
                        </Link>
                    </Button>
                </div>
            </div>

            {/* List */}
            {!filteredAutomations?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
                    <div className="h-16 w-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                        <Zap className="h-8 w-8 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No automations found</h3>
                    <p className="text-sm text-slate-400 max-w-sm mb-6">
                        {search || statusFilter !== 'all'
                            ? 'Try adjusting your filters.'
                            : 'Create your first automation to start streamlining your workflow.'}
                    </p>
                    <Button asChild className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0">
                        <Link to="/automations/triggers">Create Automation</Link>
                    </Button>
                </div>
            ) : viewMode === 'table' ? (
                <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/5 text-slate-400 border-b border-white/10">
                            <tr>
                                <th className="p-4 font-medium">Name</th>
                                <th className="p-4 font-medium">Type</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Executions</th>
                                <th className="p-4 font-medium">Last Run</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredAutomations.map((auto) => (
                                <tr key={auto.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-medium text-white">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                auto.trigger_type === 'birthday' ? "bg-pink-500/20 text-pink-400" :
                                                    auto.trigger_type === 'scheduled' ? "bg-blue-500/20 text-blue-400" :
                                                        "bg-amber-500/20 text-amber-400"
                                            )}>
                                                {auto.trigger_type === 'birthday' ? <Cake className="h-4 w-4" /> :
                                                    auto.trigger_type === 'scheduled' ? <CalendarClock className="h-4 w-4" /> :
                                                        <Zap className="h-4 w-4" />}
                                            </div>
                                            {auto.name}
                                        </div>
                                    </td>
                                    <td className="p-4 capitalize text-slate-400">{auto.trigger_type.replace(/_/g, ' ')}</td>
                                    <td className="p-4">
                                        <Badge variant="outline" className={cn(
                                            "border-white/10",
                                            auto.status === 'active' ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-400"
                                        )}>
                                            {auto.status}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
                                            {auto.total_executions}
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-500">
                                        {auto.last_executed_at
                                            ? new Date(auto.last_executed_at).toLocaleDateString()
                                            : '-'}
                                    </td>
                                    <td className="p-4 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white hover:bg-white/10">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => toggleAutomation(auto.id, auto.status)}>
                                                    {auto.status === 'active' ? <PauseCircle className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                                                    {auto.status === 'active' ? 'Pause' : 'Activate'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link to={`/automations/${auto.id}`}>
                                                        Edit Configuration
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAutomations.map((auto) => {
                        const colors = auto.trigger_type === 'birthday'
                            ? { bg: 'bg-pink-500/20', text: 'text-pink-400', gradient: 'from-pink-500/10 to-pink-500/5', border: 'border-pink-500/20 hover:border-pink-500/30' }
                            : auto.trigger_type === 'scheduled'
                            ? { bg: 'bg-blue-500/20', text: 'text-blue-400', gradient: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/20 hover:border-blue-500/30' }
                            : { bg: 'bg-amber-500/20', text: 'text-amber-400', gradient: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20 hover:border-amber-500/30' };

                        return (
                            <div key={auto.id} className={cn("rounded-xl bg-gradient-to-br border transition-all hover:scale-[1.02]", colors.gradient, colors.border)}>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={cn("p-2.5 rounded-xl", colors.bg)}>
                                            {auto.trigger_type === 'birthday' ? <Cake className={cn("h-5 w-5", colors.text)} /> :
                                                auto.trigger_type === 'scheduled' ? <CalendarClock className={cn("h-5 w-5", colors.text)} /> :
                                                    <Zap className={cn("h-5 w-5", colors.text)} />}
                                        </div>
                                        <Switch
                                            checked={auto.status === 'active'}
                                            onCheckedChange={() => toggleAutomation(auto.id, auto.status)}
                                        />
                                    </div>
                                    <h3 className="font-semibold text-lg text-white mb-1">{auto.name}</h3>
                                    <p className="text-sm text-slate-400 capitalize mb-4">{auto.trigger_type.replace(/_/g, ' ')}</p>

                                    <div className="flex items-center justify-between text-sm text-slate-500 pt-4 border-t border-white/10">
                                        <span className="flex items-center gap-1">
                                            <TrendingUp className="h-3.5 w-3.5" />
                                            {auto.total_executions} runs
                                        </span>
                                        <span>
                                            {auto.last_executed_at
                                                ? new Date(auto.last_executed_at).toLocaleDateString()
                                                : 'Never run'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
