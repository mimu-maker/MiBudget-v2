import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, LogOut, Smartphone } from 'lucide-react';

interface SessionConflictDialogProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export const SessionConflictDialog: React.FC<SessionConflictDialogProps> = ({
    onConfirm,
    onCancel
}) => {
    return (
        <div className="fixed inset-0 z-50 min-h-screen bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl border-0 animate-in zoom-in-95 duration-300">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="p-3 bg-amber-100 rounded-full shadow-sm">
                            <AlertCircle className="w-8 h-8 text-amber-600" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-2xl font-bold text-gray-900">
                            Session Conflict
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                            You are currently signed in on another device.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-600">
                        <p>
                            To continue here, we'll need to sign you out of the other session.
                            Only one active session is allowed at a time.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <Button
                            onClick={onConfirm}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
                        >
                            <Smartphone className="w-4 h-4 mr-2" />
                            Switch to this device
                        </Button>

                        <Button
                            variant="outline"
                            onClick={onCancel}
                            className="w-full py-6 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Cancel and sign out
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
