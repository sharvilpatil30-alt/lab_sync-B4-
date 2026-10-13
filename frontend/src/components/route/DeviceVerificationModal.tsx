import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Fingerprint,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  X,
  Lock,
} from 'lucide-react';
import { Button, Input } from '../common';
import {
  DeviceVerificationService,
  DeviceAuthSupport,
  VerificationResult,
} from '../../services/deviceAuth';

interface DeviceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  destinationName: string;
}

export const DeviceVerificationModal: React.FC<DeviceVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  destinationName,
}) => {
  const [capability, setCapability] = useState<DeviceAuthSupport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackPin, setFallbackPin] = useState('');
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMessage(null);
      setFallbackPin('');
      setUseFallback(false);
      DeviceVerificationService.checkCapability().then((cap) => {
        setCapability(cap);
        if (!cap.hasPlatformAuthenticator) {
          setUseFallback(true);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeviceVerify = async () => {
    setIsLoading(true);
    setStatus('verifying');
    setErrorMessage(null);

    const result: VerificationResult = await DeviceVerificationService.verifyWithDevice('student');

    setIsLoading(false);

    if (result.success) {
      setStatus('success');
      setTimeout(() => {
        onVerified();
      }, 900);
    } else {
      setStatus('error');
      setErrorMessage(result.error || 'Device verification could not be completed.');
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = DeviceVerificationService.verifyWithInstitutionalPasscode(fallbackPin);
    if (result.success) {
      setStatus('success');
      setTimeout(() => {
        onVerified();
      }, 800);
    } else {
      setStatus('error');
      setErrorMessage(result.error || 'Invalid student authorization PIN.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F3A]/50 backdrop-blur-xs animate-in fade-in duration-200 text-left">
      <div
        className="w-full max-w-md bg-white border border-[#D9E2EC] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D9E2EC] bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center border border-[#BFDBFE]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B1F3A]">Secure Identity Verification</h3>
              <p className="text-[11px] text-[#627D98]">Institutional Device Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#627D98] hover:text-[#0B1F3A] hover:bg-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="text-center space-y-1.5">
            <h4 className="text-base font-bold text-[#0B1F3A]">Authorize Navigation Session</h4>
            <p className="text-xs text-[#627D98] leading-relaxed">
              Verify your student identity before navigating to{' '}
              <strong className="text-[#0B1F3A] font-semibold">{destinationName}</strong>.
            </p>
          </div>

          {status === 'success' ? (
            <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#15803D] flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <p className="text-xs font-bold">Identity Verified Successfully</p>
                <p className="text-[11px] text-[#15803D]/80">Starting live campus navigation route...</p>
              </div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#DC2626] flex items-center gap-2.5 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {!useFallback && capability?.hasPlatformAuthenticator ? (
                /* Primary WebAuthn Platform Device Verification */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-start gap-3">
                    <Fingerprint className="w-6 h-6 text-[#2563EB] shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-[#0B1F3A]">Device Biometric Authentication</h5>
                      <p className="text-[11px] text-[#627D98] mt-0.5 leading-relaxed">
                        Authorize with your device&apos;s security hardware (Fingerprint, Touch ID, Face ID, or Windows Hello).
                        No biometric data is ever stored by the application.
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full h-11 text-sm font-semibold shadow-sm"
                    onClick={handleDeviceVerify}
                    isLoading={isLoading}
                    loadingText="Awaiting Device Confirmation..."
                    leftIcon={<Fingerprint className="w-4 h-4" />}
                  >
                    Verify with Device
                  </Button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setUseFallback(true)}
                      className="text-xs text-[#2563EB] hover:text-[#0B1F3A] font-medium hover:underline transition-colors"
                    >
                      Use Student PIN / Fallback Passcode
                    </button>
                  </div>
                </div>
              ) : (
                /* Institutional Fallback Verification */
                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D9E2EC] text-xs text-[#627D98] space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-[#0B1F3A]">
                      <KeyRound className="w-4 h-4 text-[#2563EB]" />
                      <span>Institutional Fallback Authorization</span>
                    </div>
                    <p className="text-[11px] text-[#627D98]">
                      Device biometric authentication is unavailable or bypassed on this platform. Enter your student authorization PIN.
                    </p>
                  </div>

                  <Input
                    label="4-Digit Student Authorization PIN"
                    type="password"
                    maxLength={6}
                    placeholder="e.g. 1234"
                    value={fallbackPin}
                    onChange={(e) => setFallbackPin(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    helperText="Demo authorization: enter any 4-digit PIN (e.g. 1234)"
                    autoFocus
                    required
                  />

                  <div className="flex items-center gap-2.5 pt-1">
                    {capability?.hasPlatformAuthenticator && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setUseFallback(false)}
                        className="flex-1"
                      >
                        Device Auth
                      </Button>
                    )}
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1 h-10 text-xs font-semibold"
                    >
                      Authorize Session
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* Institutional Compliance Notice */}
          <div className="pt-3 border-t border-[#D9E2EC] flex items-center justify-between text-[10px] text-[#627D98]">
            <span className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-[#2563EB]" />
              FIDO2 / WebAuthn Compliant
            </span>
            <span>Zero Biometric Storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};
