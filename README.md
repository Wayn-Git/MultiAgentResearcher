# 🔍 MultiAgentResearcher

A multi-agent AI pipeline that autonomously researches any topic by decomposing it into tasks, retrieving web sources, synthesizing findings, identifying knowledge gaps, and generating a structured final report.

---

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
│ Retriever Agent  │  → Searches the web (via Tavily) for each task
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Synthesis Agent  │  → Combines sources into unified findings per task
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Gap Agent      │  → Identifies missing coverage and weak areas
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Report Agent    │  → Produces a structured final research report
└──────────────────┘
```

---

## 🗂️ Project Structure

```
MultiAgentResearcher/
├── complete_pipe.py                    # Full end-to-end pipeline (WIP)
├── requirements.txt
├── model_output_data/                  # All agent outputs, organized by query
│   └── research_on_iphones/
│       ├── tasks.json                  # Generated research tasks
│       ├── retrieval_results.json      # Web search results per task
│       ├── synthesis_results.json      # Synthesized findings per task
│       ├── gap_results.json            # Identified gaps and coverage assessment
│       └── final_report.json           # Final structured research report
└── notebooks/
    ├── Task_Agent/task_agent.ipynb
    ├── Retriever_Agent/retriever_agent.ipynb
    ├── Synthesis_Agent/synthesis_agent.ipynb
    ├── gap_agent/gap_agent.ipynb
    └── report_agent/report_agent.ipynb
```

---

## 🤖 Agent Breakdown

| Agent | Model | Role |
|---|---|---|
| **Task Agent** | `llama-3.1-8b-instant` | Decomposes the user query into 3–5 prioritized research tasks |
| **Retriever Agent** | `llama-3.1-8b-instant` + Tavily | Fetches and structures web results for each task |
| **Synthesis Agent** | `llama-3.1-8b-instant` | Merges source findings into coherent, deduplicated summaries |
| **Gap Agent** | `llama-3.1-8b-instant` | Detects weaknesses and missing dimensions across all tasks |
| **Report Agent** | `llama-3.1-8b-instant` | Produces a final executive report with findings, gaps, and next steps |

---

## 📦 Installation

```bash
git clone https://github.com/your-username/MultiAgentResearcher.git
cd MultiAgentResearcher
pip install -r requirements.txt
```

### Required API Keys

Create a `.env` file in the root directory:

```env
GROQ_API_KEY=your_groq_api_key
TAVILY_SEARCH_API=your_tavily_api_key
```

- **Groq** – used to run the LLM agents: [console.groq.com](https://console.groq.com)
- **Tavily** – used for web search retrieval: [tavily.com](https://tavily.com)

---

## 🚀 Usage

> **Note:** The full pipeline (`complete_pipe.py`) is currently a work in progress. Each agent can be run independently via its notebook.

### Run Individual Agents

Open and execute the notebooks in order:

```
notebooks/Task_Agent/task_agent.ipynb
notebooks/Retriever_Agent/retriever_agent.ipynb
notebooks/Synthesis_Agent/synthesis_agent.ipynb
notebooks/gap_agent/gap_agent.ipynb
notebooks/report_agent/report_agent.ipynb
```

Each agent automatically detects the **most recently created** folder in `model_output_data/` and reads/writes from there.

---

## 📄 Example Output

**Query:** `"research on iphones"`

**Generated Tasks:**
- History of iPhone development (2007–present)
- Key features and technologies (Touch ID, Face ID, camera)
- Market trends and sales data
- Impact on mobile software development
- Environmental and social implications

**Final Report Excerpt:**
> *"This research project investigated the environmental and social implications of iPhone production and usage, highlighting challenges such as greenhouse gas emissions, e-waste, and supply chain sustainability concerns. Labor practices and human rights issues are underrepresented in current research..."*

**Identified Gaps:**
- Labor practices and human rights in iPhone supply chains
- Effects of iPhone ownership on low-income communities
- Political and economic impacts across countries and regions

---

## 🛠️ Tech Stack

- **[Groq](https://groq.com)** – Fast LLM inference (`llama-3.1-8b-instant`)
- **[Tavily](https://tavily.com)** – AI-powered web search API
- **Python** – Core pipeline logic
- **JSON** – Structured inter-agent communication

---

## 🔮 Roadmap

- [ ] Complete `complete_pipe.py` end-to-end pipeline
- [ ] Add a Streamlit or Gradio UI
- [ ] Support additional LLM providers (OpenAI, Anthropic)
- [ ] Add iterative research loops (agent re-runs gap tasks)
- [ ] Export reports to PDF / Markdown

---

## 📝 License

MIT License – feel free to use, modify, and build on this project.