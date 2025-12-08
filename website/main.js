// ---------------------- STATE ----------------------
let ws;
let audioContext;
let mediaStream;
let isAuthenticated = false;

// ---------------------- DOM ELEMENTS ----------------------
const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusDiv = document.getElementById("status");

// ---------------------- UTILITY FUNCTIONS ----------------------
function updateStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status-${type}`;
    console.log(message);
}

function showLoginSection() {
    loginSection.style.display = "block";
    appSection.style.display = "none";
}

function showAppSection(ssid) {
    loginSection.style.display = "none";
    appSection.style.display = "block";
    document.getElementById("connectedWifi").textContent = `Network: ${ssid}`;
}

// ---------------------- AUTHENTICATION ----------------------
async function checkAuth() {
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();
        
        if (data.authenticated) {
            isAuthenticated = true;
            // Get session info if needed
            showAppSection('ESP32 Network');
        } else {
            showLoginSection();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginSection();
    }
}

async function login() {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        const data = await response.json();
        
        if (data.success) {
            isAuthenticated = true;
            showAppSection(data.ssid);
            updateStatus('Login successful!', 'connected');
        } else {
            updateStatus(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        updateStatus('Connection error. Are you connected to the WiFi?', 'error');
        console.error('Login error:', error);
    }
}

async function logout() {
    try {
        // Stop streaming first
        stopStreaming();
        
        const response = await fetch('/api/logout', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            isAuthenticated = false;
            showLoginSection();
            updateStatus('Logged out successfully', 'info');
        }
    } catch (error) {
        console.error('Logout error:', error);
        updateStatus('Logout error', 'error');
    }
}

// ---------------------- STREAMING FUNCTIONS ----------------------

// ---------------------- STREAMING FUNCTIONS ----------------------

startBtn.onclick = async () => {
    if (!isAuthenticated) {
        updateStatus('Please login first', 'error');
        return;
    }
    
    try {
        startBtn.disabled = true;
        updateStatus("Connecting to server...", "info");

        // Use the current host so the client works regardless of deploy URL
        const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${location.host}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            updateStatus("Connected! Starting audio...", "connected");
            startAudio();
        };

        ws.onerror = (error) => {
            updateStatus("WebSocket error occurred", "error");
            console.error("WebSocket error:", error);
            startBtn.disabled = false;
        };

        ws.onclose = () => {
            updateStatus("Disconnected from server", "error");
            stopStreaming();
        };

    } catch (error) {
        updateStatus("Error: " + error.message, "error");
        console.error(error);
        startBtn.disabled = false;
    }
};

stopBtn.onclick = () => {
    stopStreaming();
};

async function startAudio() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });

        audioContext = new AudioContext();

        await audioContext.audioWorklet.addModule("PCMProcessor.js");
        const source = audioContext.createMediaStreamSource(mediaStream);
        const processor = new AudioWorkletNode(audioContext, "pcm-processor");

        processor.port.onmessage = (event) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(event.data);
            }
        };

        source.connect(processor);
        
        updateStatus("🎤 Streaming audio to ESP32...", "connected");
        startBtn.style.display = "none";
        stopBtn.style.display = "inline-block";

    } catch (error) {
        updateStatus("Microphone access denied or error: " + error.message, "error");
        console.error(error);
        stopStreaming();
    }
}

function stopStreaming() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    
    if (ws) {
        ws.close();
        ws = null;
    }
    
    startBtn.style.display = "inline-block";
    startBtn.disabled = false;
    stopBtn.style.display = "none";
    updateStatus("Streaming stopped", "info");
}

// ---------------------- INITIALIZATION ----------------------
// Check authentication status on page load
window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Auto-login if not authenticated
    setTimeout(() => {
        if (!isAuthenticated) {
            login();
        }
    }, 500);
});
