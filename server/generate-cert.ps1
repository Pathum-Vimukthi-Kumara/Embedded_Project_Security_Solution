# PowerShell script to generate self-signed SSL certificate
# No OpenSSL required - uses built-in Windows certificate tools

$certPath = "$PSScriptRoot\certs"
$keyFile = "$certPath\key.pem"
$certFile = "$certPath\cert.pem"

# Create certs directory
if (!(Test-Path $certPath)) {
    New-Item -ItemType Directory -Path $certPath -Force | Out-Null
    Write-Host "📁 Created certs directory" -ForegroundColor Green
}

# Check if certificates already exist
if ((Test-Path $keyFile) -and (Test-Path $certFile)) {
    Write-Host "✅ SSL certificates already exist" -ForegroundColor Green
    Write-Host "   Key:  $keyFile"
    Write-Host "   Cert: $certFile"
    exit 0
}

Write-Host "🔐 Generating self-signed SSL certificate..." -ForegroundColor Yellow
Write-Host ""

try {
    # Generate self-signed certificate using .NET
    $cert = New-SelfSignedCertificate `
        -Subject "CN=localhost" `
        -DnsName "localhost", "127.0.0.1", "*.local" `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -NotBefore (Get-Date) `
        -NotAfter (Get-Date).AddYears(1) `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -FriendlyName "ESP32 Audio Stream HTTPS Certificate" `
        -HashAlgorithm SHA256 `
        -KeyUsage DigitalSignature, KeyEncipherment, DataEncipherment `
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")

    Write-Host "✅ Certificate created in Windows Certificate Store" -ForegroundColor Green

    # Export certificate to PEM format
    $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    $certPem = "-----BEGIN CERTIFICATE-----`n"
    $certPem += [System.Convert]::ToBase64String($certBytes, 'InsertLineBreaks')
    $certPem += "`n-----END CERTIFICATE-----"
    $certPem | Out-File -FilePath $certFile -Encoding ASCII

    Write-Host "✅ Certificate exported to: $certFile" -ForegroundColor Green

    # Export private key in PKCS#8 format (compatible with Node.js)
    $rsaKey = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
    
    # Export as PKCS#8
    $keyBytes = $rsaKey.ExportPkcs8PrivateKey()
    $keyPem = "-----BEGIN PRIVATE KEY-----`n"
    $keyPem += [System.Convert]::ToBase64String($keyBytes, 'InsertLineBreaks')
    $keyPem += "`n-----END PRIVATE KEY-----"
    $keyPem | Out-File -FilePath $keyFile -Encoding ASCII

    Write-Host "✅ Private key exported to: $keyFile" -ForegroundColor Green

    # Clean up certificate from store
    Remove-Item -Path "Cert:\CurrentUser\My\$($cert.Thumbprint)" -Force

    Write-Host ""
    Write-Host "🎉 SSL certificate generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: This is a self-signed certificate." -ForegroundColor Yellow
    Write-Host "   Your browser will show a security warning."
    Write-Host "   Click 'Advanced' → 'Proceed to localhost (unsafe)' to continue."
    Write-Host ""
    Write-Host "📱 On mobile:" -ForegroundColor Cyan
    Write-Host "   1. Open https://192.168.x.x:10443 (your VM IP)"
    Write-Host "   2. Click 'Advanced' or 'Details'"
    Write-Host "   3. Click 'Proceed' or 'Visit this website'"
    Write-Host "   4. Microphone access will now work!"
    Write-Host ""

} catch {
    Write-Host "❌ Error generating certificate: $_" -ForegroundColor Red
    exit 1
}
