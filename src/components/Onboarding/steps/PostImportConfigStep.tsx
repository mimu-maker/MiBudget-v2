import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Plus, Settings } from 'lucide-react';

export const PostImportConfigStep: React.FC = () => {
  const {
    importData,
    categories,
    addCategory,
    updatePreferences,
    nextPhase,
    previousPhase,
    userPreferences
  } = useOnboarding();

  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [defaultValues, setDefaultValues] = useState<Record<string, any>>({});
  const [newCategory, setNewCategory] = useState({ name: '', icon: '', color: '#3b82f6' });
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Available MiBudget columns that might not be in import
  const availableColumns = [
    { field: 'account', label: 'Account', description: 'Bank account or credit card' },
    { field: 'category', label: 'Category', description: 'Transaction category' },
    { field: 'subCategory', label: 'Sub-Category', description: 'More specific categorization' },
    { field: 'description', label: 'Description', description: 'Transaction details' },
    { field: 'status', label: 'Status', description: 'Transaction status (pending, complete)' },
    { field: 'budget', label: 'Budget', description: 'Budget assignment' },
    { field: 'planned', label: 'Unplanned', description: 'Unplanned transaction' },
    { field: 'recurring', label: 'Recurring', description: 'Recurring transaction flag' }
  ];

  // Default categories to suggest
  const defaultCategories = [
    { name: 'Food & Dining', icon: '🍔', color: '#ef4444' },
    { name: 'Transportation', icon: '🚗', color: '#f59e0b' },
    { name: 'Shopping', icon: '🛍', color: '#8b5cf6' },
    { name: 'Entertainment', icon: '🎬', color: '#ec4899' },
    { name: 'Bills & Utilities', icon: '💡', color: '#f97316' },
    { name: 'Healthcare', icon: '⚕', color: '#06b6d4' },
    { name: 'Income', icon: '💰', color: '#10b981' },
    { name: 'Personal Care', icon: '💄', color: '#84cc16' },
    { name: 'Education', icon: '📚', color: '#6366f1' },
    { name: 'Travel', icon: '✈', color: '#0ea5e9' }
  ];

  // Get columns from import data
  const importedColumns = importData?.columns || [];

  // Get columns that are not in import
  const missingColumns = availableColumns.filter(col => !importedColumns.includes(col.field));

  useEffect(() => {
    // Auto-select important missing columns
    const importantColumns = ['category', 'account', 'status'];
    setSelectedColumns(importantColumns.filter(col => missingColumns.some(m => m.field === col)));
  }, [importData]);

  const handleColumnToggle = (column: string, checked: boolean) => {
    if (checked) {
      setSelectedColumns([...selectedColumns, column]);
    } else {
      setSelectedColumns(selectedColumns.filter(c => c !== column));
    }
  };

  const handleDefaultValueChange = (column: string, value: any) => {
    setDefaultValues(prev => ({ ...prev, [column]: value }));
  };

  const handleAddCategory = () => {
    if (newCategory.name.trim()) {
      addCategory({
        name: newCategory.name,
        icon: newCategory.icon || '📁',
        color: newCategory.color,
        isSystem: false,
        subCategories: []
      });
      setNewCategory({ name: '', icon: '', color: '#3b82f6' });
      setShowAddCategory(false);
    }
  };

  const handleAddDefaultCategory = (category: typeof defaultCategories[0]) => {
    addCategory({
      ...category,
      isSystem: false,
      subCategories: []
    });
  };

  const canContinue = () => {
    // Can continue if at least one column is selected or user chooses to skip
    return selectedColumns.length > 0 || true; // Allow skipping
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Complete Your Data Setup</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose additional fields to include and set up default values for missing information.
        </p>
      </div>

      {/* Missing Columns Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Fields</CardTitle>
          <CardDescription>
            Select fields that weren't in your import but you want to include
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missingColumns.map((column) => (
              <div key={column.field} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={column.field}
                  checked={selectedColumns.includes(column.field)}
                  onCheckedChange={(checked) => handleColumnToggle(column.field, checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor={column.field} className="font-medium cursor-pointer">
                    {column.label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {column.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Default Values */}
      {selectedColumns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Default Values</CardTitle>
            <CardDescription>
              Set default values for the selected fields
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedColumns.map((column) => {
              const columnInfo = availableColumns.find(c => c.field === column);
              if (!columnInfo) return null;

              return (
                <div key={column} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{columnInfo.label}</Label>
                    <p className="text-sm text-muted-foreground">
                      {columnInfo.description}
                    </p>
                  </div>
                  <div>
                    {column === 'account' && (
                      <Select
                        value={defaultValues[column] || 'Checking'}
                        onValueChange={(value) => handleDefaultValueChange(column, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Checking">Checking</SelectItem>
                          <SelectItem value="Savings">Savings</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {column === 'status' && (
                      <Select
                        value={defaultValues[column] || 'Complete'}
                        onValueChange={(value) => handleDefaultValueChange(column, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Complete">Complete</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {column === 'category' && (
                      <Select
                        value={defaultValues[column] || ''}
                        onValueChange={(value) => handleDefaultValueChange(column, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select default category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.name} value={cat.name}>
                              {cat.icon} {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {column === 'planned' && (
                      <Select
                        value={defaultValues[column]?.toString() || 'false'}
                        onValueChange={(value) => handleDefaultValueChange(column, value === 'true')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {column === 'recurring' && (
                      <Select
                        value={defaultValues[column]?.toString() || 'false'}
                        onValueChange={(value) => handleDefaultValueChange(column, value === 'true')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Categories Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Categories
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddCategory(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Custom
            </Button>
          </CardTitle>
          <CardDescription>
            Set up categories for organizing your transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Default Categories */}
          <div>
            <Label className="text-base font-medium">Suggested Categories</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
              {defaultCategories.map((category) => {
                const exists = categories.some(c => c.name === category.name);
                return (
                  <Badge
                    key={category.name}
                    variant={exists ? "default" : "outline"}
                    className="cursor-pointer hover:bg-accent"
                    style={{
                      backgroundColor: exists ? category.color : 'transparent',
                      color: exists ? 'white' : 'inherit'
                    }}
                    onClick={() => !exists && handleAddDefaultCategory(category)}
                  >
                    <span className="mr-1">{category.icon}</span>
                    {category.name}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Custom Category Addition */}
          {showAddCategory && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <Label>Add Custom Category</Label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                <Input
                  placeholder="Category name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Icon (emoji)"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                />
                <Input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                />
                <Button onClick={handleAddCategory}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Current Categories */}
          {categories.length > 0 && (
            <div>
              <Label>Your Categories</Label>
              <div className="flex flex-wrap gap-2 mt-3">
                {categories.map((category) => (
                  <Badge
                    key={category.name}
                    style={{
                      backgroundColor: category.color,
                      color: 'white'
                    }}
                  >
                    <span className="mr-1">{category.icon}</span>
                    {category.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium">Configuration Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Imported Columns:</strong> {importedColumns.length}
              </div>
              <div>
                <strong>Additional Fields:</strong> {selectedColumns.length}
              </div>
              <div>
                <strong>Categories:</strong> {categories.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={previousPhase}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={nextPhase}
          disabled={!canContinue()}
          className="flex items-center gap-2"
        >
          Continue to Visualization
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
