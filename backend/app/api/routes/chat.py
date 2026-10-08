"""Chatbot endpoints. Both operate on an AnalysisResult the client already
fetched from /analyze — a chat turn never re-runs ECG model inference.

/chat          answered by a local, offline LLM (Ollama — see
               core/config.py's ollama_* settings) using the grounded
               system prompt from build_chatbot_context(), so it can handle
               open-ended questions about arrhythmias and the finding, not
               just a fixed set of patterns. If Ollama isn't reachable
               (not installed, not running, model not pulled), falls back
               to the deterministic rule-based answers below rather than
               failing the request — the app still works end-to-end with
               zero LLM configured, just less conversationally.
/chat/context  returns the grounded system prompt directly, for anyone
               wiring up a different LLM instead.
"""

import httpx
from fastapi import APIRouter

from ...core.config import get_settings
from ...ml.constants import ANATOMY
from ...ml.ensemble import build_chatbot_context
from ...schemas.ecg import (
    ChatContextRequest,
    ChatContextResponse,
    ChatRequest,
    ChatResponse,
)

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    result = req.result.model_dump(by_alias=True)
    system_prompt = build_chatbot_context(result, req.hint_given)

    answer = await _ollama_answer(system_prompt, req.question)
    if answer is None:
        answer = _rule_based_answer(result, req.question)
    return ChatResponse(answer=answer)


@router.post("/chat/context", response_model=ChatContextResponse)
def chat_context(req: ChatContextRequest):
    result = req.result.model_dump(by_alias=True)
    return ChatContextResponse(system_prompt=build_chatbot_context(result, req.hint_given))


async def _ollama_answer(system_prompt: str, question: str) -> str | None:
    """Returns the model's reply, or None if Ollama couldn't be reached —
    None (not an exception) so the caller's fallback is a single `if`."""
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout_s) as client:
            resp = await client.post(
                f"{settings.ollama_host}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": question},
                    ],
                    "stream": False,
                },
            )
            resp.raise_for_status()
            return resp.json()["message"]["content"].strip()
    except (httpx.HTTPError, KeyError, ValueError):
        return None


def _rule_based_answer(result: dict, question: str) -> str:
    pred = result["prediction"]
    anat = ANATOMY[pred["class"]]
    ql = question.lower()
    unreliable = pred["reliability_tier"] != "reliable"

    if unreliable and any(w in ql for w in ("sure", "confident", "certain")):
        return (
            f'This {pred["class"]} result is not reliable — it scored low under patient-level '
            f'testing (F1 {pred["record_level_f1"]:.2f}). Please confirm with a cardiologist '
            f'before acting on it.'
        )

    if any(w in ql for w in ("chamber", "ventricle", "which side")):
        if anat["loc_tier"] == "chamber_unresolved":
            return (
                "The model can't tell whether this came from the right or left ventricle. "
                "That needs V1 morphology assessment this system doesn't perform."
            )

    if any(w in ql for w in ("where", "origin")):
        if anat["site_id"]:
            return f'Based on the finding, the origin is: {anat["label"]}. Mechanism: {anat["mechanism"]}.'
        return 'This type of finding has no single point of origin.'

    if any(w in ql for w in ("heart rate", "bpm", "pulse")):
        return f'Your heart rate is about {result["heart_rate_bpm"]} beats per minute.'

    if any(w in ql for w in ("lead", "evidence")):
        return f'The model relied most on lead {result["lead_evidence"]["top_lead"]} for this finding.'

    if any(w in ql for w in ("serious", "dangerous", "worry")):
        if pred["class"] == "VT":
            return 'VT can be serious. Please seek medical advice promptly.'
        return "I can't judge how serious this is — a cardiologist can tell you properly."

    return f"I'm not sure about that. Please consult a cardiologist for interpretation. (Finding: {pred['class']})"
