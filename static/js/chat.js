/**
 * Chat Manager
 * Handles real-time chat functionality using Socket.IO and encryption
 */

//This is the new Chat class from the edited code.  The original ChatManager is no longer needed.
class Chat {
    constructor(socket, userId, recipientId) {
        this.socket = socket;
        this.userId = userId;
        this.recipientId = recipientId;
        this.privateKey = localStorage.getItem('privateKey');

        this.setupSocketHandlers();
        this.loadMessages();
    }

    async sendMessage(text) {
        try {
            // Send message to backend for encryption
            const response = await fetch('/encryption/encrypt-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: text,
                    recipient_id: this.recipientId
                })
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to encrypt message');
            }

            // Send encrypted message via socket
            this.socket.emit('send_message', {
                recipient_id: this.recipientId,
                encrypted_message: data.encrypted_message,
                encrypted_aes_key: data.encrypted_aes_key
            });

        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message. Please try again.');
        }
    }

    async decryptMessage(encryptedMessage, encryptedAesKey) {
        try {
            const response = await fetch('/encryption/decrypt-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    encrypted_message: encryptedMessage,
                    encrypted_aes_key: encryptedAesKey,
                    private_key: this.privateKey
                })
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to decrypt message');
            }

            return data.decrypted_message;
        } catch (error) {
            console.error('Failed to decrypt message:', error);
            return 'Failed to decrypt message';
        }
    }

    setupSocketHandlers() {
        this.socket.on('new_message', async (message) => {
            const decryptedMessage = await this.decryptMessage(
                message.encrypted_message,
                message.encrypted_aes_key
            );
            this.displayMessage(decryptedMessage, message.sender_id === this.userId);
        });
    }

    displayMessage(text, isOwnMessage) {
        const messagesContainer = document.getElementById('messages-list');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwnMessage ? 'own-message' : 'other-message'}`;
        messageDiv.textContent = text;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async loadMessages() {
        try {
            const response = await fetch(`/api/messages/${this.recipientId}`);
            const data = await response.json();

            for (const message of data.messages) {
                const decryptedMessage = await this.decryptMessage(
                    message.encrypted_message,
                    message.encrypted_aes_key
                );
                this.displayMessage(decryptedMessage, message.sender_id === this.userId);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }
}

// Initialize chat when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const userId = document.getElementById('user-id').value;
    const recipientId = document.getElementById('recipient-id').value;
    const socket = io();

    const chat = new Chat(socket, userId, recipientId);

    document.getElementById('message-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('message-text');
        const message = input.value.trim();
        if (message) {
            chat.sendMessage(message);
            input.value = '';
        }
    });
});