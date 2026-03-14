# MultiAgentResearcher Deployment Guide

This guide covers deploying the MultiAgentResearcher application with the frontend on Vercel and backend on Render.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Vercel        │         │      Render      │
│   (Frontend)    │────────▶│    (Backend)     │
│   React + Vite  │         │   FastAPI +      │
│                 │         │   Uvicorn        │
└─────────────────┘         └──────────────────┘
```

## Prerequisites

1. **Vercel Account** - https://vercel.com
2. **Render Account** - https://render.com
3. **Groq API Key** - Get from https://console.groq.com/keys
4. **GitHub Repository** - Push your code to GitHub

---

## Step 1: Deploy Backend to Render

### 1.1 Prepare the Backend

The backend is already configured with:
- `requirements.txt` - Python dependencies
- `render.yaml` - Render configuration
- `main.py` - FastAPI application

Note: Render automatically detects Python applications and deploys them using the specified build and start commands.

### 1.2 Deploy to Render

1. **Connect GitHub Repository**
   - Go to Render dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

2. **Configure Service Settings**
   - **Service Type**: Web Service
   - **Name**: multiagent-researcher-backend
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free (or choose your plan)

3. **Configure Environment Variables**
   - In Render dashboard, go to your service
   - Go to "Environment" tab
   - Add these variables:
     ```
     GROQ_API_KEY = your_groq_api_key_here
     ```

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy
   - Note your Render domain (e.g., `your-service.onrender.com`)

### 1.3 Backend Configuration

The backend includes:
- **API Endpoints**:
  - `POST /api/research` - Run research pipeline
  - `POST /api/research/stream` - Stream research steps
  - `POST /api/chat` - Chat about research (Talk mode)
  - `GET /api/history` - List research sessions
  - `GET /api/history/{folder}` - Get session details
  - `GET /api/history/{folder}/report.md` - Get markdown report

### 1.4 Render Specific Notes
- Free tier has 750 hours/month
- Service will sleep after 15 minutes of inactivity (on free tier)
- First request after sleep may take 30-60 seconds

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
     VITE_API_URL = https://your-service.onrender.com
     ```
   - Replace `your-service.onrender.com` with your actual Render domain

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
   - From Render dashboard, copy your service domain
   - Example: `https://your-service.onrender.com`

2. **Update Frontend Environment**
   - In Vercel dashboard, go to Project Settings → Environment Variables
   - Update `VITE_API_URL` with your Render domain
   - Redeploy the frontend if needed

### 3.2 Verify Connection

1. Open your Vercel frontend URL
2. Run a test research query
3. Verify the backend processes the request
4. Check Talk mode works with completed research

---

## Step 4: Environment Variables Reference

### Backend (Render) Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ Yes | Groq API key for LLM access |
| `PORT` | ✅ Yes | Render provides automatically |

### Frontend (Vercel) Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ Yes | Backend API URL (e.g., `https://your-service.onrender.com`) |

---

## Step 5: Testing the Deployment

### 5.1 Test Backend
```bash
# Test backend health
curl https://your-service.onrender.com/api/history

# Test chat endpoint
curl -X POST https://your-service.onrender.com/api/chat \
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
- Ensure Render uses the correct port (Render provides $PORT environment variable)
- Check Render logs for errors

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

### Render (Backend)
- Free tier: 750 hours/month
- Web services sleep after 15 min inactivity
- Build minutes: unlimited on free tier
- 512 MB RAM

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

- [ ] Set production domains in Vercel and Render
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
- Render Documentation: https://docs.render.com
- Groq API: https://console.groq.com/docs
- FastAPI Documentation: https://fastapi.tiangolo.com
- React Documentation: https://react.dev

---

## Support

For issues:
1. Check deployment logs in Vercel/Render dashboards
2. Verify environment variables are set correctly
3. Test API endpoints directly with curl
4. Review error messages in browser console
