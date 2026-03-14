# MultiAgentResearcher Deployment Guide

This guide covers deploying the MultiAgentResearcher application with the frontend on Vercel and backend on Railway.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Vercel        │         │     Railway      │
│   (Frontend)    │────────▶│    (Backend)     │
│   React + Vite  │         │   FastAPI +      │
│                 │         │   Uvicorn        │
└─────────────────┘         └──────────────────┘
```

## Prerequisites

1. **Vercel Account** - https://vercel.com
2. **Railway Account** - https://railway.app
3. **Groq API Key** - Get from https://console.groq.com/keys
4. **GitHub Repository** - Push your code to GitHub

---

## Step 1: Deploy Backend to Railway

### 1.1 Prepare the Backend

The backend is already configured with:
- `requirements.txt` - Python dependencies
- `railway.json` - Railway configuration
- `Procfile` - Process definition
- `main.py` - FastAPI application

### 1.2 Deploy to Railway

1. **Connect GitHub Repository**
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub repository
   - Select the repository

2. **Configure Variables**
   - In Railway dashboard, go to your project
   - Go to "Variables" tab
   - Add these variables:
     ```
     GROQ_API_KEY = your_groq_api_key_here
     ```

3. **Deploy**
   - Railway will automatically detect the `railway.json` configuration
   - The app will build and deploy automatically
   - Note your Railway domain (e.g., `backend-production.up.railway.app`)

### 1.3 Backend Configuration

The backend includes:
- **API Endpoints**:
  - `POST /api/research` - Run research pipeline
  - `POST /api/research/stream` - Stream research steps
  - `POST /api/chat` - Chat about research (Talk mode)
  - `GET /api/history` - List research sessions
  - `GET /api/history/{folder}` - Get session details
  - `GET /api/history/{folder}/report.md` - Get markdown report

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Prepare the Frontend

The frontend is already configured with:
- `package.json` - Dependencies and scripts
- `vercel.json` - Vercel configuration
- `src/App.jsx` - Main React component
- Environment variable support for API URL

### 2.2 Deploy to Vercel

1. **Connect GitHub Repository**
   - Go to Vercel dashboard
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Select the repository

2. **Configure Project Settings**
   - Framework Preset: `Other`
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`
   - Install Command: `cd frontend && npm install`

3. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add the API URL:
     ```
     VITE_API_URL = https://your-backend.railway.app
     ```
   - Replace `your-backend.railway.app` with your actual Railway domain

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Note your Vercel domain (e.g., `your-app.vercel.app`)

### 2.3 Frontend Configuration

The frontend includes:
- **React + Vite** - Modern frontend framework
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **Mode Toggle** - Switch between Research and Talk modes

---

## Step 3: Connect Frontend to Backend

### 3.1 Update API URL

After both deployments are complete:

1. **Get Backend URL**
   - From Railway dashboard, copy your project domain
   - Example: `https://backend-production.up.railway.app`

2. **Update Frontend Environment**
   - In Vercel dashboard, go to Project Settings → Environment Variables
   - Update `VITE_API_URL` with your Railway domain
   - Redeploy the frontend if needed

### 3.2 Verify Connection

1. Open your Vercel frontend URL
2. Run a test research query
3. Verify the backend processes the request
4. Check Talk mode works with completed research

---

## Step 4: Environment Variables Reference

### Backend (Railway) Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ Yes | Groq API key for LLM access |
| `PORT` | ✅ Yes | Railway provides automatically |

### Frontend (Vercel) Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ Yes | Backend API URL (e.g., `https://your-backend.railway.app`) |

---

## Step 5: Testing the Deployment

### 5.1 Test Backend
```bash
# Test backend health
curl https://your-backend.railway.app/api/history

# Test chat endpoint
curl -X POST https://your-backend.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test", "folder_id": "test", "history": []}'
```

### 5.2 Test Frontend
1. Open your Vercel URL in browser
2. Verify the UI loads correctly
3. Run a research query
4. Switch to Talk mode
5. Select a completed research session
6. Ask questions about the research

---

## Step 6: Troubleshooting

### Backend Issues

**Port Configuration**
- Ensure Railway uses port `8000` or update `uvicorn` command
- Check Railway logs for errors

**Groq API Key**
- Verify `GROQ_API_KEY` is set correctly
- Check Groq dashboard for API usage

### Frontend Issues

**API Connection**
- Verify `VITE_API_URL` points to correct backend
- Check browser console for CORS errors
- Ensure backend URL is accessible

**Build Errors**
- Check Vercel build logs
- Verify `package.json` scripts are correct
- Ensure all dependencies are listed

### CORS Issues

The backend is configured to allow all origins (`allow_origins=["*"]`). If needed, update `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-vercel-app.vercel.app"],  # Specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Step 7: Cost Considerations

### Railway (Backend)
- Free tier: 500 hours/month
- Build minutes: 100 hours/month
- Storage: 1GB

### Vercel (Frontend)
- Free tier: Hobby plan
- Bandwidth: 100GB/month
- Serverless functions: 10 seconds timeout

### Groq (LLM)
- Free tier: $10/month credits
- Pricing: Per token usage
- Monitor usage in Groq dashboard

---

## Step 8: Production Checklist

- [ ] Set production domains in Vercel and Railway
- [ ] Update API URL in Vercel environment variables
- [ ] Set proper CORS origins in backend
- [ ] Add error monitoring (optional)
- [ ] Configure custom domains (optional)
- [ ] Set up SSL/HTTPS (automatic on both platforms)
- [ ] Monitor usage and costs
- [ ] Test all features end-to-end

---

## Additional Resources

- Vercel Documentation: https://vercel.com/docs
- Railway Documentation: https://docs.railway.app
- Groq API: https://console.groq.com/docs
- FastAPI Documentation: https://fastapi.tiangolo.com
- React Documentation: https://react.dev

---

## Support

For issues:
1. Check deployment logs in Vercel/Railway dashboards
2. Verify environment variables are set correctly
3. Test API endpoints directly with curl
4. Review error messages in browser console
