import CryptoJS from 'crypto-js';

// SECURITY: Encryption key derived from user session
// This is client-side encryption - provides defense-in-depth but not foolproof against XSS
const getEncryptionKey = () => {
    // In production, derive this from user's Firebase UID or session token
    // For now, use a consistent key (better than plain text)
    return 'ue5-question-generator-v1-key'; // TODO: Derive from user session
};

/**
 * Encrypts data before storing in localStorage
 * @param {string} key - localStorage key
 * @param {any} data - Data to encrypt and store
 */
export const setSecureItem = (key, data) => {
    try {
        const jsonData = JSON.stringify(data);
        const encrypted = CryptoJS.AES.encrypt(jsonData, getEncryptionKey()).toString();
        localStorage.setItem(key, encrypted);
    } catch (error) {
        console.error('Failed to encrypt and store data:', error);
        // Fallback to unencrypted (backward compatibility)
        localStorage.setItem(key, JSON.stringify(data));
    }
};

/**
 * Retrieves and decrypts data from localStorage
 * @param {string} key - localStorage key
 * @returns {any} Decrypted data or null
 */
export const getSecureItem = (key) => {
    try {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;

        // Try to decrypt (new format)
        try {
            const decrypted = CryptoJS.AES.decrypt(encrypted, getEncryptionKey());
            const jsonData = decrypted.toString(CryptoJS.enc.Utf8);

            // Check if decryption actually worked (not empty string)
            if (!jsonData || jsonData.trim() === '') {
                throw new Error('Decryption returned empty string');
            }

            return JSON.parse(jsonData);
        } catch {
            // If decryption fails, try plain JSON (old format - migration)
            try {
                return JSON.parse(encrypted);
            } catch {
                // If both fail, return null
                console.warn(`Could not decrypt or parse ${key}, returning null`);
                return null;
            }
        }
    } catch (error) {
        console.error('Failed to retrieve and decrypt data:', error);
        return null;
    }
};

/**
 * Removes item from localStorage
 * @param {string} key - localStorage key
 */
export const removeSecureItem = (key) => {
    localStorage.removeItem(key);
};

/**
 * Checks if encrypted item exists
 * @param {string} key - localStorage key
 * @returns {boolean}
 */
export const hasSecureItem = (key) => {
    return localStorage.getItem(key) !== null;
};

/**
 * Migrates existing plain-text localStorage to encrypted format
 * @param {string} key - localStorage key
 */
export const migrateToSecure = (key) => {
    try {
        const existing = localStorage.getItem(key);
        if (!existing) return;

        // Try to parse as JSON (plain text)
        try {
            const data = JSON.parse(existing);
            // Re-save as encrypted
            setSecureItem(key, data);
            console.log(`[Security] Migrated ${key} to encrypted storage`);
        } catch {
            // Already encrypted or invalid, skip
        }
    } catch (error) {
        console.error('Migration failed:', error);
    }
};

export default {
    setSecureItem,
    getSecureItem,
    removeSecureItem,
    hasSecureItem,
    migrateToSecure
};
