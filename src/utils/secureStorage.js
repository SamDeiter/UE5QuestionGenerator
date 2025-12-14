import CryptoJS from 'crypto-js';
import { auth } from '../services/firebase';

// SECURITY: Encryption key derived from user session
// This is client-side encryption - provides defense-in-depth but not foolproof against XSS
const getEncryptionKey = () => {
    // Priority 1: Use Firebase user UID (when authenticated)
    const currentUser = auth.currentUser;
    if (currentUser?.uid) {
        // Derive key from UID + app-specific salt
        return CryptoJS.SHA256(currentUser.uid + 'ue5-question-generator-v1').toString();
    }
    
    // Priority 2: Use stable device ID (for unauthenticated users)
    let deviceId = localStorage.getItem('ue5_device_id');
    if (!deviceId) {
        // Generate and persist a device ID
        deviceId = CryptoJS.lib.WordArray.random(16).toString();
        localStorage.setItem('ue5_device_id', deviceId);
    }
    
    // Derive key from device ID + app-specific salt
    return CryptoJS.SHA256(deviceId + 'ue5-question-generator-v1').toString();
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
