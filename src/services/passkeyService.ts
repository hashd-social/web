/**
 * Passkey Service - WebAuthn-based app protection
 * Uses device biometrics (fingerprint, face ID, etc.) to protect app access
 */

const PASSKEY_CREDENTIAL_ID_KEY = 'hashd_passkey_credential_id';
const RP_NAME = 'Hashd';
const RP_ID = window.location.hostname;

export interface PasskeyRegistrationResult {
  success: boolean;
  credentialId?: string;
  error?: string;
}

export interface PasskeyVerificationResult {
  success: boolean;
  error?: string;
}

/**
 * Check if WebAuthn is supported in the browser
 */
export function isPasskeySupported(): boolean {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

/**
 * Check if a passkey is already registered
 */
export function hasPasskey(): boolean {
  return !!localStorage.getItem(PASSKEY_CREDENTIAL_ID_KEY);
}

/**
 * Get stored credential ID
 */
function getStoredCredentialId(): string | null {
  return localStorage.getItem(PASSKEY_CREDENTIAL_ID_KEY);
}

/**
 * Store credential ID
 */
function storeCredentialId(credentialId: string): void {
  localStorage.setItem(PASSKEY_CREDENTIAL_ID_KEY, credentialId);
}

/**
 * Remove stored credential ID
 */
export function removePasskey(): void {
  localStorage.removeItem(PASSKEY_CREDENTIAL_ID_KEY);
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Register a new passkey for the app
 */
export async function registerPasskey(userIdentifier: string): Promise<PasskeyRegistrationResult> {
  if (!isPasskeySupported()) {
    return {
      success: false,
      error: 'Passkeys are not supported in this browser'
    };
  }

  try {
    // Generate a random challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Create credential options
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: RP_NAME,
        id: RP_ID,
      },
      user: {
        id: new TextEncoder().encode(userIdentifier),
        name: userIdentifier,
        displayName: userIdentifier,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Use platform authenticator (biometrics)
        requireResidentKey: false,
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'none',
    };

    // Create the credential
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      return {
        success: false,
        error: 'Failed to create passkey'
      };
    }

    // Store the credential ID
    const credentialId = arrayBufferToBase64(credential.rawId);
    storeCredentialId(credentialId);

    console.log('✅ Passkey registered successfully');

    return {
      success: true,
      credentialId,
    };
  } catch (error: any) {
    console.error('❌ Passkey registration failed:', error);
    
    let errorMessage = 'Failed to register passkey';
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Passkey registration was cancelled';
    } else if (error.name === 'InvalidStateError') {
      errorMessage = 'A passkey already exists for this device';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Verify passkey to unlock the app
 */
export async function verifyPasskey(): Promise<PasskeyVerificationResult> {
  if (!isPasskeySupported()) {
    return {
      success: false,
      error: 'Passkeys are not supported in this browser'
    };
  }

  const storedCredentialId = getStoredCredentialId();
  if (!storedCredentialId) {
    return {
      success: false,
      error: 'No passkey registered'
    };
  }

  try {
    // Generate a random challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Create assertion options
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [{
        id: base64ToArrayBuffer(storedCredentialId),
        type: 'public-key',
        transports: ['internal'],
      }],
      timeout: 60000,
      userVerification: 'required',
      rpId: RP_ID,
    };

    // Get the credential
    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      return {
        success: false,
        error: 'Passkey verification failed'
      };
    }

    console.log('✅ Passkey verified successfully');

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('❌ Passkey verification failed:', error);
    
    let errorMessage = 'Failed to verify passkey';
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Passkey verification was cancelled';
    } else if (error.name === 'InvalidStateError') {
      errorMessage = 'Passkey not found on this device';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
