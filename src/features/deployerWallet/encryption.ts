import { logger } from '../../utils/logger';

const IV_LENGTH = 12; // Size of initialization vector for encryption
const NUM_DERIVATION_ITERATIONS = 250_000;

export async function encryptString(data: string, password: string, salt: string) {
  try {
    if (!data || !password) throw new Error('Invalid arguments for encryption');
    if (!crypto || !crypto.subtle) throw new Error('Crypto libs not available');

    const keyMaterial = await getKeyMaterialFromPassword(password);
    const encryptionKey = await deriveKeyFromKeyMaterial(keyMaterial, salt);
    const ciphertext = await encrypt(encryptionKey, data);
    return ciphertext;
  } catch {
    // Excluding error message in case it contains sensitive data
    logger.error('Error encrypting data', '~~redacted~~');
    throw new Error('Cannot encrypt data');
  }
}

export async function decryptString(ciphertext: string, password: string, salt: string) {
  try {
    if (!ciphertext || !password) throw new Error('Invalid arguments for decryption');

    const keyMaterial = await getKeyMaterialFromPassword(password);
    const encryptionKey = await deriveKeyFromKeyMaterial(keyMaterial, salt);
    const data = await decrypt(encryptionKey, ciphertext);
    return data;
  } catch {
    // Excluding error message in case it contains sensitive data
    logger.error('Error decrypting data', '~~redacted~~');
    throw new Error('Cannot decrypt data');
  }
}

function encodeText(data: string) {
  const enc = new TextEncoder();
  return enc.encode(data);
}

function decodeText(data: ArrayBuffer) {
  const dec = new TextDecoder();
  return dec.decode(data);
}

function getKeyMaterialFromPassword(password: string) {
  return crypto.subtle.importKey('raw', encodeText(password), 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ]);
}

function deriveKeyFromKeyMaterial(keyMaterial: CryptoKey, salt: string) {
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encodeText(salt),
      iterations: NUM_DERIVATION_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

async function encrypt(encryptionKey: CryptoKey, data: string) {
  // Create a random initialization vector
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encryptedBuf = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    encryptionKey,
    encodeText(data),
  );
  const encryptedByteArr = new Uint8Array(encryptedBuf);

  // Now prepend IV to encrypted data
  const resultByteArr = new Uint8Array(iv.byteLength + encryptedByteArr.byteLength);
  resultByteArr.set(iv, 0);
  resultByteArr.set(encryptedByteArr, iv.byteLength);
  return Buffer.from(resultByteArr).toString('base64');
}

async function decrypt(encryptionKey: CryptoKey, base64Data: string) {
  // Create a random initialization vector
  const dataByteArr = Buffer.from(base64Data, 'base64');
  const iv = dataByteArr.slice(0, IV_LENGTH);
  const encryptedArr = dataByteArr.slice(IV_LENGTH);
  const decryptedDataBuf = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    encryptionKey,
    encryptedArr,
  );

  return decodeText(decryptedDataBuf);
}
