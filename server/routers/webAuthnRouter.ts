import express from 'express';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { adminDb } from '../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const router = express.Router();

// Mock store for challenges (since these are short-lived, memory is okay for this scope)
const userChallenges: Record<string, string> = {}; 

router.post('/register/options', async (req, res) => {
  const { userId } = req.body;
  const rpID = req.hostname;
  
  try {
    const options = await generateRegistrationOptions({
      rpName: 'AI Secure Space',
      rpID,
      userID: new Uint8Array(Buffer.from(userId)),
      userName: userId,
      attestationType: 'none',
    });
    
    userChallenges[userId] = options.challenge;
    res.json(options);
  } catch (error: any) {
    console.error('Registration options error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/register/verify', async (req, res) => {
  const { userId, response } = req.body;
  const expectedChallenge = userChallenges[userId];
  const rpID = req.hostname;
  
  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: [
        `https://${req.hostname}`,
        `http://${req.hostname}`,
        `http://localhost:3000`
      ],
      expectedRPID: rpID,
    });
    
    if (verification.verified && verification.registrationInfo) {
      // 1. Database Fix: Use Firebase Admin Firestore instead of memory
      await adminDb.collection('users').doc(userId).set({
        webAuthnCredentials: FieldValue.arrayUnion(verification.registrationInfo)
      }, { merge: true });
      
      res.json({ verified: true });
    } else {
      res.status(400).json({ verified: false });
    }
  } catch (error: any) {
    console.error('Registration verify error:', error);
    res.status(400).json({ verified: false, error: error.message });
  }
});

router.post('/authenticate/options', async (req, res) => {
  const { userId } = req.body;
  const rpID = req.hostname;
  
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const credentials = userDoc.data()?.webAuthnCredentials || [];
    const credential = credentials.length > 0 ? credentials[0] : null;

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credential ? [{
        id: credential.credentialID,
        transports: credential.credentialDeviceType === 'singleDevice' ? ['internal' as const] : [],
      }] : [],
    });
    
    userChallenges[userId] = options.challenge;
    res.json(options);
  } catch (error: any) {
    console.error('Auth options error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/authenticate/verify', async (req, res) => {
  const { userId, response } = req.body;
  const expectedChallenge = userChallenges[userId];
  const rpID = req.hostname;
  
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const credentials = userDoc.data()?.webAuthnCredentials || [];
  const credential = credentials.length > 0 ? credentials[0] : null;

  if (!credential) {
    return res.status(400).json({ verified: false, error: 'User not registered' });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: [
        `https://${req.hostname}`,
        `http://${req.hostname}`,
        `http://localhost:3000`
      ],
      expectedRPID: rpID,
      credential: {
        id: credential.credentialID,
        publicKey: credential.credentialPublicKey,
        counter: credential.credentialCounter,
      }
    });
    
    if (verification.verified) {
      // Note: Ideally, we should update the credentialCounter in the DB here
      res.json({ verified: true });
    } else {
      res.status(400).json({ verified: false });
    }
  } catch (error: any) {
    console.error('Auth verify error:', error);
    res.status(400).json({ verified: false, error: error.message });
  }
});

export default router;
