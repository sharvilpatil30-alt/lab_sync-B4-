export interface DeviceAuthSupport {
  isSupported: boolean;
  hasPlatformAuthenticator: boolean;
  authenticatorType: 'biometric-passkey' | 'fallback-passcode' | 'unsupported';
  deviceDescription: string;
}

export interface VerificationResult {
  success: boolean;
  method: 'webauthn-platform' | 'institutional-passcode' | 'demo-bypass';
  timestamp: string;
  error?: string;
}

export class DeviceVerificationService {
  // Check browser & device capabilities
  public static async checkCapability(): Promise<DeviceAuthSupport> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return {
        isSupported: false,
        hasPlatformAuthenticator: false,
        authenticatorType: 'fallback-passcode',
        deviceDescription: 'Browser does not support WebAuthn / Passkeys',
      };
    }

    try {
      const hasPlatform =
        await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

      return {
        isSupported: true,
        hasPlatformAuthenticator: hasPlatform,
        authenticatorType: hasPlatform ? 'biometric-passkey' : 'fallback-passcode',
        deviceDescription: hasPlatform
          ? 'Platform Biometric Authenticator Available (Touch ID / Face ID / Windows Hello / Android Biometric)'
          : 'Passkey capability supported; requires security key or institutional fallback',
      };
    } catch {
      return {
        isSupported: true,
        hasPlatformAuthenticator: false,
        authenticatorType: 'fallback-passcode',
        deviceDescription: 'Device security check completed with academic passcode fallback',
      };
    }
  }

  // Trigger genuine WebAuthn platform authentication
  public static async verifyWithDevice(userName: string = 'student'): Promise<VerificationResult> {
    const capability = await this.checkCapability();

    if (!capability.isSupported || !capability.hasPlatformAuthenticator) {
      return {
        success: false,
        method: 'institutional-passcode',
        timestamp: new Date().toISOString(),
        error: 'Device verification is not available on this device/browser.',
      };
    }

    // Cryptographic challenge buffer
    const challenge = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(challenge);
    }

    const userId = new Uint8Array(16);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(userId);
    }

    try {
      // Standard WebAuthn request to trigger platform biometric / Windows Hello / Touch ID
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'RIT Smart Campus Lab Sync',
            id: window.location.hostname || 'localhost',
          },
          user: {
            id: userId,
            name: `${userName}@ritindia.edu`,
            displayName: `${userName} (Student)`,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 }, // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false,
          },
          timeout: 45000,
        },
      });

      if (credential) {
        return {
          success: true,
          method: 'webauthn-platform',
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          method: 'webauthn-platform',
          timestamp: new Date().toISOString(),
          error: 'Verification was cancelled or dismissed by the user.',
        };
      }
    } catch (err: any) {
      // If the user cancelled or WebAuthn was dismissed
      const errorMsg =
        err.name === 'NotAllowedError'
          ? 'Verification was cancelled or timed out.'
          : err.name === 'SecurityError'
          ? 'Security policy blocked device verification.'
          : err.message || 'Verification failed. Please try again.';

      return {
        success: false,
        method: 'webauthn-platform',
        timestamp: new Date().toISOString(),
        error: errorMsg,
      };
    }
  }

  // Institutional fallback passcode verification (e.g. 4-digit student PIN)
  public static verifyWithInstitutionalPasscode(pin: string): VerificationResult {
    // Demo academic PIN check (any 4-digit valid PIN or standard student PIN e.g. 1234)
    if (pin.trim().length >= 4) {
      return {
        success: true,
        method: 'institutional-passcode',
        timestamp: new Date().toISOString(),
      };
    }
    return {
      success: false,
      method: 'institutional-passcode',
      timestamp: new Date().toISOString(),
      error: 'Please enter a valid 4-digit student authorization PIN.',
    };
  }
}
