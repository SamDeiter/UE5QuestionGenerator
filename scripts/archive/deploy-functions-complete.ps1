# ============================================
# Complete Firebase Functions Deployment Script
# ============================================
# This script automates the entire deployment process for Firebase Cloud Functions

Write-Host ""
Write-Host "🚀 Firebase Cloud Functions - Complete Deployment" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify Firebase CLI is installed
Write-Host "Step 1: Verifying Firebase CLI..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI installed: $firebaseVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Firebase CLI not found. Installing..." -ForegroundColor Red
    npm install -g firebase-tools
}

Write-Host ""

# Step 2: Verify we're in the correct project
Write-Host "Step 2: Verifying Firebase project..." -ForegroundColor Yellow
$projectInfo = firebase projects:list 2>&1
if ($projectInfo -match "UE5QuestionsSource" -or $projectInfo -match "ue5questionssoure") {
    Write-Host "✅ Connected to Firebase project" -ForegroundColor Green
}
else {
    Write-Host "⚠️  Firebase project not found. You may need to run 'firebase login' first." -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Check if GEMINI_API_KEY secret is set
Write-Host "Step 3: Checking for Gemini API Key secret..." -ForegroundColor Yellow
Write-Host "ℹ️  If this is your first deployment, you'll need to set the API key." -ForegroundColor Cyan
Write-Host ""

$setApiKey = Read-Host "Do you need to set/update the Gemini API key? (y/N)"
if ($setApiKey -eq 'y' -or $setApiKey -eq 'Y') {
    Write-Host ""
    Write-Host "Setting GEMINI_API_KEY secret..." -ForegroundColor Yellow
    Write-Host "You will be prompted to enter your Gemini API key." -ForegroundColor White
    Write-Host ""
    
    firebase functions:secrets:set GEMINI_API_KEY
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ API key set successfully" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Failed to set API key. Continuing anyway..." -ForegroundColor Red
    }
}
else {
    Write-Host "⏭️  Skipping API key setup" -ForegroundColor Gray
}

Write-Host ""

# Step 4: Install/Update dependencies
Write-Host "Step 4: Installing function dependencies..." -ForegroundColor Yellow
Set-Location functions

if (Test-Path "package.json") {
    Write-Host "Running npm install..." -ForegroundColor White
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies installed" -ForegroundColor Green
    }
    else {
        Write-Host "❌ npm install failed" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}
else {
    Write-Host "❌ package.json not found in functions directory" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..
Write-Host ""

# Step 5: Deploy functions
Write-Host "Step 5: Deploying Cloud Functions..." -ForegroundColor Yellow
Write-Host "This may take 2-3 minutes..." -ForegroundColor White
Write-Host ""

firebase deploy --only functions

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your Cloud Functions are now live:" -ForegroundColor White
    Write-Host "  • generateQuestions" -ForegroundColor Cyan
    Write-Host "  • generateCritique" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Update your React app .env file with the function URLs" -ForegroundColor White
    Write-Host "  2. Test the functions from your app" -ForegroundColor White
    Write-Host "  3. Monitor usage in Firebase Console -> Functions -> Dashboard" -ForegroundColor White
    Write-Host ""
}
else {
    Write-Host ""
    Write-Host "❌ DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  • Billing not enabled (add payment method in Firebase Console)" -ForegroundColor White
    Write-Host "  • API key not set (run: firebase functions:secrets:set GEMINI_API_KEY)" -ForegroundColor White
    Write-Host "  • Not logged in (run: firebase login)" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "🎉 Done!" -ForegroundColor Green
Write-Host ""
