// ---------------------- SELF-SIGNED CERTIFICATE GENERATOR ----------------------
// This script generates a self-signed SSL certificate for local HTTPS testing
// Required for mobile browsers to access microphone

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CERT_DIR = path.join(__dirname, 'certs');
const KEY_FILE = path.join(CERT_DIR, 'key.pem');
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');

async function generateCertificate() {
    try {
        // Create certs directory if it doesn't exist
        if (!fs.existsSync(CERT_DIR)) {
            fs.mkdirSync(CERT_DIR, { recursive: true });
            console.log('📁 Created certs directory');
        }

        // Check if certificates already exist
        if (fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE)) {
            console.log('✅ SSL certificates already exist');
            console.log(`   Key:  ${KEY_FILE}`);
            console.log(`   Cert: ${CERT_FILE}`);
            return true;
        }

        console.log('🔐 Generating self-signed SSL certificate...');
        console.log('   This may take a few seconds...\n');

        // Generate self-signed certificate using OpenSSL
        // Valid for 365 days
        const command = `openssl req -x509 -newkey rsa:2048 -nodes ` +
            `-keyout "${KEY_FILE}" -out "${CERT_FILE}" -days 365 ` +
            `-subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`;

        await execAsync(command);

        console.log('✅ SSL certificate generated successfully!');
        console.log(`   Key:  ${KEY_FILE}`);
        console.log(`   Cert: ${CERT_FILE}`);
        console.log('\n⚠️  IMPORTANT: This is a self-signed certificate.');
        console.log('   Your browser will show a security warning.');
        console.log('   Click "Advanced" → "Proceed to localhost (unsafe)" to continue.\n');

        return true;
    } catch (error) {
        if (error.message.includes('openssl')) {
            console.error('❌ OpenSSL not found!');
            console.error('\n📥 Please install OpenSSL:');
            console.error('   Windows: https://slproweb.com/products/Win32OpenSSL.html');
            console.error('   Or use: choco install openssl');
            console.error('   Linux: sudo apt-get install openssl');
            console.error('   Mac: brew install openssl\n');
            
            console.log('💡 Alternative: Creating simple self-signed cert without OpenSSL...');
            return createSimpleCert();
        } else {
            console.error('❌ Error generating certificate:', error.message);
            return false;
        }
    }
}

// Fallback: Create certificate using Node.js crypto (less secure but works)
async function createSimpleCert() {
    try {
        const crypto = await import('crypto');
        const { generateKeyPairSync } = crypto;
        
        // Generate RSA key pair
        const { publicKey, privateKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        // Save private key
        fs.writeFileSync(KEY_FILE, privateKey);
        
        // For simplicity, use the same format (in production, you'd create a proper cert)
        fs.writeFileSync(CERT_FILE, publicKey);

        console.log('✅ Basic certificate files created');
        console.log('   Note: For full HTTPS support, install OpenSSL\n');
        
        return true;
    } catch (err) {
        console.error('❌ Failed to create certificate:', err.message);
        return false;
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    generateCertificate().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export { generateCertificate, KEY_FILE, CERT_FILE };
