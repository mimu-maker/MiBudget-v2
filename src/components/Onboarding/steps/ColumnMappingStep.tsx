import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Check, X, Plus, Eye } from 'lucide-react';

export const ColumnMappingStep: React.FC = () => {
  const {
    importData,
    columnMappings,
    updateColumnMapping,
    nextPhase,
    previousPhase,
    userPreferences
  } = useOnboarding();

  const [currentColumnIndex, setCurrentColumnIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [newFieldValue, setNewFieldValue] = useState('');
  const [showCreateNew, setShowCreateNew] = useState(false);

  // Mandatory columns that must be mapped
  const mandatoryColumns = [
    { field: 'source', label: 'Source', dataType: 'text' },
    { field: 'date', label: 'Date', dataType: 'date' },
    { field: 'amount', label: 'Amount', dataType: 'number' }
  ];

  // Available MiBudget fields for mapping
  const availableFields = [
    { value: 'source', label: 'Source', dataType: 'text' },
    { value: 'date', label: 'Date', dataType: 'date' },
    { value: 'amount', label: 'Amount', dataType: 'number' },
    { value: 'account', label: 'Account', dataType: 'text' },
    { value: 'category', label: 'Category', dataType: 'text' },
    { value: 'subCategory', label: 'Sub-Category', dataType: 'text' },
    { value: 'description', label: 'Description', dataType: 'text' },
    { value: 'status', label: 'Status', dataType: 'text' },
    { value: 'budget', label: 'Budget', dataType: 'text' },
    { value: 'planned', label: 'Unplanned', dataType: 'boolean' },
    { value: 'recurring', label: 'Recurring', dataType: 'boolean' }
  ];

  // Get columns that need mapping (excluding mandatory ones that are already mapped)
  const getColumnsToMap = () => {
    if (!importData) return [];

    const mappedColumns = columnMappings.map(m => m.sourceColumn);
    const mandatoryMapped = mandatoryColumns.filter(col =>
      columnMappings.some(m => m.targetField === col.field)
    );

    return importData.columns
      .filter(col => !mappedColumns.includes(col))
      .filter(col => !mandatoryMapped.some(m => col === m.field));
  };

  const columnsToMap = getColumnsToMap();
  const currentColumn = columnsToMap[currentColumnIndex];

  // Initialize mappings for mandatory columns
  useEffect(() => {
    if (importData && columnMappings.length === 0) {
      const initialMappings: typeof columnMappings = [];

      importData.columns.forEach(column => {
        const lowerColumn = column.toLowerCase();

        // Auto-detect mandatory columns
        if (lowerColumn.includes('source') || lowerColumn.includes('merchant') || lowerColumn.includes('description') || lowerColumn.includes('payee')) {
          initialMappings.push({
            sourceColumn: column,
            targetField: 'source',
            dataType: 'text',
            sampleData: importData.sampleData[0]?.[column] || '',
            isNewField: false
          });
        } else if (lowerColumn.includes('date') || lowerColumn.includes('time')) {
          initialMappings.push({
            sourceColumn: column,
            targetField: 'date',
            dataType: 'date',
            sampleData: importData.sampleData[0]?.[column] || '',
            isNewField: false
          });
        } else if (lowerColumn.includes('amount') || lowerColumn.includes('value') || lowerColumn.includes('debit') || lowerColumn.includes('credit')) {
          initialMappings.push({
            sourceColumn: column,
            targetField: 'amount',
            dataType: 'number',
            sampleData: importData.sampleData[0]?.[column] || '',
            isNewField: false
          });
        }
      });

      // Update all initial mappings
      initialMappings.forEach(mapping => updateColumnMapping(mapping));
    }
  }, [importData]);

  const detectDataType = (sampleData: string): 'text' | 'date' | 'number' | 'boolean' => {
    if (!sampleData) return 'text';

    // Check for boolean
    if (['true', 'false', 'yes', 'no', '1', '0'].includes(sampleData.toLowerCase())) {
      return 'boolean';
    }

    // Check for date
    const dateRegex = /^\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/;
    if (dateRegex.test(sampleData)) {
      return 'date';
    }

    // Check for number
    const numberRegex = /^[+-]?[\d,]+\.?\d*$/;
    if (numberRegex.test(sampleData.replace(/[^0-9.,\-+]/g, ''))) {
      return 'number';
    }

    return 'text';
  };

  const getCompatibleFields = (dataType: string) => {
    return availableFields.filter(field => field.dataType === dataType);
  };

  const handleFieldMapping = (targetField: string) => {
    if (!currentColumn) return;

    const mapping = {
      sourceColumn: currentColumn,
      targetField,
      dataType: detectDataType(importData?.sampleData[0]?.[currentColumn] || ''),
      sampleData: importData?.sampleData[0]?.[currentColumn] || '',
      isNewField: targetField === 'new'
    };

    updateColumnMapping(mapping);

    // Move to next column or finish
    if (currentColumnIndex < columnsToMap.length - 1) {
      setCurrentColumnIndex(currentColumnIndex + 1);
      setShowCreateNew(false);
      setNewFieldValue('');
    }
  };

  const handleCreateNewField = () => {
    if (!newFieldValue.trim()) return;

    const mapping = {
      sourceColumn: currentColumn,
      targetField: newFieldValue,
      dataType: detectDataType(importData?.sampleData[0]?.[currentColumn] || ''),
      sampleData: importData?.sampleData[0]?.[currentColumn] || '',
      isNewField: true,
      newFieldValue
    };

    updateColumnMapping(mapping);

    if (currentColumnIndex < columnsToMap.length - 1) {
      setCurrentColumnIndex(currentColumnIndex + 1);
      setShowCreateNew(false);
      setNewFieldValue('');
    }
  };

  const handleIgnoreColumn = () => {
    const mapping = {
      sourceColumn: currentColumn,
      targetField: null,
      dataType: detectDataType(importData?.sampleData[0]?.[currentColumn] || ''),
      sampleData: importData?.sampleData[0]?.[currentColumn] || ''
    };

    updateColumnMapping(mapping);

    if (currentColumnIndex < columnsToMap.length - 1) {
      setCurrentColumnIndex(currentColumnIndex + 1);
    }
  };

  const formatSampleData = (data: string, dataType: string): string => {
    if (!data) return 'No data';

    switch (dataType) {
      case 'date':
        try {
          const date = new Date(data);
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: userPreferences.dateFormat.includes('MM') ? '2-digit' : 'short',
            day: '2-digit'
          });
        } catch {
          return data;
        }
      case 'number':
        try {
          const num = parseFloat(data.replace(/[^0-9.-]/g, ''));
          return num.toLocaleString('en-US', {
            style: 'currency',
            currency: userPreferences.currency
          });
        } catch {
          return data;
        }
      default:
        return data;
    }
  };

  const isMandatoryColumnMapped = (field: string) => {
    return columnMappings.some(m => m.targetField === field);
  };

  const allMandatoryMapped = mandatoryColumns.every(col => isMandatoryColumnMapped(col.field));

  const canContinue = allMandatoryMapped && currentColumnIndex >= columnsToMap.length - 1;

  if (!importData) {
    return (
      <div className="text-center py-8">
        <p>No import data available. Please go back and upload a file.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Map Your Columns</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Match your file columns to MiBudget fields. We've auto-detected the important ones.
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Column Mapping Progress</span>
            <span className="text-sm text-muted-foreground">
              {currentColumnIndex + 1} of {columnsToMap.length} columns
            </span>
          </div>

          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentColumnIndex + 1) / columnsToMap.length) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mandatory Columns Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Required Columns</CardTitle>
          <CardDescription>
            These columns must be mapped for proper import
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mandatoryColumns.map((col) => {
              const isMapped = isMandatoryColumnMapped(col.field);
              const mappedColumn = columnMappings.find(m => m.targetField === col.field);

              return (
                <div key={col.field} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isMapped ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                    {isMapped ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <X className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{col.label}</div>
                    {mappedColumn && (
                      <div className="text-sm text-muted-foreground">
                        Mapped to: <span className="font-medium">{mappedColumn.sourceColumn}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Column Mapping */}
      {currentColumn && (
        <Card>
          <CardHeader>
            <CardTitle>Map Column: {currentColumn}</CardTitle>
            <CardDescription>
              Choose how this column should be imported, or ignore it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sample Data */}
            <div>
              <Label>Sample Data</Label>
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <div className="font-mono text-sm">
                  {formatSampleData(
                    importData.sampleData[0]?.[currentColumn] || '',
                    detectDataType(importData.sampleData[0]?.[currentColumn] || '')
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Data type detected: {detectDataType(importData.sampleData[0]?.[currentColumn] || '')}
                </div>
              </div>
            </div>

            {/* Field Mapping */}
            <div>
              <Label>Map to MiBudget Field</Label>
              <div className="mt-2 space-y-3">
                <Select
                  value={columnMappings.find(m => m.sourceColumn === currentColumn)?.targetField || ''}
                  onValueChange={(value) => {
                    if (value === 'new') {
                      setShowCreateNew(true);
                    } else {
                      handleFieldMapping(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a field or create new" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCompatibleFields(detectDataType(importData.sampleData[0]?.[currentColumn] || '')).map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">+ Create New Field</SelectItem>
                    <SelectItem value="ignore">Ignore This Column</SelectItem>
                  </SelectContent>
                </Select>

                {/* Create New Field */}
                {showCreateNew && (
                  <div className="mt-3 p-3 border rounded-lg bg-blue-50">
                    <Label>New Field Name</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newFieldValue}
                        onChange={(e) => setNewFieldValue(e.target.value)}
                        placeholder="Enter field name"
                        className="flex-1"
                      />
                      <Button onClick={handleCreateNewField} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleIgnoreColumn}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Ignore Column
              </Button>
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Import Preview</CardTitle>
            <CardDescription>
              First 10 rows of your data with current mappings applied
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {columnMappings
                      .filter(m => m.targetField)
                      .map((mapping) => (
                        <th key={mapping.sourceColumn} className="text-left p-2 font-medium">
                          {mapping.targetField}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {importData.sampleData.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-b">
                      {columnMappings
                        .filter(m => m.targetField)
                        .map((mapping) => (
                          <td key={mapping.sourceColumn} className="p-2">
                            {formatSampleData(row[mapping.sourceColumn], mapping.dataType)}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={previousPhase}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={nextPhase}
          disabled={!canContinue}
          className="flex items-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
