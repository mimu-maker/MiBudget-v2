
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: any[]) => void;
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  account: string;
  status: string;
  budget: string;
  category: string;
  subCategory: string;
  planned: boolean;
  recurring: string;
  note: string;
}

const transactionColumns = [
  'date', 'description', 'amount', 'account', 'status', 
  'budget', 'category', 'subCategory', 'planned', 'recurring', 'note'
];

export const CsvImportDialog = ({ open, onOpenChange, onImport }: CsvImportDialogProps) => {
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
      setCsvData(rows.filter(row => row.length > 1));
      
      // Auto-detect headers
      const firstRow = rows[0];
      const hasHeadersDetected = firstRow.some(cell => 
        transactionColumns.some(col => 
          cell.toLowerCase().includes(col.toLowerCase())
        )
      );
      setHasHeaders(hasHeadersDetected);
      
      // Auto-match columns
      if (hasHeadersDetected) {
        const autoMapping: Record<string, string> = {};
        firstRow.forEach((header, index) => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z]/g, '');
          const match = transactionColumns.find(col => 
            col.toLowerCase().includes(normalizedHeader) || 
            normalizedHeader.includes(col.toLowerCase())
          );
          if (match) {
            autoMapping[index.toString()] = match;
          }
        });
        setColumnMapping(autoMapping);
      }
    };
    reader.readAsText(file);
  };

  const generatePreview = () => {
    if (csvData.length === 0) return;
    
    const dataRows = hasHeaders ? csvData.slice(1) : csvData;
    const previewData = dataRows.slice(0, 5).map((row, index) => {
      const transaction: any = { id: index };
      
      Object.entries(columnMapping).forEach(([csvIndex, transactionField]) => {
        const value = row[parseInt(csvIndex)];
        
        if (transactionField === 'amount') {
          transaction[transactionField] = parseFloat(value) || 0;
        } else if (transactionField === 'planned') {
          transaction[transactionField] = value.toLowerCase() === 'true' || value === '1';
        } else {
          transaction[transactionField] = value || '';
        }
      });
      
      return transaction;
    });
    
    setPreview(previewData);
    
    // Validate data
    const newErrors: string[] = [];
    previewData.forEach((row, index) => {
      if (!row.date) newErrors.push(`Row ${index + 1}: Missing date`);
      if (!row.description) newErrors.push(`Row ${index + 1}: Missing description`);
      if (isNaN(row.amount)) newErrors.push(`Row ${index + 1}: Invalid amount`);
    });
    setErrors(newErrors);
  };

  const handleImport = () => {
    if (errors.length > 0) return;
    
    const dataRows = hasHeaders ? csvData.slice(1) : csvData;
    const importData = dataRows.map((row, index) => {
      const transaction: any = { id: Date.now() + index };
      
      Object.entries(columnMapping).forEach(([csvIndex, transactionField]) => {
        const value = row[parseInt(csvIndex)];
        
        if (transactionField === 'amount') {
          transaction[transactionField] = parseFloat(value) || 0;
        } else if (transactionField === 'planned') {
          transaction[transactionField] = value.toLowerCase() === 'true' || value === '1';
        } else {
          transaction[transactionField] = value || '';
        }
      });
      
      return transaction;
    });
    
    onImport(importData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import CSV File</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          {csvData.length > 0 && (
            <>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={hasHeaders}
                    onChange={(e) => setHasHeaders(e.target.checked)}
                  />
                  <span>First row contains headers</span>
                </label>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Column Mapping</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {csvData[0]?.map((header, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Badge variant="outline" className="min-w-[120px]">
                          {hasHeaders ? header : `Column ${index + 1}`}
                        </Badge>
                        <span>→</span>
                        <Select
                          value={columnMapping[index.toString()] || ''}
                          onValueChange={(value) => 
                            setColumnMapping(prev => ({ ...prev, [index.toString()]: value }))
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Skip column</SelectItem>
                            {transactionColumns.map(col => (
                              <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4">
                    <Button onClick={generatePreview}>Generate Preview</Button>
                  </div>
                </CardContent>
              </Card>
              
              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <ul>
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              {preview.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Preview (First 5 rows)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {transactionColumns.map(col => (
                              <th key={col} className="text-left p-2">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((row, index) => (
                            <tr key={index} className="border-b">
                              {transactionColumns.map(col => (
                                <td key={col} className="p-2">
                                  {typeof row[col] === 'boolean' ? (row[col] ? 'Yes' : 'No') : row[col]}
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
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={errors.length > 0 || preview.length === 0}
                >
                  Import {preview.length} Transactions
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
