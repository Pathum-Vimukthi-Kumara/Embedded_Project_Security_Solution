# 🔐 Secure WiFi-Based Audio Streaming System

A secure embedded project that uses **WiFi network authentication** to control access to an ESP32 audio streaming web application. Only devices connected to the specific WiFi network can access the streaming interface.

## 🎯 Project Overview

This is a security-focused embedded system that:
- **Restricts access** to a specific WiFi network only
- **Prevents unauthorized access** from outside networks or the internet
- **Streams audio** from mobile/desktop microphones to ESP32 via WebSocket
- **Uses HTTPS** for secure mobile microphone access
- **Provides QR code authentication** for easy WiFi connection

## 🔒 Security Features

### Network-Based Access Control
- ✅ **WiFi-only access:** Only devices on the same WiFi network can load the website
- ✅ **Subnet validation:** Verifies client IP is on the same subnet as server
- ✅ **Auto-detection:** Automatically detects VM/server IP address
- ✅ **No password input:** Network connection IS the authentication
- ❌ **Blocks external access:** Public IPs and different networks are blocked

### HTTPS Security
- 🔐 **Self-signed SSL certificate** for local HTTPS
- 🔐 **Secure WebSocket (WSS)** for audio streaming
- 🔐 **Required for mobile microphone access** (browser security policy)

### Session Management
- 🍪 **HTTP-only cookies** prevent XSS attacks
- ⏰ **24-hour session expiration**
- 🔄 **Auto-authentication** when on correct network

## 📱 How It Works

### User Flow:
```
1. User scans WiFi QR Code
   ↓
2. Phone connects to WiFi network (e.g., "Pathum")
   ↓
3. User scans Website URL QR Code
   ↓
4. Browser opens: https://192.168.x.x:8443
   ↓
5. Server validates: Is client IP on same subnet?
   ├─ YES → Allow access ✅
   └─ NO  → Show "Access Denied" ❌
   ↓
6. User clicks "Start Streaming"
   ↓
7. Microphone streams to ESP32 via WebSocket
```

### Network Validation:
```javascript
Server IP:  192.168.8.101  (Auto-detected)
Client IP:  192.168.8.102  ✅ Same subnet → ALLOWED

Client IP:  192.168.9.50   ❌ Different subnet → BLOCKED
Client IP:  103.45.67.89   ❌ Public IP → BLOCKED
```

## 🚀 Quick Start

### Prerequisites
- Node.js v20+ installed
- WiFi network (router or hotspot)
- ESP32 device (for audio reception)
- PowerShell (Windows) for SSL certificate generation

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/Pathum-Vimukthi-Kumara/Embedded_Project_Security_Solution.git
cd Embedded_Project_Security_Solution
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure WiFi settings:**
Edit `server/config.js`:
```javascript
wifi: {
    ssid: "YourWiFiName",      // Your WiFi network name
    password: "YourPassword",   // Your WiFi password
    hidden: false
}
```

4. **Generate SSL certificate (required for mobile):**
```powershell
cd server
.\generate-cert.ps1
```

5. **Start the server:**
```bash
npm start

```

2. **Display QR codes:**
   - **QR Code #1:** WiFi connection details
   - **QR Code #2:** Website URL

3. **Share with users:**
   - Print QR codes or display on screen
   - Users scan to connect and access

### For Users (Mobile/Desktop):

1. **Scan WiFi QR Code** → Connect to WiFi
2. **Scan URL QR Code** → Opens website
3. **Accept certificate warning** (self-signed cert)
4. **Click "Start Streaming"** → Allow microphone
5. **Audio streams to ESP32** ✅

## 🛡️ Security Architecture

### Two Deployment Modes:

#### 1. **Local Mode (WiFi Validation)** - Default
- Used for: Home, office, embedded systems
- Security: Only same WiFi network can access
- Validation: Server checks client IP subnet
- Example: VM at home, ESP32 project

### Network Validation Logic:

```javascript
// Server checks client IP on every request
Client IP: 192.168.8.102
Server IP: 192.168.8.101

// Compare first 3 octets (subnet)
192.168.8.x === 192.168.8.x  ✅ ALLOW
192.168.8.x === 192.168.9.x  ❌ DENY
```

## 📡 ESP32 Integration

### UDP Audio Forwarding:
- Client microphone → WebSocket → Server → UDP → ESP32
- Protocol: PCM audio data over UDP
- ESP32 listens on: `UDP port 5005`


## 🔧 Troubleshooting

### "Access Denied" Error
**Problem:** Can't access website even on WiFi

**Solutions:**
- ✅ Verify you're connected to correct WiFi (`SSID`)
- ✅ Check server IP: Should be same subnet as your device
- ✅ Restart server and reconnect to WiFi
- ✅ Check firewall isn't blocking port 8443

### WebSocket Keeps Disconnecting
**Problem:** Connection drops repeatedly

**Solutions:**
- ✅ **Use HTTPS** (required for mobile microphone)
- ✅ Generate SSL certificate: `.\generate-cert.ps1`
- ✅ Accept certificate warning in browser
- ✅ Grant microphone permission when prompted

### Certificate Warning
**Problem:** Browser shows "Not Secure" warning

**This is normal!** Self-signed certificates trigger warnings.

**Fix:**
- Click "Advanced" or "Details"
- Click "Proceed to [IP] (unsafe)" or "Visit this website"
- Certificate is valid, just not from a trusted authority

### Can't Generate Certificate
**Problem:** `generate-cert.ps1` fails

**Solutions:**
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
cd server
.\generate-cert.ps1
```

### Mobile Microphone Not Working
**Problem:** "Permission denied" or no audio

**Requirements:**
- ✅ Must use **HTTPS** (not HTTP)
- ✅ Must accept certificate warning
- ✅ Must grant microphone permission
- ✅ Server must be running on port 8443

## 📂 Project Structure

```
voice_05_12/
├── server/
│   ├── server.js          # Main Express + WebSocket server
│   ├── config.js          # Configuration (WiFi, ports, etc.)
│   ├── generate-cert.js   # SSL cert generator (Node.js)
│   ├── generate-cert.ps1  # SSL cert generator (PowerShell)
│   ├── package.json       # Server dependencies
│   └── certs/             # SSL certificates (auto-generated)
│       ├── key.pem        # Private key
│       └── cert.pem       # Certificate
├── website/
│   ├── index.html         # Main user interface
│   ├── main.js            # Client-side logic
│   ├── PCMProcessor.js    # Audio processing worklet
│   └── admin.html         # Admin panel (QR codes)
├── package.json           # Project metadata
├── README.md             # This file
└── HTTPS_SETUP.md        # Detailed HTTPS guide
```


## 🔐 Best Practices

### Security Recommendations:
1. ✅ **Change default admin password** in `config.js`
2. ✅ **Use strong WiFi password**
3. ✅ **Keep certificates private** (don't commit to Git)
4. ✅ **Use local mode** for maximum security
5. ✅ **Regularly update dependencies:** `npm update`

### Git Ignore:
```gitignore
# Add to .gitignore
server/certs/
node_modules/
.env
```

## 📊 How It Differs from Standard Web Apps

| Feature | Standard Web App | This Project |
|---------|-----------------|--------------|
| Access Control | Username/Password | WiFi Network |
| Authentication | Login Form | Network Detection |
| Security | Database Auth | Subnet Validation |
| Mobile Access | Any Network | Same WiFi Only |
| Use Case | Internet Apps | Embedded Systems |

## 🎯 Use Cases

### Perfect For:
- 🏠 **Home automation** (only household can access)
- 🏢 **Office embedded systems** (employee WiFi only)
- 🎓 **University projects** (lab network only)
- 🔬 **IoT prototypes** (local network testing)
- 🎤 **Audio streaming** (ESP32, Raspberry Pi)

### Not Suitable For:
- ❌ Public websites (use standard authentication)
- ❌ Multi-location access (tied to single WiFi)
- ❌ Cloud-only apps (network validation won't work)

## 📚 Additional Documentation

- **[HTTPS_SETUP.md](./HTTPS_SETUP.md)** - Detailed HTTPS configuration
- **[DEPLOYMENT_MODES.md](./DEPLOYMENT_MODES.md)** - Local vs Public mode
- **[RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)** - Cloud deployment guide

## 🤝 Contributing

This is an educational embedded systems project. Feel free to:
- Report bugs via GitHub Issues
- Suggest security improvements
- Fork for your own projects
- Submit pull requests

## 📄 License

MIT License - Feel free to use for educational and personal projects.

## 👥 Authors

- **Pathum Vimukthi Kumara** - [GitHub](https://github.com/Pathum-Vimukthi-Kumara)

## 🙏 Acknowledgments

- ESP32 community for UDP audio examples
- Node.js WebSocket libraries (ws)
- Express.js framework
- Self-signed certificate generation techniques

---

## ⚡ Quick Commands Reference

```bash
# Install dependencies
npm install

# Generate SSL certificate (Windows)
cd server
.\generate-cert.ps1

# Start server
npm start

# Access admin panel
https://YOUR_IP:8443/admin.html

# Check server IP
ipconfig  # Windows
ifconfig  # Linux/Mac
```

---

**🔒 Remember:** This system is designed for **local network security**. Only devices on the same WiFi can access the streaming interface. Perfect for embedded projects where you want to restrict access without complex authentication systems!
