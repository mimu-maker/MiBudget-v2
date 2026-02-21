import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { useSettings, AppSettings } from '@/hooks/useSettings';

export const SimpleListSection = ({ title, field, items }: { title: string, field: keyof AppSettings, items: string[] }) => {
    const { addItem, removeItem } = useSettings();
    const [newItem, setNewItem] = useState('');
    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                    {items.map((item, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-2 py-1 px-3 font-normal bg-white border shadow-sm">
                            {item}
                            <button onClick={() => removeItem(field, item)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Input
                        placeholder={`Add ${title.toLowerCase()}...`}
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && newItem.trim()) { addItem(field, newItem.trim()); setNewItem(''); } }}
                        className="h-9"
                    />
                    <Button size="sm" onClick={() => { if (newItem.trim()) { addItem(field, newItem.trim()); setNewItem(''); } }}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
