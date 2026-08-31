import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { savePendingCredential } from './offlineStorage';

export const registerWebAuthn = async (userId: string) => {
  const optionsResponse = await fetch('/api/v1/webauthn/register/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const options = await optionsResponse.json();
  if (options.error) {
    throw new Error(options.error);
  }
  const registrationResponse = await startRegistration(options);
  
  try {
    const verifyResponse = await fetch('/api/v1/webauthn/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, response: registrationResponse }),
    });
    const result = await verifyResponse.json();
    if (result.error) {
      throw new Error(result.error);
    }
    return result.verified;
  } catch (error) {
    console.warn('[WebAuthn] Server offline or fetch failed. Saving credential locally.');
    await savePendingCredential(userId, registrationResponse);
    return true; // Optimistic success
  }
};

export const authenticateWebAuthn = async (userId: string) => {
  const optionsResponse = await fetch('/api/v1/webauthn/authenticate/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  
  if (!optionsResponse.ok) {
    const errorData = await optionsResponse.json();
    throw new Error(errorData.error || 'Authentication options failed');
  }

  const options = await optionsResponse.json();
  if (options.error) {
    throw new Error(options.error);
  }
  
  const authResponse = await startAuthentication(options);
  
  const verifyResponse = await fetch('/api/v1/webauthn/authenticate/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, response: authResponse }),
  });
  const result = await verifyResponse.json();
  if (result.error) {
    throw new Error(result.error);
  }
  return result.verified;
};
