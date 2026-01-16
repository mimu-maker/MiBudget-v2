
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, X } from 'lucide-react';

interface BulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export const BulkActionBar = ({
    selectedCount,
    onClearSelection,
    onEdit,
    onDelete,
}: BulkActionBarProps) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-gray-200 shadow-lg rounded-full px-6 py-3 flex items-center space-x-4 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
            <div className="flex items-center space-x-2 border-r border-gray-100 pr-4">
                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {selectedCount}
                </span>
                <span className="text-sm font-medium text-gray-700">selected</span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSelection}
                    className="h-7 w-7 p-0 hover:bg-gray-100 rounded-full"
                >
                    <X className="w-4 h-4 text-gray-400" />
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onEdit}
                    className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200 h-9"
                >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                </Button>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDelete}
                    className="h-9"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                </Button>
            </div>
        </div>
    );
};
