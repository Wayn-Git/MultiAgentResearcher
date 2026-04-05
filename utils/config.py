import os

# Centralized model configuration to allow easy swapping and load balancing
# 8b models are used for "lighter" extraction/planning tasks to save 70b TPD/TPM limits.
# 70b models are reserved for deep synthesis, reasoning, and final reporting.

MODEL_8B = "llama-3.1-8b-instant"
MODEL_70B = "llama-3.3-70b-versatile"

# Assignments based on task difficulty
TASK_MODEL = MODEL_8B            # Strategy/Planning (8b is usually sufficient)
RETRIEVAL_MODEL = MODEL_8B       # Factual extraction (Already 8b)
SYNTHESIS_MODEL = MODEL_70B      # Deep analytical synthesis (Requires 70b)
CRITIC_MODEL = MODEL_8B         # Identifying weaknesses (8b can spot surface issues)
REFINE_MODEL = MODEL_70B        # Incorporating feedback (Requires 70b)
CROSS_SYNTHESIS_MODEL = MODEL_70B # High-level integration (Requires 70b)
GAP_MODEL = MODEL_8B            # Gap detection (8b is sufficient)
REPORT_MODEL = MODEL_70B         # Final publication quality (Requires 70b)
CHAT_MODEL = MODEL_8B           # General conversation about research (8b is sufficient)

def get_model(purpose):
    mapping = {
        "task": TASK_MODEL,
        "retrieval": RETRIEVAL_MODEL,
        "synthesis": SYNTHESIS_MODEL,
        "critic": CRITIC_MODEL,
        "refine": REFINE_MODEL,
        "cross_synthesis": CROSS_SYNTHESIS_MODEL,
        "gap": GAP_MODEL,
        "report": REPORT_MODEL,
        "chat": CHAT_MODEL
    }
    return mapping.get(purpose, MODEL_8B)
