import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldCheck, Clock, AlertTriangle, LogOut } from 'lucide-react';

interface DeviceTrustDialogProps {
  deviceId: string;
  onTrust: () => void;
  onDontTrust: () => void;
  onLogout: () => void;
}

export const DeviceTrustDialog: React.FC<DeviceTrustDialogProps> = ({
  deviceId,
  onTrust,
  onDontTrust,
  onLogout
}) => {
  return (
    <div className="fixed inset-0 z-50 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 animate-in zoom-in-95 duration-300">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600 rounded-full shadow-lg">
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
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-sm text-gray-600 mb-1">Device ID:</div>
            <div className="font-mono text-sm bg-white px-3 py-2 rounded border text-gray-700">
              {deviceId}
            </div>
          </div>

          {/* Trust Options */}
          <div className="space-y-3">
            <div
              className="p-4 border-2 border-green-200 rounded-lg cursor-pointer hover:bg-green-50 transition-colors bg-green-50/30"
              onClick={onTrust}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-green-800">Trust this device</div>
                  <div className="text-sm text-green-600 mt-1">
                    Session expires after 45 days
                  </div>
                </div>
              </div>
            </div>

            <div
              className="p-4 border-2 border-orange-200 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors bg-orange-50/30"
              onClick={onDontTrust}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-orange-800">This login only</div>
                  <div className="text-sm text-orange-600 mt-1">
                    Session expires after 15 minutes of inactivity
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <Alert className="bg-blue-50 text-blue-800 border-blue-200">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs">
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
              This login only
            </Button>
            <Button
              onClick={onTrust}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Trust Device
            </Button>
          </div>

          {/* Logout Option */}
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              onClick={onLogout}
              className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
