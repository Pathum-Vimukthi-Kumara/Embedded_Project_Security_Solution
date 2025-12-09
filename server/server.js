// ---------------------- MODULES ----------------------
import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import dgram from "dgram";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import QRCode from "qrcode";
import helmet from "helmet";
import os from "os";
import https from "https";
import fs from "fs";
import { config } from "./config.js";

// ---------------------- PATH HELPERS ----------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------- NETWORK DETECTION ----------------------
// Auto-detect server's WiFi IP address
const getServerIP = () => {
    const interfaces = os.networkInterfaces();
    
    // Look for WiFi/Ethernet interface with private IP
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                const ip = iface.address;
                const parts = ip.split('.');
                const firstOctet = parseInt(parts[0]);
                const secondOctet = parseInt(parts[1]);
                
                // Return first private IP found (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
                if (firstOctet === 192 && secondOctet === 168) return ip;
                if (firstOctet === 10) return ip;
                if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) return ip;
            }
        }
    }
    
    return '0.0.0.0';  // Listen on all interfaces if not found
};

const SERVER_IP = getServerIP();
console.log(`🌐 Server WiFi IP detected: ${SERVER_IP}`);

// ---------------------- EXPRESS WEBSITE HOST ----------------------
const app = express();
const PORT = config.server.port;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false  // Allow inline scripts for simplicity
}));

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
const sessionMiddleware = session({
    secret: config.session.secret,
    name: config.session.name,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,  // Set to true if using HTTPS
        httpOnly: true,
        maxAge: config.session.cookieMaxAge
    }
});

app.use(sessionMiddleware);

// ---------------------- NETWORK VALIDATION ----------------------
// Check if client is on the correct WiFi network (LOCAL MODE ONLY)
const isOnCorrectNetwork = (req) => {
    // PUBLIC MODE: Allow all connections (for Railway/cloud deployment)
    if (config.deployment.mode === 'public') {
        return true;
    }
    
    // LOCAL MODE: Validate WiFi network - must be same subnet as server
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Extract IP address (remove IPv6 prefix if present)
    const ip = clientIP.replace('::ffff:', '');
    
    // If localhost, allow (for testing)
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
        return true;
    }
    
    // Check if client is on same subnet as server
    const clientParts = ip.split('.');
    const serverParts = SERVER_IP.split('.');
    
    if (clientParts.length === 4 && serverParts.length === 4) {
        // Check if first 3 octets match (same /24 subnet)
        // Example: Server 192.168.1.100, Client 192.168.1.50 → MATCH
        //          Server 192.168.1.100, Client 192.168.2.50 → NO MATCH
        const sameSubnet = (
            clientParts[0] === serverParts[0] &&
            clientParts[1] === serverParts[1] &&
            clientParts[2] === serverParts[2]
        );
        
        if (sameSubnet) {
            console.log(`✅ Client ${ip} on same subnet as server ${SERVER_IP}`);
            return true;
        }
    }
    
    console.log(`❌ Client ${ip} NOT on same subnet as server ${SERVER_IP}`);
    return false;
};

// Middleware to validate network connection
const requireNetworkAccess = (req, res, next) => {
    if (isOnCorrectNetwork(req)) {
        // Auto-authenticate if on correct network
        if (!req.session.authenticated) {
            req.session.authenticated = true;
            req.session.connectedAt = new Date().toISOString();
        }
        next();
    } else {
        res.status(403).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Access Denied</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    .container {
                        background: white;
                        padding: 40px;
                        border-radius: 10px;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                        text-align: center;
                        max-width: 500px;
                    }
                    h1 { color: #f44336; margin-bottom: 20px; }
                    p { color: #666; line-height: 1.6; }
                    .icon { font-size: 60px; margin-bottom: 20px; }
                    .instructions {
                        background: #fff3cd;
                        padding: 15px;
                        border-radius: 8px;
                        margin-top: 20px;
                        text-align: left;
                        border-left: 4px solid #ffc107;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">🚫</div>
                    <h1>Access Denied</h1>
                    <p>You must be connected to the <strong>${config.wifi.ssid}</strong> WiFi network to access this site.</p>
                    <p style="color: #999; font-size: 12px; margin-top: 10px;">Deployment Mode: ${config.deployment.mode}</p>
                    <div class="instructions">
                        <h3>How to Connect:</h3>
                        <ol>
                            <li>Scan the QR code provided</li>
                            <li>Connect to the WiFi network</li>
                            <li>Return to this page</li>
                        </ol>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
};

// ---------------------- AUTHENTICATION MIDDLEWARE ----------------------
const requireAuth = (req, res, next) => {
    if (req.session && req.session.authenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Please connect to WiFi.' });
    }
};

// ---------------------- ROUTES ----------------------

// Auto-login endpoint - authenticates based on network connection
app.post('/api/login', (req, res) => {
    // Auto-authenticate if accessing from network
    // No password required - just being on the WiFi network is enough
    req.session.authenticated = true;
    req.session.connectedAt = new Date().toISOString();
    res.json({ 
        success: true, 
        message: 'Successfully authenticated!',
        ssid: config.wifi.ssid
    });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ error: 'Logout failed' });
        } else {
            res.json({ success: true });
        }
    });
});

// Check authentication status
app.get('/api/auth-status', (req, res) => {
    res.json({ 
        authenticated: req.session && req.session.authenticated === true 
    });
});

// Admin login for QR code access
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    if (password === config.admin.password) {
        req.session.adminAuthenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ 
            success: false, 
            error: 'Invalid admin password' 
        });
    }
});

// Generate WiFi QR Code and Website URL QR Code (admin only)
app.get('/api/admin/qr-code', async (req, res) => {
    if (!req.session || !req.session.adminAuthenticated) {
        return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    try {
        // Auto-detect server URL
        // For VM deployment: Use detected WiFi IP with HTTPS
        // For cloud deployment: Use request host
        let serverUrl;
        if (SERVER_IP !== '0.0.0.0') {
            // Use auto-detected WiFi IP (VM or local network)
            if (config.server.https.enabled) {
                serverUrl = `https://${SERVER_IP}:${config.server.https.port}`;
            } else {
                serverUrl = `http://${SERVER_IP}:${PORT}`;
            }
        } else {
            // Fallback to request host (cloud deployment)
            const protocol = req.protocol || 'http';
            const host = req.get('host');
            serverUrl = `${protocol}://${host}`;
        }
        
        // WiFi QR code format (for connecting to WiFi)
        const wifiString = `WIFI:T:WPA;S:${config.wifi.ssid};P:${config.wifi.password};H:${config.wifi.hidden ? 'true' : 'false'};;`;
        
        // Generate WiFi QR Code
        const wifiQrCode = await QRCode.toDataURL(wifiString, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 400,
            margin: 2
        });
        
        // Generate Website URL QR Code (to open the site directly)
        const urlQrCode = await QRCode.toDataURL(serverUrl, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 400,
            margin: 2
        });
        
        res.json({ 
            wifiQrCode: wifiQrCode,
            urlQrCode: urlQrCode,
            ssid: config.wifi.ssid,
            password: config.wifi.password,
            url: serverUrl
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Health check for hosting providers (no auth needed)
app.get('/health', (req, res) => res.send('ok'));

// ---------------------- CAPTIVE PORTAL DETECTION ----------------------
// These endpoints are checked by phones when connecting to WiFi
// Redirecting them will auto-open the browser to our site

const getServerUrl = (req) => {
    if (SERVER_IP !== '0.0.0.0') {
        if (config.server.https.enabled) {
            return `https://${SERVER_IP}:${config.server.https.port}`;
        }
        return `http://${SERVER_IP}:${PORT}`;
    }
    const protocol = req.protocol || 'http';
    return `${protocol}://${req.get('host')}`;
};

// iOS Captive Portal Detection
app.get('/hotspot-detect.html', (req, res) => {
    res.redirect(302, getServerUrl(req));
});

// Android Captive Portal Detection (multiple endpoints)
app.get('/generate_204', (req, res) => {
    res.redirect(302, getServerUrl(req));
});

app.get('/gen_204', (req, res) => {
    res.redirect(302, getServerUrl(req));
});

// Windows Captive Portal Detection
app.get('/ncsi.txt', (req, res) => {
    res.redirect(302, getServerUrl(req));
});

app.get('/connecttest.txt', (req, res) => {
    res.redirect(302, getServerUrl(req));
});

// Generic redirect for root when no session
app.get('/redirect', (req, res) => {
    res.redirect(302, getServerUrl(req));
});

// Apply network validation to all routes except admin and health
app.use((req, res, next) => {
    // Skip network check for admin routes
    if (req.path.startsWith('/api/admin') || req.path === '/admin.html') {
        next();
    } else {
        requireNetworkAccess(req, res, next);
    }
});

// Serve your website folder statically (protected by network validation)
app.use(express.static(path.join(__dirname, "../website"))); 

// Fallback to index.html for single-page app routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../website/index.html'));
});

// ---------------------- START SERVER ----------------------
// Create HTTPS server if enabled (required for mobile microphone access)
let server;
let httpsServer;

if (config.server.https.enabled) {
    // Try to load SSL certificates
    const certPath = path.join(__dirname, 'certs', 'cert.pem');
    const keyPath = path.join(__dirname, 'certs', 'key.pem');
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const httpsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        
        // Create HTTPS server
        httpsServer = https.createServer(httpsOptions, app);
        httpsServer.listen(config.server.https.port, '0.0.0.0', () => {
            console.log(`\n🚀 HTTPS Server running on:`);
            console.log(`   Local:   https://localhost:${config.server.https.port}`);
            console.log(`   Network: https://${SERVER_IP}:${config.server.https.port}`);
            console.log(`🔐 Admin Panel: https://${SERVER_IP}:${config.server.https.port}/admin.html`);
            console.log(`📡 WebSocket ready for audio streaming (WSS)`);
            console.log(`🎯 ESP32 UDP forwarding to: ${config.server.esp32Ip}:${config.server.udpPort}`);
            console.log(`🌐 Deployment Mode: ${config.deployment.mode}`);
            console.log(`📶 WiFi Network: ${config.wifi.ssid}`);
            console.log(`\n⚠️  Browser will show security warning (self-signed certificate)`);
            console.log(`   Click "Advanced" → "Proceed" to continue\n`);
        });
        
        server = httpsServer;
    } else {
        console.error('❌ SSL certificates not found!');
        console.error(`   Expected: ${certPath} and ${keyPath}`);
        console.error(`\n📥 Run: node server/generate-cert.js`);
        console.error(`   Or set HTTPS_ENABLED=false in config\n`);
        process.exit(1);
    }
} else {
    // HTTP only (won't work for mobile microphone)
    server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 HTTP Server running on:`);
        console.log(`   Local:   http://localhost:${PORT}`);
        console.log(`   Network: http://${SERVER_IP}:${PORT}`);
        console.log(`🔐 Admin Panel: http://${SERVER_IP}:${PORT}/admin.html`);
        console.log(`⚠️  Warning: Mobile browsers require HTTPS for microphone access`);
        console.log(`   Enable HTTPS in config.js for mobile support\n`);
    });
}

// ---------------------- WEBSOCKET SERVER ----------------------
const wss = new WebSocketServer({ noServer: true });

// Upgrade HTTP connection to WebSocket with session
server.on('upgrade', (request, socket, head) => {
    sessionMiddleware(request, {}, () => {
        // Check if authenticated
        if (!request.session || !request.session.authenticated) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
        
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
});

// ---------------------- UDP SETUP ----------------------
const udp = dgram.createSocket("udp4");
const ESP32_IP = config.server.esp32Ip;
const UDP_PORT = config.server.udpPort;

// ---------------------- WS HANDLERS ----------------------
wss.on("connection", (ws, request) => {
    const clientIP = request.socket.remoteAddress;
    console.log(`✅ WebSocket connected from ${clientIP}`);

    ws.on("message", (data) => {
        // Forward audio data to ESP32
        udp.send(data, UDP_PORT, ESP32_IP);
    });
    
    ws.on("close", () => {
        console.log(`❌ WebSocket disconnected from ${clientIP}`);
    });
    
    ws.on("error", (error) => {
        console.error(`⚠️ WebSocket error from ${clientIP}:`, error.message);
    });
});
