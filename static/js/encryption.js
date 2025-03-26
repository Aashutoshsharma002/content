/**
 * Encryption Service
 * Provides utilities for RSA/AES encryption and key management
 */
class EncryptionService {
    constructor() {
        // This will indicate if the service is ready
        this.ready = false;
        this.privateKey = null;
        this.publicKey = null;
    }

    /**
     * Initialize the encryption service
     */
    async initialize() {
        try {
            // Try to load existing private key from localStorage
            const storedPrivateKey = localStorage.getItem('privateKey');
            
            if (storedPrivateKey) {
                this.privateKey = await this.importRsaPrivateKey(storedPrivateKey);
                this.publicKey = await this.extractPublicKeyFromPrivate(this.privateKey);
                this.ready = true;
            }
            
            return this.ready;
        } catch (error) {
            console.error('Failed to initialize encryption service:', error);
            return false;
        }
    }

    /**
     * Generate RSA key pair and store the private key in localStorage
     */
    async generateAndStoreKeys() {
        try {
            // Use server-side key generation endpoint
            const response = await fetch('/encryption/generate-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error('Failed to generate keys on server');
            }
            
            // Store private key in localStorage
            localStorage.setItem('privateKey', data.privateKey);
            
            // Import keys into CryptoKey objects
            this.privateKey = await this.importRsaPrivateKey(data.privateKey);
            this.publicKey = await this.importRsaPublicKey(data.publicKey);
            this.ready = true;
            
            return true;
        } catch (error) {
            console.error('Failed to generate and store keys:', error);
            throw error;
        }
    }

    /**
     * Import RSA private key from base64 string
     */
    async importRsaPrivateKey(privateKeyString) {
        try {
            const privateKeyBuffer = this._base64ToArrayBuffer(privateKeyString);
            return await window.crypto.subtle.importKey(
                "pkcs8",
                privateKeyBuffer,
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256",
                },
                true,
                ["decrypt"]
            );
        } catch (error) {
            console.error('Failed to import RSA private key:', error);
            throw error;
        }
    }

    /**
     * Import RSA public key from base64 string
     */
    async importRsaPublicKey(publicKeyString) {
        try {
            const publicKeyBuffer = this._base64ToArrayBuffer(publicKeyString);
            return await window.crypto.subtle.importKey(
                "spki",
                publicKeyBuffer,
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256",
                },
                true,
                ["encrypt"]
            );
        } catch (error) {
            console.error('Failed to import RSA public key:', error);
            throw error;
        }
    }

    /**
     * Extract public key from private key
     */
    async extractPublicKeyFromPrivate(privateKey) {
        // This is not directly possible in Web Crypto API
        // In a real implementation, you would store both keys when generating
        // For this example, we'll need to ask the server for our public key
        try {
            const userId = this._getCurrentUserId();
            const response = await fetch(`/encryption/get-public-key/${userId}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch public key');
            }
            
            return await this.importRsaPublicKey(data.publicKey);
        } catch (error) {
            console.error('Failed to extract public key:', error);
            throw error;
        }
    }

    /**
     * Generate a random AES key
     */
    async generateAesKey() {
        return await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256,
            },
            true,
            ["encrypt", "decrypt"]
        );
    }

    /**
     * Encrypt a message for a recipient
     */
    async encryptMessage(message, recipientId) {
        try {
            // Use server-side encryption endpoint
            const response = await fetch('/encryption/encrypt-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    recipient_id: recipientId
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to encrypt message');
            }
            
            // Return the encrypted message and AES key
            return {
                encryptedMessage: data.encryptedMessage,
                encryptedAesKey: data.encryptedAesKey
            };
        } catch (error) {
            console.error('Failed to encrypt message:', error);
            throw error;
        }
    }

    /**
     * Decrypt a message
     */
    async decryptMessage(encryptedMessageString, encryptedAesKeyString) {
        try {
            if (!localStorage.getItem('privateKey')) {
                throw new Error("Private key not available");
            }
            
            // Use server-side decryption endpoint
            const response = await fetch('/encryption/decrypt-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    encryptedMessage: encryptedMessageString,
                    encryptedAesKey: encryptedAesKeyString,
                    privateKey: localStorage.getItem('privateKey')
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to decrypt message');
            }
            
            return data.decryptedMessage;
        } catch (error) {
            console.error('Failed to decrypt message:', error);
            return `[Decryption failed: ${error.message}]`;
        }
    }

    // Helper methods
    _arrayBufferToBase64(buffer) {
        const binary = String.fromCharCode.apply(null, new Uint8Array(buffer));
        return btoa(binary);
    }

    _base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    _getCurrentUserId() {
        // Helper to get the current user ID from the page
        const userIdElement = document.getElementById('current-user-id');
        return userIdElement ? userIdElement.textContent : null;
    }
}
