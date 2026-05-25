/**
 * Cryptographic identity utilities
 * Pillar 1: Ed25519 signing keypair + ECDH P-256 encryption keypair
 * Pillar 5: AES-256-GCM encryption for DMs via ECDH key exchange
 */

import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

// Inject sha512 into noble/ed25519 v3.x (required for all operations)
ed.hashes.sha512 = sha512;

// ── IndexedDB store ───────────────────────────────────────────────────────────

const DB_NAME    = 'echo_identity';
const STORE_NAME = 'keys';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

async function dbPut(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function dbDelete(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Encoding helpers ──────────────────────────────────────────────────────────

export function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

export function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

export function base64ToBytes(b64) {
  return new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
}

// ── Identity lifecycle ────────────────────────────────────────────────────────

/**
 * Generate a fresh Ed25519 + ECDH P-256 identity and persist it to IndexedDB.
 */
export async function generateIdentity() {
  // Ed25519 signing keypair (v3.x uses randomSecretKey)
  const sigPriv = ed.utils.randomSecretKey();
  const sigPub  = await ed.getPublicKeyAsync(sigPriv);

  // ECDH P-256 encryption keypair via WebCrypto
  const ecdhPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  const ecdhPubRaw  = await crypto.subtle.exportKey('raw', ecdhPair.publicKey);
  const ecdhPrivJwk = await crypto.subtle.exportKey('jwk', ecdhPair.privateKey);

  const identity = {
    sigPrivHex:  bytesToHex(sigPriv),
    sigPubHex:   bytesToHex(sigPub),
    ecdhPubB64:  bytesToBase64(ecdhPubRaw),
    ecdhPrivJwk,
  };

  await dbPut('identity', identity);
  return identity;
}

export async function loadIdentity() {
  return dbGet('identity');
}

export async function loadOrCreateIdentity() {
  const existing = await loadIdentity();
  if (existing) return existing;
  return generateIdentity();
}

/**
 * Wipe existing identity and generate a new one.
 * Also clears the TOFU store.
 */
export async function resetIdentity() {
  await dbDelete('identity');
  localStorage.removeItem('echo_tofu');
  return generateIdentity();
}

// ── Public profile ────────────────────────────────────────────────────────────

/** Returns the fields that are safe to broadcast to other peers. */
export function getPublicProfile(identity) {
  return {
    sigPubKey:  identity.sigPubHex,
    ecdhPubKey: identity.ecdhPubB64,
  };
}

/** Human-readable fingerprint: first 16 hex chars of sigPub in 4-char groups. */
export function getFingerprint(sigPubHex) {
  const chunk = (sigPubHex || '').slice(0, 16).toUpperCase();
  return chunk.match(/.{4}/g)?.join(':') ?? chunk;
}

// ── Message signing ───────────────────────────────────────────────────────────

/**
 * Sign an arbitrary payload object.
 * The payload should NOT include `sig` or `sigPubKey` fields.
 */
export async function signPayload(payload, sigPrivHex) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const sig   = await ed.signAsync(bytes, hexToBytes(sigPrivHex));
  return bytesToHex(sig);
}

/**
 * Verify a signed payload.
 * Returns true if the signature is valid.
 */
export async function verifyPayload(payload, sigHex, sigPubHex) {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    return await ed.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(sigPubHex));
  } catch {
    return false;
  }
}

// ── TOFU (Trust On First Use) ─────────────────────────────────────────────────

export function loadTofuStore() {
  try { return JSON.parse(localStorage.getItem('echo_tofu') || '{}'); }
  catch { return {}; }
}

export function saveTofuStore(store) {
  try { localStorage.setItem('echo_tofu', JSON.stringify(store)); } catch {}
}

/** Returns 'new' | 'trusted' | 'conflict' */
export function checkTofu(username, sigPubHex) {
  const store = loadTofuStore();
  const known = store[username];
  if (!known)              return 'new';
  if (known === sigPubHex) return 'trusted';
  return 'conflict';
}

export function trustKey(username, sigPubHex) {
  const store = loadTofuStore();
  store[username] = sigPubHex;
  saveTofuStore(store);
}

// ── E2E Encryption (ECDH P-256 + AES-256-GCM) ────────────────────────────────

const sharedKeyCache = new Map();

async function importPeerEcdhPub(b64) {
  return crypto.subtle.importKey(
    'raw',
    base64ToBytes(b64),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
}

async function importMyEcdhPriv(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Derive (or load from cache) the AES-256-GCM shared key for a peer.
 * ECDH is symmetric: the same key results whether called from either side.
 */
export async function getSharedKey(myEcdhPrivJwk, peerEcdhPubB64) {
  if (sharedKeyCache.has(peerEcdhPubB64)) return sharedKeyCache.get(peerEcdhPubB64);

  const myPriv    = await importMyEcdhPriv(myEcdhPrivJwk);
  const peerPub   = await importPeerEcdhPub(peerEcdhPubB64);
  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPub },
    myPriv,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  sharedKeyCache.set(peerEcdhPubB64, sharedKey);
  return sharedKey;
}

export async function encryptText(plaintext, sharedKey) {
  const iv        = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    new TextEncoder().encode(plaintext)
  );
  return {
    iv:         bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptText({ iv, ciphertext }, sharedKey) {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    sharedKey,
    base64ToBytes(ciphertext)
  );
  return new TextDecoder().decode(plain);
}

// ── Identity backup / restore ─────────────────────────────────────────────────

export async function exportIdentityBackup(identity, passphrase) {
  const km   = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(identity))
  );
  return JSON.stringify({
    salt: bytesToBase64(salt),
    iv:   bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(enc)),
  });
}

export async function importIdentityBackup(json, passphrase) {
  const { salt, iv, data } = JSON.parse(json);
  const km  = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: base64ToBytes(salt), iterations: 200_000, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const dec      = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(iv) }, key, base64ToBytes(data));
  const identity = JSON.parse(new TextDecoder().decode(dec));
  await dbPut('identity', identity);
  return identity;
}

// ── Stable MQTT client ID ─────────────────────────────────────────────────────

/**
 * Returns a stable, random client ID for MQTT persistent sessions.
 * Stored in localStorage so it survives page reloads.
 */
export function getStableClientId() {
  let id = localStorage.getItem('echo_cid');
  if (!id) {
    id = `echo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('echo_cid', id);
  }
  return id;
}
