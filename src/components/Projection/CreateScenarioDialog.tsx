import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2 } from 'lucide-react';

interface CreateScenarioDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (scenarioId: string) => void;
}

const CreateScenarioDialog = ({ open, onOpenChange, onSuccess }: CreateScenarioDialogProps) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const createScenarioMutation = useMutation({
        mutationFn: async () => {
            // Call the RPC function we created in the migration
            const { data, error } = await supabase.rpc('create_scenario_from_master', {
                p_name: name,
                p_description: description
            });

            if (error) throw error;
            return data as string;
        },
        onSuccess: (scenarioId) => {
            queryClient.invalidateQueries({ queryKey: ['scenarios'] });
            toast({
                title: "Scenario Created",
                description: `Successfully created scenario "${name}"`,
            });
            setName('');
            setDescription('');
            onOpenChange(false);
            onSuccess(scenarioId);
        },
        onError: (error) => {
            console.error('Create scenario error:', error);
            toast({
                title: "Error",
                description: "Failed to create scenario. Please try again.",
                variant: "destructive",
            });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        createScenarioMutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PlusCircle className="w-5 h-5 text-primary" />
                            Create New Scenario
                        </DialogTitle>
                        <DialogDescription>
                            This will create a dedicated copy of all current Master projections. Changes made in this scenario will not affect the Master budget.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Scenario Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Lose One Income, Travel Goal"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the what-if scenario..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={createScenarioMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!name.trim() || createScenarioMutation.isPending}
                            className="gap-2"
                        >
                            {createScenarioMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Scenario
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateScenarioDialog;
