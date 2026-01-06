/**
 * Encryption Service for QR Code Data
 * Uses AES-256-GCM for authenticated encryption
 * 
 * SECURITY NOTE: The secret key is embedded in frontend code.
 * This protects against casual manipulation but a determined attacker
 * could extract the key from JavaScript source.
 */

// Secret key for encryption - CHANGE THIS to your own secret
// Must be exactly 32 characters for AES-256
const SECRET_KEY = 'YourSecretKey32CharactersLong!!';

/**
 * Convert string to Uint8Array
 */
const stringToBytes = (str) => new TextEncoder().encode(str);

/**
 * Convert Uint8Array to string
 */
const bytesToString = (bytes) => new TextDecoder().decode(bytes);

/**
 * Convert Uint8Array to base64
 */
const bytesToBase64 = (bytes) => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

/**
 * Convert base64 to Uint8Array
 */
const base64ToBytes = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

/**
 * Get crypto key from secret string
 */
const getCryptoKey = async (secret) => {
    const keyData = stringToBytes(secret.padEnd(32, '0').slice(0, 32));
    return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
};

/**
 * Encrypt data object to string
 * @param {Object} data - Data object to encrypt
 * @param {string} secretKey - Optional custom secret key
 * @returns {string} - Encrypted data as base64 string
 */
export const encryptData = async (data, secretKey = SECRET_KEY) => {
    try {
        const key = await getCryptoKey(secretKey);

        // Generate random IV (12 bytes for GCM)
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Convert data to JSON string then to bytes
        const dataBytes = stringToBytes(JSON.stringify(data));

        // Encrypt
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            dataBytes
        );

        // Combine IV + encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        // Return as base64
        return bytesToBase64(combined);
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Failed to encrypt data');
    }
};

/**
 * Decrypt data string to object
 * @param {string} encryptedBase64 - Encrypted base64 string
 * @param {string} secretKey - Optional custom secret key
 * @returns {Object} - Decrypted data object
 */
export const decryptData = async (encryptedBase64, secretKey = SECRET_KEY) => {
    try {
        const key = await getCryptoKey(secretKey);

        // Decode base64
        const combined = base64ToBytes(encryptedBase64);

        // Extract IV (first 12 bytes) and encrypted data
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encrypted
        );

        // Convert to string and parse JSON
        const jsonString = bytesToString(new Uint8Array(decrypted));
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Invalid or tampered data');
    }
};

/**
 * Verify if encrypted data is valid (not tampered)
 * @param {string} encryptedBase64 - Encrypted base64 string
 * @param {string} secretKey - Optional custom secret key
 * @returns {boolean} - True if valid, false if tampered
 */
export const verifyData = async (encryptedBase64, secretKey = SECRET_KEY) => {
    try {
        await decryptData(encryptedBase64, secretKey);
        return true;
    } catch {
        return false;
    }
};

export default {
    encryptData,
    decryptData,
    verifyData,
    SECRET_KEY
};
