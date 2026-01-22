import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';

export const ProgressIndicator: React.FC = () => {
  const { currentPhase, getPhaseProgress } = useOnboarding();

  const phases = [
    { number: 1, name: 'Welcome', description: 'Set up your preferences' },
    { number: 2, name: 'Import', description: 'Choose data source' },
    { number: 3, name: 'Upload', description: 'Import your data' },
    { number: 4, name: 'Mapping', description: 'Match your columns' },
    { number: 5, name: 'Configure', description: 'Set up categories' },
    { number: 6, name: 'Visualize', description: 'Review your data' },
    { number: 7, name: 'Income', description: 'Identify income streams' },
    { number: 8, name: 'Budgets', description: 'Create budgets' },
    { number: 9, name: 'Review', description: 'Complete setup' }
  ];

  return (
    <Card className="w-full max-w-2xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Setup Progress</span>
          <span className="text-sm text-muted-foreground">
            {Math.round(getPhaseProgress())}% Complete
          </span>
        </div>
        
        <div className="w-full bg-secondary rounded-full h-2 mb-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${getPhaseProgress()}%` }}
          />
        </div>

        <div className="grid grid-cols-9 gap-1">
          {phases.map((phase) => {
            const isActive = phase.number === currentPhase;
            const isCompleted = phase.number < currentPhase;
            
            return (
              <div
                key={phase.number}
                className="relative group"
              >
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200
                    ${isCompleted 
                      ? 'bg-primary text-primary-foreground' 
                      : isActive 
                        ? 'bg-primary/20 text-primary border-2 border-primary' 
                        : 'bg-muted text-muted-foreground'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    phase.number
                  )}
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  <div className="font-medium">{phase.name}</div>
                  <div className="text-muted-foreground">{phase.description}</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover"></div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
