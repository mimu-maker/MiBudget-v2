import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { ProgressIndicator } from './shared/ProgressIndicator';
import { AbortButton } from './shared/AbortButton';
import { WelcomeStep } from './steps/WelcomeStep';
import { ImportChoiceStep } from './steps/ImportChoiceStep';
import { FileUploadStep } from './steps/FileUploadStep';
import { ColumnMappingStep } from './steps/ColumnMappingStep';
import { PostImportConfigStep } from './steps/PostImportConfigStep';
import { SankeyViewStep } from './steps/SankeyViewStep';
import { IncomeDiscoveryStep } from './steps/IncomeDiscoveryStep';
import { BudgetFinalizationStep } from './steps/BudgetFinalizationStep';
import { ReviewStep } from './steps/ReviewStep';

export const OnboardingFlow: React.FC = () => {
  const { currentPhase, isComplete, error } = useOnboarding();

  if (isComplete) {
    return null; // Will be handled by routing
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-6">
          <h2 className="text-2xl font-semibold text-destructive mb-4">
            Something went wrong
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  const renderCurrentStep = () => {
    switch (currentPhase) {
      case 1:
        return <WelcomeStep />;
      case 2:
        return <ImportChoiceStep />;
      case 3:
        return <FileUploadStep />;
      case 4:
        return <ColumnMappingStep />;
      case 5:
        return <PostImportConfigStep />;
      case 6:
        return <SankeyViewStep />;
      case 7:
        return <IncomeDiscoveryStep />;
      case 8:
        return <BudgetFinalizationStep />;
      case 9:
        return <ReviewStep />;
      default:
        return <WelcomeStep />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">Welcome to MiBudget</h1>
              <ProgressIndicator />
            </div>
            <AbortButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
};
