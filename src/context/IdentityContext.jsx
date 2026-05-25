import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  loadOrCreateIdentity,
  resetIdentity as doReset,
  getPublicProfile,
  getFingerprint,
  signPayload,
  verifyPayload,
  checkTofu,
  trustKey,
  getSharedKey,
  encryptText,
  decryptText,
} from '../utils/identity';

const IdentityContext = createContext(null);

export function IdentityProvider({ children }) {
  const [identity, setIdentity] = useState(null);
  const [isReady, setIsReady]   = useState(false);
  // peerKeys: { [username]: { sigPubKey, ecdhPubKey } }
  const [peerKeys, setPeerKeys] = useState({});

  useEffect(() => {
    loadOrCreateIdentity()
      .then(id => { setIdentity(id); setIsReady(true); })
      .catch(() => { setIsReady(true); });
  }, []);

  const fingerprint   = identity ? getFingerprint(identity.sigPubHex) : '';
  const publicProfile = identity ? getPublicProfile(identity) : null;

  /**
   * Register a peer's public profile (sigPubKey + ecdhPubKey).
   * Runs TOFU check. Returns: 'new' | 'trusted' | 'conflict'.
   */
  const setPeerKey = useCallback((username, profile) => {
    if (!profile?.sigPubKey) return 'invalid';
    const status = checkTofu(username, profile.sigPubKey);
    if (status === 'new') {
      trustKey(username, profile.sigPubKey);
    }
    setPeerKeys(prev => {
      if (prev[username]?.sigPubKey === profile.sigPubKey &&
          prev[username]?.ecdhPubKey === profile.ecdhPubKey) return prev;
      return { ...prev, [username]: profile };
    });
    return status;
  }, []);

  /** Sign a payload object. Returns { sig, sigPubKey } or null on failure. */
  const sign = useCallback(async (payload) => {
    if (!identity) return null;
    try {
      const sig = await signPayload(payload, identity.sigPrivHex);
      return { sig, sigPubKey: identity.sigPubHex };
    } catch {
      return null;
    }
  }, [identity]);

  /** Verify a signed payload. Returns boolean. */
  const verify = useCallback(async (payload, sig, sigPubKey) => {
    try {
      return await verifyPayload(payload, sig, sigPubKey);
    } catch {
      return false;
    }
  }, []);

  /**
   * Encrypt plaintext for a peer using ECDH-derived AES-256-GCM key.
   * Returns { iv, ciphertext } (both base64) or null on failure.
   */
  const encrypt = useCallback(async (plaintext, peerEcdhPubB64) => {
    if (!identity || !peerEcdhPubB64) return null;
    try {
      const sharedKey = await getSharedKey(identity.ecdhPrivJwk, peerEcdhPubB64);
      return await encryptText(plaintext, sharedKey);
    } catch {
      return null;
    }
  }, [identity]);

  /**
   * Decrypt an { iv, ciphertext } payload from a peer.
   * Returns plaintext string or null on failure.
   */
  const decrypt = useCallback(async (encData, peerEcdhPubB64) => {
    if (!identity || !peerEcdhPubB64 || !encData) return null;
    try {
      const sharedKey = await getSharedKey(identity.ecdhPrivJwk, peerEcdhPubB64);
      return await decryptText(encData, sharedKey);
    } catch {
      return null;
    }
  }, [identity]);

  /** Wipe and regenerate identity. Resets all known peer keys. */
  const resetId = useCallback(async () => {
    const newId = await doReset();
    setIdentity(newId);
    setPeerKeys({});
    return newId;
  }, []);

  return (
    <IdentityContext.Provider value={{
      identity,
      isReady,
      fingerprint,
      publicProfile,
      peerKeys,
      setPeerKey,
      sign,
      verify,
      encrypt,
      decrypt,
      resetIdentity: resetId,
    }}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useIdentity must be used inside IdentityProvider');
  return ctx;
}
