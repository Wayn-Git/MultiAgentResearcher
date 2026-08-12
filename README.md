# 🔍 MultiAgentResearcher

A multi-agent AI pipeline that autonomously researches any topic by decomposing it into tasks, retrieving web sources, synthesizing findings, identifying knowledge gaps, and generating a structured final report — with an interactive **Talk Mode** to chat about your research.

---

## 🆕 New Features

- **Talk Mode**: Chat with an LLM about your completed research findings
- **Web Interface**: Modern React UI with Vite + Tailwind CSS
- **7-Step Research Pipeline**: Full autonomous research workflow
- **Research History**: Browse and reload past sessions

## 🧠 How It Works

The pipeline consists of **5 specialized agents**, each handling a distinct stage of the research process:

```
User Query
    │
    ▼
┌─────────────┐
│  Task Agent │  → Decomposes topic into 3–5 research tasks
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Retriever Agent  │  → Searches the web for each task
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Synthesis Agent  │  → Combines sources into unified findings
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Gap Agent      │  → Identifies missing coverage
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Report Agent    │  → Produces structured final report
└──────────────────┘
       │
       ▼
┌──────────────────┐
│   Talk Mode      │  → Chat about your research findings
└──────────────────┘
```

---

## 🚀 Quick Start

### Local Development

**Backend (FastAPI):**
```bash
pip install -r requirements.txt
export GROQ_API_KEY=your_groq_api_key
python main.py
# Server: http://localhost:8000
```

**Frontend (React):**
```bash
cd frontend
npm install
npm run dev
# Server: http://localhost:5173
```

### Deployment

**Frontend to Vercel:**
```bash
# Push to GitHub, then connect to Vercel
# Add environment variable: VITE_API_URL=https://your-service.onrender.com
```

**Backend to Render:**
```bash
# Push to GitHub, then connect to Render
# Add environment variable: GROQ_API_KEY=your_groq_api_key
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

---

## 🏗️ Project Structure

```
MultiAgentResearcher/
├── main.py                         # FastAPI backend
├── requirements.txt                # Python dependencies
├── render.yaml                     # Render config
├── vercel.json                     # Vercel config
├── DEPLOYMENT.md                   # Deployment guide
├── .env.example                    # Environment template
│
├── frontend/                       # React + Vite frontend
│   ├── src/
│   │   └── App.jsx                # Main React component
│   ├── package.json
│   └── vercel.json
│
├── agents/                         # AI agents
│   ├── task_agent.py
│   ├── retrieval_agent.py
│   ├── synthesis_agent.py
│   ├── critic_agent.py
│   ├── cross_synthesis_agent.py
│   ├── gap_agent.py
│   └── report_agent.py
│
├── model_output_data/              # Research results
│   └── [research_session]/
│       ├── tasks.json
│       ├── retrieval_results.json
│       ├── synthesis_results.json
│       ├── refined_synthesis_results.json
│       ├── gap_results.json
│       └── final_report.md
```

---

## 🤖 Agent Breakdown

| Agent | Model | Role |
|---|---|---|
| **Task Agent** | `llama-3.3-70b-versatile` | Decomposes user query into prioritized tasks |
| **Retriever Agent** | `llama-3.3-70b-versatile` | Fetches and structures web results |
| **Synthesis Agent** | `llama-3.3-70b-versatile` | Merges sources into coherent findings |
| **Critic Agent** | `llama-3.3-70b-versatile` | Identifies issues and refines synthesis |
| **Gap Agent** | `llama-3.3-70b-versatile` | Detects weaknesses and missing areas |
| **Report Agent** | `llama-3.3-70b-versatile` | Produces final structured report |

---

## 🔧 API Endpoints

### Research Pipeline
- `POST /api/research` - Run research pipeline (sync)
- `POST /api/research/stream` - Stream pipeline steps (SSE)

### Research History
- `GET /api/history` - List all research sessions
- `GET /api/history/{folder}` - Get session details
- `GET /api/history/{folder}/report.md` - Get markdown report

### Talk Mode
- `POST /api/chat` - Chat about completed research

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Web framework
- **Uvicorn** - ASGI server
- **Groq** - LLM inference
- **Python 3.10+**

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Lucide React** - Icons

---

## 📦 Required API Keys

Create a `.env` file:

```env
# Backend
GROQ_API_KEY=your_groq_api_key

# Frontend
VITE_API_URL=http://localhost:8000
```

- **Groq**: https://console.groq.com

---

## 🚀 Usage

### Research Mode
1. Enter a research topic in the search bar
2. Click "EXECUTE"
3. Watch the 7-step pipeline run
4. View results in the UI

### Talk Mode
1. Complete a research session (or select one from the sidebar)
2. Click "TALK" in the mode toggle
3. Select a research session from the sidebar
4. Ask questions about your research findings

---

## 📄 Example Output

**Query:** `"What is the impact of AI on job markets?"`

**Final Report Excerpt:**
> *"AI is projected to replace approximately 85 million jobs by 2025 while creating 97 million new roles... The impact varies significantly across sectors, with manufacturing and customer service most affected..."*

**Talk Mode Example:**
> **User:** "What are the main findings?"
>
> **AI:** *"The main findings include: 1) AI will create more jobs than it eliminates, 2) Skills transformation is critical, 3) Healthcare and creative industries show highest growth..."*

---

## 🔮 Roadmap

- [x] Basic research pipeline
- [x] Web UI with React
- [x] Talk Mode for research chat
- [x] Deployment to Vercel + Render
- [ ] Export reports to PDF
- [ ] User authentication
- [ ] Multi-user support
- [ ] Advanced visualization

---

## 📝 License

MIT License – feel free to use, modify, and build on this project.

## 📚 Documentation

- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Backend API**: http://localhost:8000/docs
- **Frontend**: http://localhost:5173
