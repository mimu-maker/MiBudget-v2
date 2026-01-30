import { useState } from 'react';

export const getDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = 'device-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
};

export const isDeviceTrusted = () => {
    return localStorage.getItem('device_trusted') === 'true';
};

export const setDeviceTrusted = (trusted: boolean) => {
    localStorage.setItem('device_trusted', trusted.toString());
};

export const getSessionTimeout = () => {
    return isDeviceTrusted() ? 24 * 24 * 60 * 1000 : 15 * 60 * 1000; // 24 days (safe max) vs 15 minutes
};

export const useDeviceTrust = () => {
    const [showDeviceTrustDialog, setShowDeviceTrustDialog] = useState(false);
    const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);

    const showDeviceTrustPrompt = (deviceId: string) => {
        setPendingDeviceId(deviceId);
        setShowDeviceTrustDialog(true);
    };

    const handleDeviceTrust = (onSuccess?: () => void) => {
        if (pendingDeviceId) {
            setDeviceTrusted(true);
            localStorage.setItem(`device_trusted_${pendingDeviceId}`, 'true');
            console.log('Device marked as trusted:', pendingDeviceId);
            setShowDeviceTrustDialog(false);
            setPendingDeviceId(null);
            if (onSuccess) onSuccess();
        }
    };

    const handleDeviceDontTrust = (onSuccess?: () => void) => {
        if (pendingDeviceId) {
            setDeviceTrusted(false);
            localStorage.setItem(`device_trusted_${pendingDeviceId}`, 'false');
            console.log('Device marked as untrusted:', pendingDeviceId);
            setShowDeviceTrustDialog(false);
            setPendingDeviceId(null);
            if (onSuccess) onSuccess();
        }
    };

    return {
        showDeviceTrustDialog,
        pendingDeviceId,
        showDeviceTrustPrompt,
        handleDeviceTrust,
        handleDeviceDontTrust,
        getDeviceId,
        isDeviceTrusted,
        getSessionTimeout
    };
};
