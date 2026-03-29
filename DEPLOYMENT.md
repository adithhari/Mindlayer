# MindLayer Deployment Guide

**Goal**: Deploy FastAPI backend to Render + React frontend to Vercel

---

## Architecture Overview

```
┌─────────────────────────┐         ┌──────────────────────────┐
│  Frontend (React/Vite)  │         │  Backend (FastAPI)       │
│  Deployed on Vercel     │◄───────►│  Deployed on Render      │
└─────────────────────────┘         └──────────────────────────┘
        dist/                               main.py
     (static files)                    (API proxy server)
                                              │
                                    ┌─────────┼─────────┐
                                    │         │         │
                              Claude API  Hume AI  Deepgram
                            (all keys stay server-side)
```

---

## Prerequisites

✅ **Installed locally:**
- `./install.sh` run (all dependencies installed)
- `./start.sh` tested (backend + frontend work locally)
- All env vars set in `backend/.env`

✅ **Accounts created:**
- GitHub account (code must be pushed)
- Render.com account (create via GitHub)
- Vercel account (create via GitHub)

---

## Phase 1: Prepare Code for Deployment (5 min)

### Step 1a: Commit and push to GitHub

```bash
cd /Users/adith/Desktop/claude_hackathon/Mindlayer

# Stage all changes
git add -A

# Commit with a meaningful message
git commit -m "feat: prepare for deployment to Render + Vercel"

# Push to main branch
git push origin main
```

### Step 1b: Create `.env.example` files (for reference)

**Backend** (`backend/.env.example`)
```env
# ─────────────────────────────────────────────────────────────────
# Backend environment variables — NEVER commit to git
# Copy to .env and fill in your real API keys
# ─────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-opus-4-6
HUME_API_KEY=...
DEEPGRAM_API_KEY=...
SUPERMEMORY_API_KEY=...

# Optional: Frontend URL for CORS (set to Vercel URL after frontend deploys)
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`mindlayer-react/.env.example`)
```env
# ─────────────────────────────────────────────────────────────────
# Frontend environment variables — PUBLIC KEYS ONLY
# NO SECRET API KEYS HERE — they go in backend/.env
# ─────────────────────────────────────────────────────────────────

# Firebase configuration (public keys)
VITE_FIREBASE_API_KEY=AIzaSyAKuRVwPjtFgsDV9GM0JgDzLKpyLfGYWKc
VITE_FIREBASE_AUTH_DOMAIN=mindlayer-2d589.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mindlayer-2d589
VITE_FIREBASE_STORAGE_BUCKET=mindlayer-2d589.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=746415464314
VITE_FIREBASE_APP_ID=1:746415464314:web:f275f55241905bd5e340c3

# Backend API URL (will be set by Vercel after deployment)
VITE_API_BASE_URL=http://localhost:8000/api

# Vapi (public key only)
VITE_VAPI_PUBLIC_KEY=0bcfc142-f623-41d0-8fbd-2090aa67e909
```

---

## Phase 2: Deploy Backend to Render (10 min)

### Step 2a: Create Render Web Service

1. Go to **https://render.com/** → Sign up with GitHub
2. Click **New +** → **Web Service**
3. **Connect GitHub repository:**
   - Click "Connect Account" (authorize GitHub)
   - Select your `Mindlayer` repository
   - Click **Connect**

4. **Configure deployment:**

   | Field | Value |
   |-------|-------|
   | Name | `mindlayer-backend` |
   | Environment | Python 3 |
   | Region | Choose closest to you |
   | Branch | `main` |
   | Root Directory | `backend` |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

5. Click **Advanced** → set the following:

   **Environment Variables:**
   | Key | Value | Source |
   |-----|-------|--------|
   | `ANTHROPIC_API_KEY` | `sk-ant-...` | Copy from your `backend/.env` |
   | `CLAUDE_MODEL` | `claude-opus-4-6` | Copy from your `backend/.env` |
   | `HUME_API_KEY` | `baIloAZw...` | Copy from your `backend/.env` |
   | `DEEPGRAM_API_KEY` | `47bfa526...` | Copy from your `backend/.env` |
   | `SUPERMEMORY_API_KEY` | `sm_w6Duu...` | Copy from your `backend/.env` |
   | `FRONTEND_URL` | `http://localhost:3000` | Will update after frontend deploys |

6. Click **Create Web Service** → Render builds and deploys (⏱️ 3-5 minutes)

### Step 2b: Get your backend URL

Once deployment completes, Render displays a URL like:
```
https://mindlayer-backend-xxxxx.onrender.com
```

**Test it:**
```bash
curl https://mindlayer-backend-xxxxx.onrender.com/api/health

# Should return:
# {
#   "status": "ok",
#   "keys_configured": {
#     "anthropic": true,
#     "hume": true,
#     "deepgram": true,
#     "supermemory": true
#   }
# }
```

If any key shows `false`, check Render environment variables.

---

## Phase 3: Deploy Frontend to Vercel (10 min)

### Step 3a: Create Vercel Project

1. Go to **https://vercel.com/** → Sign up with GitHub
2. Click **Add New...** → **Project**
3. **Import Git Repository:**
   - Click "Continue with GitHub"
   - Authorize if needed
   - Select your `Mindlayer` repository
   - Click **Import**

4. **Configure project:**

   | Field | Value |
   |-------|-------|
   | Project Name | `mindlayer` |
   | Framework | Vite |
   | Root Directory | `mindlayer-react` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

5. Click **Advanced** → **Environment Variables**

### Step 3b: Add environment variables

Click **Add** for each variable:

| Key | Value | Type |
|-----|-------|------|
| `VITE_FIREBASE_API_KEY` | From your `mindlayer-react/.env.local` | Production |
| `VITE_FIREBASE_AUTH_DOMAIN` | From your `mindlayer-react/.env.local` | Production |
| `VITE_FIREBASE_PROJECT_ID` | From your `mindlayer-react/.env.local` | Production |
| `VITE_FIREBASE_STORAGE_BUCKET` | From your `mindlayer-react/.env.local` | Production |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From your `mindlayer-react/.env.local` | Production |
| `VITE_FIREBASE_APP_ID` | From your `mindlayer-react/.env.local` | Production |
| `VITE_API_BASE_URL` | `https://mindlayer-backend-xxxxx.onrender.com/api` | Production |
| `VITE_VAPI_PUBLIC_KEY` | From your `mindlayer-react/.env.local` | Production |

⚠️ **Replace `mindlayer-backend-xxxxx` with your actual Render backend URL from Step 2b**

6. Click **Deploy** → Vercel builds and deploys (⏱️ 2-3 minutes)

### Step 3c: Get your frontend URL

Once deployment completes, Vercel displays a URL like:
```
https://mindlayer.vercel.app
```

---

## Phase 4: Update Backend CORS (5 min)

Now that your frontend has a production URL, update the backend's CORS settings:

### Step 4a: Update backend CORS in code (local)

Edit `backend/main.py` and find the CORS section:

```python
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        FRONTEND_URL,  # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 4b: Update Render environment variable

1. Go to **https://render.com** → Select `mindlayer-backend`
2. Click **Environment** in the sidebar
3. Find `FRONTEND_URL` → click **Edit**
4. Change from `http://localhost:3000` to your **Vercel URL:**
   ```
   https://mindlayer.vercel.app
   ```
5. Click **Save** → Render auto-redeploys

### Step 4c: Push updated code to GitHub

```bash
git add -A
git commit -m "feat: update CORS for production"
git push origin main
```

Render auto-deploys when you push to main.

---

## Phase 5: Verification (5 min)

### Test backend health

```bash
curl https://mindlayer-backend-xxxxx.onrender.com/api/health
```

Should return all keys as `true`.

### Test frontend

1. Open **https://mindlayer.vercel.app** in browser
2. Open browser DevTools (F12) → **Network** tab
3. Perform an action (e.g., submit a brain dump)
4. Should see requests to `https://mindlayer-backend-xxxxx.onrender.com/api/*`
5. No 403/404 errors

### Check logs

**Render logs:**
- Go to Render dashboard → `mindlayer-backend` → **Logs** tab
- Look for errors

**Vercel logs:**
- Go to Vercel dashboard → `mindlayer` → **Deployments** → click latest → **View Logs**

---

## Common Issues & Fixes

### Issue: Frontend can't reach backend (404 on `/api/*`)

**Cause:** `VITE_API_BASE_URL` not set or incorrect

**Fix:**
1. Verify `VITE_API_BASE_URL` in Vercel environment
2. Check it matches your Render URL exactly
3. Redeploy Vercel: **Deployments** → **Redeploy**

### Issue: CORS error in browser console

**Cause:** `FRONTEND_URL` not set or incorrect in backend

**Fix:**
1. Verify `FRONTEND_URL` in Render environment (should be your Vercel URL)
2. Make sure `backend/main.py` includes `FRONTEND_URL` in `allow_origins`
3. Redeploy Render: **Deployments** → **Redeploy**

### Issue: Backend returns 500 on API calls

**Cause:** Missing environment variable or incorrect key

**Fix:**
1. Check Render **Logs** tab for error messages
2. Verify all env vars are set: `/api/health` shows them
3. Redeploy: push to GitHub or click **Redeploy** in Render

### Issue: "ModuleNotFoundError" in Render logs

**Cause:** Missing dependency in `requirements.txt`

**Fix:**
1. Add package: `pip install <package>`
2. Update `requirements.txt`: `pip freeze > requirements.txt`
3. Push to GitHub: `git push origin main`
4. Render auto-redeploys

### Issue: 30-second cold start on Render free tier

**Expected behavior:** First request ~30 seconds, subsequent requests <100ms

**Solution:** Upgrade to Render **Pro** ($5/mo) for instant starts

---

## Final Checklist

- [ ] GitHub repo has latest code pushed
- [ ] Render backend deployed and accessible
- [ ] Vercel frontend deployed and accessible
- [ ] All environment variables set in Render
- [ ] All environment variables set in Vercel
- [ ] Backend CORS includes frontend URL
- [ ] Frontend `VITE_API_BASE_URL` points to backend
- [ ] `/api/health` returns all keys as `true`
- [ ] Frontend loads without console errors
- [ ] Can interact with app (mood slider, brain dump, etc.)
- [ ] Network requests go to correct backend URL

---

## Your Deployment URLs

Once deployed, save these:

```
Frontend:  https://mindlayer.vercel.app
Backend:   https://mindlayer-backend-xxxxx.onrender.com
Health:    https://mindlayer-backend-xxxxx.onrender.com/api/health
```

---

## Rollback (if needed)

**Render:**
- Go to **Deployments**
- Click a previous version
- Click **Activate** → instant rollback

**Vercel:**
- Go to **Deployments**
- Click a previous version
- Click **Promote to Production** → instant rollback

---

## Cost Summary (as of March 2026)

| Service | Free Tier | Cost |
|---------|-----------|------|
| Render Backend | ✅ Included (with cold starts) | Free or $5/mo for Pro |
| Vercel Frontend | ✅ Included (unlimited) | Free |
| Firebase (DB + Auth) | ✅ Included | Free tier covers demo |
| Claude API | ❌ Pay-per-use | $60 hackathon credits |
| Hume AI | ✅ Free tier | $20 free credits/account |
| Deepgram | ✅ Free tier | $200 free credits on signup |
| Supermemory | ✅ Free tier | Free 1M tokens |

**Total for demo:** $0 (free tier) + your Claude credits

---

## Support

- **Render docs:** https://render.com/docs
- **Vercel docs:** https://vercel.com/docs
- **FastAPI docs:** https://fastapi.tiangolo.com
- **Vite + React:** https://vitejs.dev/guide
