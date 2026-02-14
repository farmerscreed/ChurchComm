import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
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
    Plus
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
            const { data, error } = await supabase
                .from('automations')
                .select('*')
                .eq('organization_id', currentOrganization.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Automation[];
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
                    <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
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
                        className="pl-10"
                    />
                </div>

                <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <Button
                            variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setStatusFilter('all')}
                            className="h-7 text-xs"
                        >
                            All
                        </Button>
                        <Button
                            variant={statusFilter === 'active' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setStatusFilter('active')}
                            className="h-7 text-xs"
                        >
                            Active
                        </Button>
                        <Button
                            variant={statusFilter === 'paused' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setStatusFilter('paused')}
                            className="h-7 text-xs"
                        >
                            Paused
                        </Button>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                        <Button
                            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('table')}
                            className="h-8 w-8 p-0"
                        >
                            <LayoutList className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className="h-8 w-8 p-0"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button asChild className="bg-gradient-to-r from-violet-600 to-indigo-600">
                        <Link to="/automations/triggers">
                            <Plus className="h-4 w-4 mr-2" />
                            New Automation
                        </Link>
                    </Button>
                </div>
            </div>

            {/* List */}
            {!filteredAutomations?.length ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <Zap className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No automations found</h3>
                        <p className="text-sm text-slate-500 max-w-sm mb-6">
                            {search || statusFilter !== 'all'
                                ? 'Try adjusting your filters.'
                                : 'Create your first automation to start streamlining your workflow.'}
                        </p>
                        <Button asChild>
                            <Link to="/automations/triggers">Create Automation</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : viewMode === 'table' ? (
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="p-4 font-medium">Name</th>
                                <th className="p-4 font-medium">Type</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Executions</th>
                                <th className="p-4 font-medium">Last Run</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredAutomations.map((auto) => (
                                <tr key={auto.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="p-4 font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                auto.trigger_type === 'birthday' ? "bg-pink-100 text-pink-600 dark:bg-pink-900/20" :
                                                    auto.trigger_type === 'scheduled' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20" :
                                                        "bg-amber-100 text-amber-600 dark:bg-amber-900/20"
                                            )}>
                                                {auto.trigger_type === 'birthday' ? <Cake className="h-4 w-4" /> :
                                                    auto.trigger_type === 'scheduled' ? <CalendarClock className="h-4 w-4" /> :
                                                        <Zap className="h-4 w-4" />}
                                            </div>
                                            {auto.name}
                                        </div>
                                    </td>
                                    <td className="p-4 capitalize">{auto.trigger_type.replace(/_/g, ' ')}</td>
                                    <td className="p-4">
                                        <Badge variant={auto.status === 'active' ? 'default' : 'secondary'} className={
                                            auto.status === 'active' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" : ""
                                        }>
                                            {auto.status}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5">
                                            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                                            {auto.total_executions}
                                        </div>
                                    </td>
                                    <td className="p-4 text-muted-foreground">
                                        {auto.last_executed_at
                                            ? new Date(auto.last_executed_at).toLocaleDateString()
                                            : '-'}
                                    </td>
                                    <td className="p-4 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
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
                    {filteredAutomations.map((auto) => (
                        <Card key={auto.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={cn(
                                        "p-2.5 rounded-xl",
                                        auto.trigger_type === 'birthday' ? "bg-pink-100 text-pink-600 dark:bg-pink-900/20" :
                                            auto.trigger_type === 'scheduled' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20" :
                                                "bg-amber-100 text-amber-600 dark:bg-amber-900/20"
                                    )}>
                                        {auto.trigger_type === 'birthday' ? <Cake className="h-5 w-5" /> :
                                            auto.trigger_type === 'scheduled' ? <CalendarClock className="h-5 w-5" /> :
                                                <Zap className="h-5 w-5" />}
                                    </div>
                                    <Switch
                                        checked={auto.status === 'active'}
                                        onCheckedChange={() => toggleAutomation(auto.id, auto.status)}
                                    />
                                </div>
                                <h3 className="font-semibold text-lg mb-1">{auto.name}</h3>
                                <p className="text-sm text-muted-foreground capitalize mb-4">{auto.trigger_type.replace(/_/g, ' ')}</p>

                                <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
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
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
