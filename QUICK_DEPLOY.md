# Quick Deployment Solutions for Yggdrasil

## Problem: Railway 10-Minute Timeout ⏱️

Railway's free tier has a **10-minute hard limit** per request. Deep research mode can take longer.

---

## 🚀 Solution 1: Render (15-Minute Timeout) - **RECOMMENDED**

Render's free tier has a **15-minute timeout** - 50% longer than Railway!

### Quick Setup (5 minutes)

1. **Create Render Account**: https://render.com

2. **Click "New +" → "Web Service"**

3. **Connect GitHub**:
   - You'll need to push your code to GitHub first (see below)

4. **Configure Service**:
   ```
   Name: yggdrasil
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn -w 1 -b 0.0.0.0:$PORT main:app --timeout 900
   ```

5. **Add Environment Variables**:
   - `TAVILY_API_KEY`: your_key_here
   - `OLLAMA_BASE_URL`: http://localhost:11434 (or cloud Ollama)
   - `PORT`: 5000

6. **Deploy!**

**Note**: 15 minutes should be enough for most Deep mode queries. If not, see optimization tips below.

---

## 🌐 Solution 2: ngrok (Immediate, Free) - **FASTEST**

Get live in **2 minutes** with a public URL!

### Setup Steps

1. **Download ngrok**: https://ngrok.com/download

2. **Install & Auth**:
   ```bash
   # Extract and run
   ngrok config add-authtoken <your_token>
   ```

3. **Run Your App Locally**:
   ```bash
   cd x:\MSRIT\Py_project\deep-research-assistant
   venv\Scripts\activate
   python main.py
   ```

4. **Expose to Internet**:
   ```bash
   # In a NEW terminal
   ngrok http 5000
   ```

5. **Get Public URL**:
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:5000
   ```

Share that URL - it's live! ✨

**Pros**:
- ✅ No timeout limits (runs on your machine)
- ✅ Setup in 2 minutes
- ✅ Free forever

**Cons**:
- ⚠️ Requires your computer to stay on
- ⚠️ URL changes each restart (paid tier has static URLs)
- ⚠️ Not suitable for long-term production

**Perfect for**: Demos, testing, temporary access while setting up real hosting

---

## ⚡ Solution 3: Optimize App Speed

Make research faster to fit within timeouts!

### Quick Optimizations

**Create `config.py` changes**:

```python
# Reduce these only for deployed version
MAX_SEARCH_RESULTS = 7  # Instead of 10
CHUNK_SIZE = 800        # Instead of 1000
```

**Create a "timeout-safe" mode**:
Add to `frontend/templates/index.html`:

```html
<option value="express">Express (Deep quality, faster, 5-7 pages, ~6 min)</option>
```

Modify `research_engine.py`:

```python
def express_research(self, topic: str) -> Dict:
    """Deep quality but optimized for speed"""
    original_max = self.max_queries
    self.max_queries = 6  # Instead of 8 for deep
    
    result = self.conduct_research(topic, depth="deep")
    
    self.max_queries = original_max
    return result
```

This gives you deep-quality reports in ~6 minutes instead of 10+.

---

## 🎯 Solution 4: Hybrid Deployment

**Frontend on Vercel (free, fast) + Backend on your machine (ngrok)**

### Why This Works
- Frontend loads instantly from Vercel CDN
- Backend runs locally (no timeouts!)
- Professional domain: yggdrasil.adarshsadanand.in

### Setup

1. **Split Frontend & Backend** (optional, or just configure CORS)

2. **Deploy Frontend to Vercel**:
   ```bash
   # In project directory
   vercel
   ```

3. **Run Backend Locally with ngrok**:
   ```bash
   python main.py
   ngrok http 5000
   ```

4. **Update Frontend API Endpoint**:
   Point frontend to ngrok URL

**Better**: Just use full ngrok for now, do proper hosting later.

---

## 📦 Quick GitHub Push (Required for Render)

```bash
cd x:\MSRIT\Py_project\deep-research-assistant

# Initialize Git (if not done)
git init

# Add all files
git add .

# Create .gitignore if needed
echo "venv/
__pycache__/
*.pyc
.env
outputs/
temp/
data/chromadb/" > .gitignore

# Commit
git commit -m "Yggdrasil MVP ready for deployment"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/yggdrasil-research-tool.git
git branch -M main
git push -u origin main
```

---

## 🎭 Solution 5: Free Cloud GPU (For Ollama)

If Ollama is the bottleneck, use free GPU hosting:

### Vast.ai ($0.10/hour - ~$3/month for occasional use)
1. Sign up: https://vast.ai
2. Search for cheapest GPU instance
3. Run Ollama in Docker on that instance
4. Set `OLLAMA_BASE_URL` to instance URL

### Google Colab (Free with limits)
1. Run Ollama in Colab notebook
2. Use ngrok to expose Ollama API
3. Point your app to Colab's ngrok URL

---

## 🏆 My Recommendation for You

### **For Immediate Demo** (Today):
→ **Use ngrok** (Solution 2)
- 2-minute setup
- No limits
- Perfect for showing off your project

### **For Production** (This weekend):
→ **Use Render** (Solution 1) 
- 15-minute timeout (enough for most queries)
- Professional deployment
- Connect custom domain
- If timeout issues persist, add "Express" mode (Solution 3)

---

## 🚨 Emergency: Deep Mode Times Out Even on Render

If 15 minutes still isn't enough:

### Option A: Async Processing
Modify app to:
1. Accept research request
2. Return immediately with job ID
3. Process in background
4. User polls for completion
5. Download when ready

### Option B: Use OpenAI Instead of Ollama
Ollama on CPU is slow. OpenAI is fast.

**Quick switch**:
Modify `backend/llm/ollama_client.py` to use OpenAI API:
```python
import openai

def generate(self, prompt, temperature=0.7, max_tokens=2000):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens
    )
    return response.choices[0].message.content
```

Cost: ~$0.05 per Deep research (very cheap for demos)

---

## 📝 Required File for Render: `gunicorn` Dependency

Add to `requirements.txt`:
```
gunicorn==21.2.0
```

---

## ⏱️ Estimated Timelines

| Solution | Setup Time | Live Time | Cost | Timeout Limit |
|----------|-----------|-----------|------|---------------|
| **ngrok** | 2 min | Immediate | Free | None (local) |
| **Render** | 10 min | 10 min | Free | 15 min |
| Render + Express mode | 30 min | 30 min | Free | Fits in 15 min |
| OpenAI switch | 45 min | N/A | $0.05/query | None |

---

## 🎯 Action Plan for Tonight

**Step 1**: Get live NOW with ngrok (2 minutes)
```bash
# Terminal 1
cd x:\MSRIT\Py_project\deep-research-assistant
venv\Scripts\activate
python main.py

# Terminal 2
ngrok http 5000
```

**Step 2**: Push to GitHub (10 minutes)
```bash
git init
git add .
git commit -m "Yggdrasil MVP"
# Create repo on GitHub
git remote add origin https://github.com/YOUR_USERNAME/yggdrasil-research-tool.git
git push -u origin main
```

**Step 3**: Deploy to Render (15 minutes)
- Connect GitHub repo
- Configure as shown in Solution 1
- Add environment variables
- Deploy

**Step 4**: Test & Configure Domain
- Test a Standard mode query (should complete in ~5 min)
- If works: Configure DNS for yggdrasil.adarshsadanand.in
- If times out: Add Express mode optimization

---

**You'll be live with ngrok in 2 minutes. Let me know which solution you want to pursue!**
