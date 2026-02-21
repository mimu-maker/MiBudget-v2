import React, { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { X } from 'lucide-react';

export const AbortButton: React.FC = () => {
  const { currentPhase, abortOnboarding } = useOnboarding();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Only show abort button for phases 2-8 (not welcome or final review)
  if (currentPhase < 2 || currentPhase > 8) {
    return null;
  }

  const handleAbort = () => {
    abortOnboarding();
    setIsDialogOpen(false);
  };

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <X className="w-4 h-4" />
        Abort Setup
      </Button>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Abort Onboarding Setup?</AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel your current onboarding progress and return you to the data import choice. 
            Your basic preferences will be saved, but any imported data and configurations will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continue Setup</AlertDialogCancel>
          <AlertDialogAction onClick={handleAbort} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Abort Setup
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
