import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Upload, Play, Clock } from 'lucide-react';

export const ImportChoiceStep: React.FC = () => {
  const { nextPhase, goToPhase } = useOnboarding();

  const handleImportData = () => {
    nextPhase(); // Go to File Upload step
  };

  const handleStartFresh = () => {
    // Skip import and go directly to Phase 5 (Post-Import Config)
    goToPhase(5);
  };

  const handleImportLater = () => {
    // Skip onboarding and go to main app with import option available
    goToPhase(9); // Jump to review step
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Do you have data to import?</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          You can import existing financial data now, start fresh, or import later from the main app.
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Import Data Option */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Import Data</CardTitle>
            <CardDescription>
              Upload your existing financial data from CSV, Excel, or bank files
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button 
              onClick={handleImportData}
              className="w-full"
              size="lg"
            >
              Import Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Start Fresh Option */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-green-100 rounded-full w-fit">
              <Play className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>Start Fresh</CardTitle>
            <CardDescription>
              Begin with a clean slate and set up your budget structure
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button 
              onClick={handleStartFresh}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Start Fresh
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Import Later Option */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-blue-100 rounded-full w-fit">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>Import Later</CardTitle>
            <CardDescription>
              Skip setup for now and import data when you're ready
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button 
              onClick={handleImportLater}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Skip for Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong>Import Now:</strong> Upload CSV, Excel (.xlsx), QFX, or OFX files with your transaction history
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong>Start Fresh:</strong> Set up categories, budgets, and accounts manually
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong>Import Later:</strong> Access import tools anytime from the Transactions page
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supported Formats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Supported File Formats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                <span className="text-green-600 font-bold text-xs">CSV</span>
              </div>
              <span>Comma Separated Values</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xs">XLSX</span>
              </div>
              <span>Excel Spreadsheet</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                <span className="text-purple-600 font-bold text-xs">QFX</span>
              </div>
              <span>Quicken Financial Exchange</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                <span className="text-orange-600 font-bold text-xs">OFX</span>
              </div>
              <span>Open Financial Exchange</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
