# Yggdrasil Lite – Complete Setup Guide
## 🎯 Goal: Get your site live at adarshsadanand.in in ~15 minutes

---

## Step 1: Get Your API Keys (5 min)

### Gemini API Key (Free)
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google → Click **"Create API Key"**
3. Copy the key, save it somewhere (e.g., Notepad)

### Tavily API Key (You already have this)
- Check your `.env` file: `TAVILY_API_KEY=tvly-xxxxx`

---

## Step 2: Deploy the Cloudflare Worker (5 min)

### 2a. Create a free Cloudflare account
- Go to https://cloudflare.com → Sign up (free, no credit card)

### 2b. Install Wrangler (Cloudflare CLI)
Open PowerShell in your project folder and run:
```powershell
npm install -g wrangler
```

### 2c. Login to Cloudflare
```powershell
wrangler login
```
(This opens a browser window – click Allow)

### 2d. Deploy the Worker
```powershell
cd "x:\MSRIT\Py_project\deep-research-assistant\yggdrasil-lite\worker"
wrangler deploy
```

You'll see:
```
✅ Deployed to: https://yggdrasil-lite.YOUR_NAME.workers.dev
```
**Copy that URL!**

### 2e. Add your API keys as secrets (they stay private!)
```powershell
wrangler secret put TAVILY_API_KEY
# Paste your Tavily key when prompted

wrangler secret put GEMINI_API_KEY
# Paste your Gemini key when prompted

wrangler secret put ALLOWED_ORIGIN
# Type: https://adarshsadanand.in
```

---

## Step 3: Update the Frontend with Your Worker URL (1 min)

Open `yggdrasil-lite/static/js/app.js` and on **line 8**, replace:
```js
const WORKER_URL = "https://yggdrasil-lite.YOUR_SUBDOMAIN.workers.dev";
```
with your actual Worker URL from Step 2d, e.g.:
```js
const WORKER_URL = "https://yggdrasil-lite.adarshsadanand.workers.dev";
```
Save the file.

---

## Step 4: Push to GitHub (2 min)

In PowerShell, from your project root:
```powershell
cd "x:\MSRIT\Py_project\deep-research-assistant"
git add yggdrasil-lite/ .github/
git commit -m "Add Yggdrasil Lite - static GitHub Pages version"
git push origin main
```

GitHub Actions will automatically deploy → check the **Actions** tab in GitHub to confirm it goes green ✅

---

## Step 5: Configure Your Domain (2 min)

### In GitHub:
1. Go to your repo → **Settings** → **Pages**
2. Source: **Deploy from branch** → `gh-pages` → `/ (root)`
3. Custom domain: type `adarshsadanand.in` → Save
4. Check "Enforce HTTPS"

### In your DNS provider (where you manage adarshsadanand.in):
Add these 4 **A records**:
| Type | Name | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

And 1 **CNAME record**:
| Type | Name | Value |
|------|------|-------|
| CNAME | www | YOUR_GITHUB_USERNAME.github.io |

---

## Step 6: Test It!

After DNS propagates (usually 5–15 min):
1. Open https://adarshsadanand.in
2. Enter a research topic (e.g., "Machine Learning in Healthcare")
3. Select depth → click **Start Research**
4. Watch the progress bar → get your IEEE report!
5. Click **Download PDF** or **Download DOCX**

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Site shows old content | Wait 5 min, hard refresh (Ctrl+Shift+R) |
| "Error: Research failed" | Check Worker URL in app.js is correct |
| PDF/DOCX blank | Open browser dev tools (F12) → check Console errors |
| DNS not working | Wait up to 24h for full propagation |
| Worker error 500 | Check that you ran all 3 `wrangler secret put` commands |

---

## Architecture Summary

```
Your Browser → GitHub Pages (adarshsadanand.in)
                    ↓ (POST /api/research)
             Cloudflare Worker (free)
                    ├─→ Tavily Search API  [key hidden 🔒]
                    └─→ Gemini 1.5 Flash   [key hidden 🔒]
```

No Python. No server bill. No Ollama. Runs forever for free! 🌳
