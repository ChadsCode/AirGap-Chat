// Import WebLLM
import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

// Global state
let engine = null;
let isModelLoaded = false;

// DOM Elements
const elements = {
    loadModelBtn: document.getElementById('loadModelBtn'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    sendBtn: document.getElementById('sendBtn'),
    messageInput: document.getElementById('messageInput'),
    chatMessages: document.getElementById('chatMessages'),
    modelStatus: document.getElementById('modelStatus'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    progressFill: document.getElementById('progressFill'),
    progressPercent: document.getElementById('progressPercent')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkWebGPUSupport();
});

// Event Listeners
function setupEventListeners() {
    elements.loadModelBtn.addEventListener('click', loadModel);
    elements.clearChatBtn.addEventListener('click', clearChat);
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Check WebGPU Support
async function checkWebGPUSupport() {
    if (!navigator.gpu) {
        addMessage('Your browser does not support WebGPU. The model will run on CPU (slower).', 'system');
    }
}

// Load Model
async function loadModel() {
    if (isModelLoaded) {
        addMessage('Model is already loaded!', 'system');
        return;
    }

    elements.loadModelBtn.disabled = true;
    elements.loadingOverlay.style.display = 'flex';
    
    try {
        // Create engine with Phi-3 (Phi-2 not in current registry)
        engine = await CreateMLCEngine(
            "Phi-3-mini-4k-instruct-q4f16_1-MLC", // Using Phi-3 mini (MIT licensed)
            {
                initProgressCallback: (report) => {
                    updateLoadingProgress(report);
                },
                logLevel: "INFO"
            }
        );

        isModelLoaded = true;
        elements.modelStatus.textContent = 'Phi-3 Mini Loaded';
        elements.modelStatus.classList.add('loaded');
        elements.messageInput.disabled = false;
        elements.sendBtn.disabled = false;
        elements.loadModelBtn.textContent = 'Model Loaded ✓';
        
        addMessage('Microsoft Phi-3 Mini loaded successfully! MIT licensed model ready for commercial use.', 'system');
        
    } catch (error) {
        console.error('Model loading error:', error);
        addMessage(`Error loading model: ${error.message}`, 'error');
        elements.loadModelBtn.disabled = false;
    } finally {
        elements.loadingOverlay.style.display = 'none';
    }
}

// Update Loading Progress
function updateLoadingProgress(report) {
    if (report.progress !== undefined) {
        const percent = Math.round(report.progress * 100);
        elements.progressFill.style.width = percent + '%';
        elements.progressPercent.textContent = percent + '%';
    }
    
    if (report.text) {
        elements.loadingText.textContent = report.text;
    }
}

// Send Message
async function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message || !isModelLoaded) return;

    // Add user message
    addMessage(message, 'user');
    elements.messageInput.value = '';
    
    // Disable input while processing
    elements.sendBtn.disabled = true;
    elements.messageInput.disabled = true;
    
    try {
        // Show typing indicator
        const typingId = addMessage('Thinking...', 'assistant');
        
        // Generate response
        const messages = [
            { role: "system", content: "You are a helpful business AI assistant. Provide clear, concise answers." },
            { role: "user", content: message }
        ];
        
        const reply = await engine.chat.completions.create({
            messages,
            temperature: 0.7,
            max_tokens: 500
        });
        
        // Remove typing indicator and add response
        removeMessage(typingId);
        addMessage(reply.choices[0].message.content, 'assistant');
        
    } catch (error) {
        console.error('Chat error:', error);
        addMessage(`Error: ${error.message}`, 'error');
    } finally {
        elements.sendBtn.disabled = false;
        elements.messageInput.disabled = false;
        elements.messageInput.focus();
    }
}

// Add Message to Chat
function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = content;
    
    // Generate unique ID for message
    const messageId = Date.now() + Math.random();
    messageDiv.dataset.messageId = messageId;
    
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    
    return messageId;
}

// Remove Message
function removeMessage(messageId) {
    const message = document.querySelector(`[data-message-id="${messageId}"]`);
    if (message) {
        message.remove();
    }
}

// Clear Chat
function clearChat() {
    elements.chatMessages.innerHTML = '';
    addMessage('Chat cleared. Ready for new conversation.', 'system');
}

// Export for debugging
window.debugInfo = {
    engine,
    isModelLoaded: () => isModelLoaded,
    getEngineStats: () => engine?.runtimeStatsText()
};