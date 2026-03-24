# Deployment Guide for Yggdrasil

## Overview

This guide covers deploying Yggdrasil to various platforms and configuring your domain (adarshsadanand.in) to point to it.

---

## Deployment Options

### Option 1: Vercel (Recommended for Beginners)

**Pros**: Easy deployment, free tier, automatic HTTPS, good for serverless  
**Cons**: Limited to serverless functions (11-second timeout)

#### Steps:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from project directory**
   ```bash
   cd x:\MSRIT\Py_project\deep-research-assistant
   vercel
   ```

4. **Follow prompts**:
   - Link to existing project? **No**
   - Project name? **yggdrasil**
   - Directory? **./  (current directory)**
   - Override settings? **No**

5. **Set environment variables** (in Vercel dashboard):
   ```
   TAVILY_API_KEY=your_key_here
   OLLAMA_BASE_URL=<ollama_cloud_url>  # Need hosted Ollama
   ```

**Note**: Vercel serverless functions have limitations. For long-running research (Deep mode), consider Railway instead.

---

### Option 2: Railway (Recommended for Full Features)

**Pros**: Supports long-running processes, Ollama can run on same platform, great free tier  
**Cons**: Slightly more complex setup

#### Steps:

1. **Create account**: https://railway.app

2. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

3. **Login**
   ```bash
   railway login
   ```

4. **Initialize project**
   ```bash
   cd x:\MSRIT\Py_project\deep-research-assistant
   railway init
   ```

5. **Set environment variables**
   ```bash
   railway variables set TAVILY_API_KEY=your_key_here
   railway variables set OLLAMA_MODEL=llama3.2
   ```

6. **Deploy**
   ```bash
   railway up
   ```

7. **Optional: Deploy Ollama separately**
   - Create new Railway service
   - Use Docker image: `ollama/ollama`
   - Set internal URL as `OLLAMA_BASE_URL`

---

### Option 3: Render

**Pros**: Good free tier, supports Python, easy setup  
**Cons**: Free tier spins down after inactivity

#### Steps:

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: yggdrasil
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
5. Add environment variables in dashboard
6. Deploy!

---

## Domain Configuration (adarshsadanand.in)

### Setting up subdomain: yggdrasil.adarshsadanand.in

#### Step 1: Get deployment URL

After deploying, you'll get a URL like:
- Vercel: `yggdrasil.vercel.app`
- Railway: `yggdrasil.up.railway.app`
- Render: `yggdrasil.onrender.com`

#### Step 2: Configure DNS

Login to your domain registrar (where you bought adarshsadanand.in) and add DNS records:

**For Vercel**:
```
Type: CNAME
Name: yggdrasil
Value: cname.vercel-dns.com
TTL: 3600
```

**For Railway**:
```
Type: CNAME
Name: yggdrasil
Value: yggdrasil.up.railway.app
TTL: 3600
```

**For Render**:
```
Type: CNAME  
Name: yggdrasil
Value: yggdrasil.onrender.com
TTL: 3600
```

#### Step 3: Configure platform for custom domain

**Vercel**:
1. Go to project settings → Domains
2. Add `yggdrasil.adarshsadanand.in`
3. Follow verification steps

**Railway**:
1. Project settings → Domains
2. Click "Add Domain"
3. Enter `yggdrasil.adarshsadanand.in`

**Render**:
1. Service settings → Custom Domain
2. Add `yggdrasil.adarshsadanand.in`

#### Step 4: Wait for propagation
DNS changes can take 1-48 hours to propagate globally (usually < 2 hours).

---

## Linking from Main Site (adarshsadanand.in)

Add a link on your main site's index page:

```html
<div class="project-card">
  <h3>🌳 Yggdrasil - Deep Research Tool</h3>
  <p>AI-powered research assistant generating comprehensive IEEE-formatted reports</p>
  <a href="https://yggdrasil.adarshsadanand.in">Launch Tool →</a>
</div>
```

---

## Important Considerations

### 1. Ollama Hosting

Ollama requires a host with GPU access or runs slowly on CPU. Options:

- **Local only**: Keep Ollama running on your machine, use ngrok for testing
- **Cloud GPU**: Rent GPU instance (vast.ai, runpod.io)  
- **Alternative LLM**: Use OpenAI API instead (modify `ollama_client.py`)

### 2. Environment Variables

Create `.env` file locally:
```bash
TAVILY_API_KEY=tvly-xxxxx
OLLAMA_BASE_URL=http://localhost:11434  # or cloud URL
OLLAMA_MODEL=llama3.2
```

On deployment platform, set same variables in dashboard.

### 3. File Storage

Deployed apps are often ephemeral (filesystem resets). For persistent PDFs:

- Use cloud storage (AWS S3, Cloudflare R2)
- Modify `config.py` to use cloud `OUTPUT_DIR`
- Or accept that PDFs are temporary (user downloads immediately)

---

## GitHub Repository Setup

### 1. Initialize Git (if not already)

```bash
cd x:\MSRIT\Py_project\deep-research-assistant
git init
git add .
git commit -m "Initial commit - Yggdrasil Deep Research Tool"
```

### 2. Create GitHub repository

1. Go to https://github.com/new
2. Repository name: `yggdrasil-research-tool`
3. Description: "AI-powered research assistant with IEEE formatting"
4. Public/Private: Your choice
5. Don't initialize with README (you already have one)
6. Click "Create repository"

### 3. Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/yggdrasil-research-tool.git
git branch -M main
git push -u origin main
```

### 4. Update README with live link

After deployment, add to top of README.md:

```markdown
## 🚀 Live Demo

**Try it here**: https://yggdrasil.adarshsadanand.in
```

---

## Testing Deployment

### Local Testing First

Before deploying:

```bash
# Activate virtual environment
venv\Scripts\activate

# Set environment variables in .env file

# Run locally
python main.py

# Test at http://localhost:5000
```

### Post-Deployment Checklist

- [ ] Site loads at deployed URL
- [ ] Environment variables are set
- [ ] Ollama connection works (or using alternative)
- [ ] Tavily API key is valid
- [ ] Can submit a test research query
- [ ] Quick mode completes successfully
- [ ] PDF downloads work
- [ ] Custom domain resolves (if configured)

---

## Troubleshooting

### "Module not found" errors
- Ensure `requirements.txt` is complete
- Check build logs on platform

### Ollama connection fails
- Verify `OLLAMA_BASE_URL` environment variable
- If using local Ollama, deploy Ollama to cloud OR use OpenAI API

### Timeout on Deep mode
- Increase timeout in platform settings
- Or use Railway/Render (not Vercel for long tasks)

### PDF generation fails
- Check write permissions in deployment
- Verify ReportLab is installed
- Check logs for specific errors

---

## Next Steps

1. Deploy to chosen platform
2. Configure custom domain
3. Add link from main site
4. Share with users!

**Questions?** Check platform documentation:
- Vercel: https://vercel.com/docs
- Railway: https://docs.railway.app
- Render: https://render.com/docs
