# ============================================
# Simple Firebase Functions Deployment (Using Config)
# ============================================

Write-Host ""
Write-Host "🚀 Firebase Cloud Functions - Simple Deployment" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Set GEMINI_API_KEY using config (not secrets)
Write-Host "Step 1: Setting Gemini API Key via Firebase Config" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT: You'll need your Gemini API key ready." -ForegroundColor Yellow
Write-Host "Get it from: https://ai.google.dev/gemini-api/docs/api-key" -ForegroundColor Cyan
Write-Host ""

$apiKey = Read-Host "Enter your Gemini API Key" -AsSecureString
$apiKeyPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey))

if ($apiKeyPlain) {
    Write-Host "Setting API key in Firebase config..." -ForegroundColor White
    firebase functions:config:set gemini.api_key="$apiKeyPlain"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ API key configured" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Failed to set config" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "❌ No API key entered. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Update index.js to use config instead of env
Write-Host "Step 2: Ensuring functions use config..." -ForegroundColor Yellow
Write-Host "ℹ️  Your functions will access the key via functions.config().gemini.api_key" -ForegroundColor Cyan
Write-Host ""

# Step 3: Install dependencies
Write-Host "Step 3: Installing dependencies..." -ForegroundColor Yellow
Set-Location functions
npm install
Set-Location ..
Write-Host "✅ Dependencies ready" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy
Write-Host "Step 4: Deploying to Firebase..." -ForegroundColor Yellow
Write-Host "This will take 2-3 minutes..." -ForegroundColor White
Write-Host ""

firebase deploy --only functions

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your functions are live! 🎉" -ForegroundColor White
    Write-Host ""
    Write-Host "Next: Update your React app to call these Cloud Functions" -ForegroundColor Yellow
    Write-Host ""
}
else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Check the errors above." -ForegroundColor Red
    Write-Host ""
    exit 1
}
