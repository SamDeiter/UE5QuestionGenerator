# Simple Firebase Functions Deployment
# Run this after logging in with: firebase login

Write-Host "🚀 Deploying Firebase Cloud Functions..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Set API key (you'll need to enter it)
Write-Host "Step 1: Setting Gemini API Key" -ForegroundColor Yellow
Write-Host "Please enter your Gemini API key when prompted:" -ForegroundColor White
Write-Host ""

# Use firebase command directly (safer than PowerShell string handling)
firebase functions:config:set gemini.api_key="YOUR_API_KEY_HERE"

Write-Host ""
Write-Host "⚠️  IMPORTANT: Replace YOUR_API_KEY_HERE above with your actual API key" -ForegroundColor Red
Write-Host "Or run this command manually:" -ForegroundColor Yellow
Write-Host '  firebase functions:config:set gemini.api_key="your-actual-key"' -ForegroundColor White
Write-Host ""

# Step 2: Deploy
Write-Host "Step 2: Deploying functions..." -ForegroundColor Yellow
Set-Location functions
firebase deploy --only "functions"
Set-Location ..

Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green
