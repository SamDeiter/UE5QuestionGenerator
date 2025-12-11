# Firebase Environment Management

This directory contains scripts for managing multiple Firebase environments (development and production).

## Quick Start

### Switch to Development Database

```powershell
python scripts/switch_env.py dev
```

### Switch to Production Database

```powershell
python scripts/switch_env.py prod
```

### Check Current Environment

```powershell
python scripts/switch_env.py
```

---

## Environment Files

| File | Purpose | Git Tracked? |
|------|---------|--------------|
| `.env.development` | Development Firebase config (old `ue5questionssoure` database) | ❌ No (add your dev API key) |
| `.env.production` | Production Firebase config (`ue5-questions-prod` database) | ❌ No (already configured) |
| `.env.local` | **Active** environment (used by Vite) | ❌ No (auto-generated) |
| `.env.example` | Template for new environments | ✅ Yes |

---

## Setup Instructions

### 1. Configure Development Environment

Edit `.env.development` and add your **development** Gemini API key:

```env
VITE_FIREBASE_API_KEY=your-dev-api-key-here
```

The other values are already set for the old `ue5questionssoure` database.

### 2. Production Environment

`.env.production` is already configured with:

- Production Firebase project: `ue5-questions-prod`
- Production Gemini API key

### 3. Switch Environments

```powershell
# Use development database
python scripts/switch_env.py dev

# Use production database
python scripts/switch_env.py prod
```

The script will:

1. Backup your current `.env.local`
2. Copy the selected environment to `.env.local`
3. Show next steps (restart dev server, clear browser cache)

---

## How It Works

1. **Vite** reads environment variables from `.env.local` (highest priority)
2. The `switch_env.py` script copies either `.env.development` or `.env.production` to `.env.local`
3. Restart the dev server to load the new configuration
4. Hard refresh your browser to clear cached Firebase config

---

## Workflow Examples

### Working on New Features (Development)

```powershell
# Switch to dev database
python scripts/switch_env.py dev

# Restart dev server
npm run dev

# Hard refresh browser (Ctrl+Shift+R)
```

### Testing Production Setup

```powershell
# Switch to prod database
python scripts/switch_env.py prod

# Restart dev server
npm run dev

# Hard refresh browser (Ctrl+Shift+R)
```

### Before Deploying

```powershell
# Ensure production environment is active
python scripts/switch_env.py prod

# Build for production
npm run build

# Deploy
npm run deploy
```

---

## Security Notes

- ✅ **Separate API Keys**: Use different Gemini API keys for dev and prod
- ✅ **Git Ignored**: All `.env*` files (except `.env.example`) are in `.gitignore`
- ✅ **No Hardcoded Keys**: Removed all hardcoded fallback values from source code
- ⚠️ **API Key Restrictions**: Remember to add restrictions before public deployment

---

## Troubleshooting

### Browser Still Using Old Configuration

1. **Clear localStorage**:
   - Open DevTools (F12)
   - Application tab → Local Storage → `localhost:5173`
   - Click "Clear All"

2. **Hard refresh**: Ctrl+Shift+R

3. **Close browser completely** and reopen

### Environment Not Switching

1. Check that `.env.development` or `.env.production` exists
2. Verify the script ran successfully (look for ✅ message)
3. Restart the dev server
4. Check `.env.local` was created/updated

### API Key Errors

1. Verify API key in `.env.development` or `.env.production` is correct
2. Check API key restrictions in Google Cloud Console
3. Wait 2-3 minutes for API key changes to propagate

---

## Related Scripts

- `switch_env.py` - Switch between dev/prod environments
- `update_env_key.py` - Update API key in a specific `.env` file
- `check_firebase_config.py` - Verify Firebase configuration
- `check_vite_env.py` - Debug which environment variables Vite is loading
