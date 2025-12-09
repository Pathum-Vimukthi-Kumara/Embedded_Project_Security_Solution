// ---------------------- CONFIGURATION ----------------------
export const config = {
    // Deployment Mode
    deployment: {
        mode: process.env.DEPLOYMENT_MODE || 'local',  // 'local' or 'public'
        // 'local' = WiFi network validation (for local deployment)
        // 'public' = No network validation (for Railway/cloud)
    },
    
    // WiFi Network Configuration
    wifi: {
        ssid: "Pathum",     // ← Change to your WiFi network name
        password: "PATHUM@@123",     // ← Change to your WiFi password
        // For hidden networks
        hidden: false               // ← Set to true if WiFi is hidden
    },
    
    // Session Configuration
    session: {
        secret: "change-this-secret-key-in-production",  // IMPORTANT: Change this!
        name: "audio_stream_session",
        cookieMaxAge: 24 * 60 * 60 * 1000  // 24 hours
    },
    
    // Admin Access
    admin: {
        // Simple admin password for accessing QR code page
        password: "admin123"  // IMPORTANT: Change this!
    },
    
    // Server Configuration
    server: {
        port: process.env.PORT || 10000,
        // For cloud deployment: Will auto-detect from request
        // For local: Use your WiFi IP (e.g., "192.168.234.231")
        serverIp: process.env.SERVER_URL || null,  // Auto-detect if null
        esp32Ip: "192.168.1.25",  // Your ESP32 IP
        udpPort: 5005,
        // HTTPS Configuration (required for mobile microphone access)
        https: {
            enabled: process.env.HTTPS_ENABLED === 'true' || true,  // Enable HTTPS by default
            port: process.env.HTTPS_PORT || 8443  // HTTPS port (use 8443 to avoid admin requirement)
        }
    }
};
