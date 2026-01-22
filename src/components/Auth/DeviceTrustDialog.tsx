import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';

interface DeviceTrustDialogProps {
  deviceId: string;
  onTrust: () => void;
  onDontTrust: () => void;
}

export const DeviceTrustDialog: React.FC<DeviceTrustDialogProps> = ({
  deviceId,
  onTrust,
  onDontTrust
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600 rounded-full">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Device Security
            </CardTitle>
            <CardDescription className="text-gray-600">
              Is this a trusted device for accessing MiBudget?
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Device Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Device ID:</div>
            <div className="font-mono text-sm bg-white px-3 py-2 rounded border">
              {deviceId}
            </div>
          </div>

          {/* Trust Options */}
          <div className="space-y-3">
            <div 
              className="p-4 border-2 border-green-200 rounded-lg cursor-pointer hover:bg-green-50 transition-colors"
              onClick={onTrust}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-green-800">Trusted Device</div>
                  <div className="text-sm text-green-600 mt-1">
                    Session expires after 45 days
                  </div>
                  <div className="text-xs text-green-500 mt-2">
                    Recommended for personal computers only
                  </div>
                </div>
              </div>
            </div>

            <div 
              className="p-4 border-2 border-orange-200 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors"
              onClick={onDontTrust}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-orange-800">Untrusted Device</div>
                  <div className="text-sm text-orange-600 mt-1">
                    Session expires after 15 minutes
                  </div>
                  <div className="text-xs text-orange-500 mt-2">
                    Recommended for shared or public computers
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Only mark this device as trusted if it's your personal computer that no one else can access.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={onDontTrust}
              className="w-full"
            >
              Not Trusted
            </Button>
            <Button 
              onClick={onTrust}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Trust Device
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
