import React, { useState, useCallback } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export const FileUploadStep: React.FC = () => {
  const { setImportData, nextPhase, previousPhase } = useOnboarding();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const supportedFormats = ['.csv', '.xlsx', '.qfx', '.ofx'];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    return supportedFormats.includes(extension) && file.size <= maxFileSize;
  };

  const processFile = useCallback(async (file: File) => {
    setUploadStatus('uploading');
    setError(null);

    try {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (extension === '.csv') {
        await processCSV(file);
      } else if (extension === '.xlsx') {
        await processExcel(file);
      } else if (extension === '.qfx' || extension === '.ofx') {
        await processFinancialFile(file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setUploadStatus('error');
    }
  }, []);

  const processCSV = async (file: File) => {
    setUploadStatus('processing');
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('File appears to be empty or invalid');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const sampleData = lines.slice(1, 11).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    const importData = {
      fileName: file.name,
      totalRows: lines.length - 1,
      validRows: sampleData.length,
      columns: headers,
      sampleData,
      fileType: 'csv'
    };

    setImportData(importData);
    setUploadStatus('success');
  };

  const processExcel = async (file: File) => {
    setUploadStatus('processing');
    // For now, simulate Excel processing
    // In real implementation, use xlsx library
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const importData = {
      fileName: file.name,
      totalRows: 150, // Simulated
      validRows: 145,
      columns: ['Date', 'Description', 'Amount', 'Account', 'Category'],
      sampleData: [
        { Date: '2024-01-15', Description: 'Sample Transaction', Amount: '-25.50', Account: 'Checking', Category: 'Food' },
        { Date: '2024-01-16', Description: 'Another Transaction', Amount: '1200.00', Account: 'Checking', Category: 'Salary' }
      ],
      fileType: 'xlsx'
    };

    setImportData(importData);
    setUploadStatus('success');
  };

  const processFinancialFile = async (file: File) => {
    setUploadStatus('processing');
    // For now, simulate QFX/OFX processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const importData = {
      fileName: file.name,
      totalRows: 200, // Simulated
      validRows: 200,
      columns: ['Date', 'Description', 'Amount', 'Account', 'Type'],
      sampleData: [
        { Date: '2024-01-15', Description: 'Bank Transaction', Amount: '-45.00', Account: 'Checking', Type: 'DEBIT' },
        { Date: '2024-01-16', Description: 'Direct Deposit', Amount: '2500.00', Account: 'Checking', Type: 'CREDIT' }
      ],
      fileType: file.name.endsWith('.qfx') ? 'qfx' : 'ofx'
    };

    setImportData(importData);
    setUploadStatus('success');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setUploadedFile(file);
        processFile(file);
      } else {
        setError('Invalid file format or size. Please check the requirements.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setUploadedFile(file);
        processFile(file);
      } else {
        setError('Invalid file format or size. Please check the requirements.');
      }
    }
  };

  const handleContinue = () => {
    if (uploadStatus === 'success') {
      nextPhase();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Upload Your Financial Data</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload your transaction history and we'll help you organize it. We support CSV, Excel, and bank export files.
        </p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Choose File</CardTitle>
          <CardDescription>
            Drag and drop your file here, or click to browse. Maximum file size: {formatFileSize(maxFileSize)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${uploadStatus === 'success' ? 'border-green-500 bg-green-50' : ''}
              ${uploadStatus === 'error' ? 'border-destructive bg-destructive/5' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              onChange={handleFileSelect}
              accept=".csv,.xlsx,.qfx,.ofx"
              className="hidden"
              id="file-upload"
            />
            
            {uploadStatus === 'idle' && (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-lg font-medium">Click to upload or drag and drop</span>
                    <div className="text-sm text-muted-foreground mt-1">
                      CSV, Excel (.xlsx), QFX, or OFX files
                    </div>
                  </label>
                </div>
              </div>
            )}

            {uploadStatus === 'uploading' && (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-600 animate-pulse" />
                </div>
                <div className="text-lg font-medium">Uploading file...</div>
              </div>
            )}

            {uploadStatus === 'processing' && (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-yellow-600 animate-pulse" />
                </div>
                <div className="text-lg font-medium">Processing file...</div>
                <Progress value={75} className="w-full max-w-xs mx-auto" />
              </div>
            )}

            {uploadStatus === 'success' && uploadedFile && (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-lg font-medium">File uploaded successfully!</div>
                <div className="text-sm text-muted-foreground">{uploadedFile.name}</div>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <div className="text-lg font-medium text-destructive">Upload failed</div>
                <div className="text-sm text-muted-foreground">{error}</div>
                <Button 
                  onClick={() => setUploadStatus('idle')}
                  variant="outline"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">File Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Supported Formats</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• CSV (Comma Separated Values)</li>
                <li>• Excel (.xlsx) files</li>
                <li>• QFX (Quicken Financial Exchange)</li>
                <li>• OFX (Open Financial Exchange)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">File Guidelines</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Maximum file size: 50MB</li>
                <li>• Include headers in first row</li>
                <li>• Date, merchant, and amount columns required</li>
                <li>• Remove sensitive personal data</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={previousPhase}>
          Back
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={uploadStatus !== 'success'}
          className="flex items-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
