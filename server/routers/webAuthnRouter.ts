import express from 'express';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';

const router = express.Router();

// Mock stores
const userChallenges: Record<string, string> = {}; 
const userCredentials: Record<string, any> = {}; 

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
      userCredentials[userId] = verification.registrationInfo;
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
  const credential = userCredentials[userId];
  
  try {
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
  const credential = userCredentials[userId];
  const rpID = req.hostname;
  
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
      // Update counter
      credential.credentialCounter = verification.authenticationInfo.newCounter;
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
