import CryptoJS from 'crypto-js';

// Generate encryption key from user ID + application secret
const getEncryptionKey = (userId: string): string => {
  const appSecret = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET || '';
  return CryptoJS.SHA256(userId + appSecret).toString();
};

export const encryptApiKey = (apiKey: string, userId: string): string => {
  const key = getEncryptionKey(userId);
  return CryptoJS.AES.encrypt(apiKey, key).toString();
};

export const decryptApiKey = (encryptedKey: string, userId: string): string => {
  const key = getEncryptionKey(userId);
  const bytes = CryptoJS.AES.decrypt(encryptedKey, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}; 