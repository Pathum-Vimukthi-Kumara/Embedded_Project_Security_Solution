# HTTPS Setup for Mobile Microphone Access

## ⚠️ The Problem
Mobile browsers (Android/iOS) **require HTTPS** to access the microphone for security reasons. Your VM is using HTTP, which causes the WebSocket to immediately disconnect when trying to stream audio.

## ✅ Solution: Enable HTTPS with Self-Signed Certificate

### Step 1: Generate SSL Certificate

Run this command in PowerShell:

```powershell
cd server
mkdir certs
cd certs

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=localhost"
```

**If OpenSSL is not installed:**
```powershell
# Install using Chocolatey
choco install openssl

# Or download from: https://slproweb.com/products/Win32OpenSSL.html
```

### Step 2: Verify Files Created

Check that these files exist:
- `server/certs/key.pem` (private key)
- `server/certs/cert.pem` (certificate)

### Step 3: Start Server

```powershell
npm start
```

You should see:
```
🚀 HTTPS Server running on:
   Local:   https://localhost:10443
   Network: https://192.168.8.101:10443
```

### Step 4: Access from Phone

1. **Scan WiFi QR code** → Connect to WiFi
2. **Scan URL QR code** → Opens `https://192.168.8.101:10443`
3. **Accept security warning:**
   - Android: Click "Advanced" → "Proceed to 192.168.8.101 (unsafe)"
   - iOS: Click "Details" → "Visit this website"
4. **Click "Start Streaming"** → Microphone access will work! ✅

---

## Alternative: Disable HTTPS (NOT RECOMMENDED)

If you can't use HTTPS, edit `server/config.js`:

```javascript
server: {
    https: {
        enabled: false  // ← Change to false
    }
}
```

**⚠️ Warning:** Microphone will NOT work on mobile browsers without HTTPS!

---

## Why HTTPS is Required

| Protocol | Desktop Browser | Mobile Browser | Microphone |
|----------|----------------|----------------|------------|
| HTTP     | ✅ Works       | ❌ Blocked     | ❌ No      |
| HTTPS    | ✅ Works       | ✅ Works       | ✅ Yes     |

Mobile browsers enforce HTTPS for:
- Microphone access
- Camera access
- Geolocation
- Other sensitive APIs

---

## Troubleshooting

### "WebSocket keeps disconnecting"
✅ **Fixed by HTTPS!** The WebSocket was failing because microphone permission was denied on HTTP.

### "Certificate not trusted" warning
This is normal for self-signed certificates. Click "Advanced" → "Proceed" to continue.

### "Port 10443 already in use"
Change HTTPS port in `server/config.js`:
```javascript
https: {
    port: 11443  // Use different port
}
```

### OpenSSL command fails
Make sure OpenSSL is installed. Test with:
```powershell
openssl version
```

---

## Current Configuration

Your server is configured for:
- **HTTP Port:** 10000 (won't work for mobile microphone)
- **HTTPS Port:** 10443 (required for mobile microphone)
- **WiFi Network:** Pathum
- **Server IP:** Auto-detected (192.168.8.101)

Once HTTPS is enabled, mobile streaming will work perfectly!
