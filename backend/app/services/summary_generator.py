SUMMARY_PROMPT = "You are a document analyst. Generate a brief summary (3-5 sentences in Russian) of this technical specification. Focus on: what the project is about, main goals, and key requirements. Output ONLY the summary text, no formatting."


async def generate_summary(document_text: str, llm) -> str:
    """Generate brief summary of the TZ document using LLM."""
    truncated = document_text[:3000]  # Limit input
    result = await llm.complete(SUMMARY_PROMPT, truncated)
    return result.strip()
