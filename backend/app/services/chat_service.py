from typing import Dict, Any, List
from app.services.pdf_service import pdf_service
from app.services.ai_service import ai_service
from app.services.rag_service import rag_service

class ChatService:
    async def process_chat(self, file_id: str, message: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        doc = pdf_service.get_document(file_id)

        # Step 3, 4, 5, 15: Perform RAG Hybrid Vector Search with Pronoun Intent Resolution & Threshold Filter
        relevant_chunks, resolved_query, is_found = rag_service.search(
            file_id=file_id,
            query=message,
            history=history,
            top_k=5,
            min_threshold=0.05
        )

        # Requirement 15: Retrieval Threshold Check
        if not is_found or not relevant_chunks:
            return {
                "reply": f"I couldn't find enough relevant information about '{message}' in your uploaded PDF (**{doc['filename']}**). Please try asking about specific concepts covered in your notes.",
                "sources": [],
                "suggested_followups": [
                    "What are the main topics in this document?",
                    "Summarize the key concepts",
                    "Give me potential exam questions"
                ]
            }

        # Step 6: Construct Document Context with Page & Section Metadata
        context_blocks = []
        sources = []
        for idx, chunk in enumerate(relevant_chunks):
            context_blocks.append(f"--- Context Block {idx+1} [Page {chunk['page']} | Section: {chunk['section']}] ---\n{chunk['text']}")
            sources.append(f"📄 Page {chunk['page']} ({chunk['section']})")

        formatted_context = "\n\n".join(context_blocks)
        unique_sources = sorted(list(set(sources)))
        sources_str = "\n".join([f"• {s}" for s in unique_sources])

        system_instruction = (
            "You are EASY-LEARN, an expert AI Study Assistant.\n"
            "Answer the user's question using ONLY the provided DOCUMENT CONTEXT below.\n"
            "The document context is your absolute source of truth.\n"
            "If the answer is not present in the provided document context, state clearly:\n"
            "'I couldn't find this information in the uploaded document.'\n"
            "Do not invent facts or use external unverified information.\n"
            "Mention page numbers where relevant."
        )

        prompt = f"""
USER QUESTION:
"{resolved_query}"

DOCUMENT CONTEXT:
{formatted_context}

Provide a clear, college-level explanation based strictly on the context.
Return JSON:
{{
  "reply": "Comprehensive explanation strictly based on the document context.",
  "suggested_followups": ["Followup question 1?", "Followup question 2?", "Followup question 3?"]
}}
"""

        ai_res = await ai_service.generate_json(prompt, system_prompt=system_instruction)
        if ai_res and "reply" in ai_res:
            reply_text = ai_res["reply"]
            if unique_sources and "Page" not in reply_text:
                reply_text += f"\n\n**Sources:**\n{sources_str}"
            return {
                "reply": reply_text,
                "sources": unique_sources,
                "suggested_followups": ai_res.get("suggested_followups", [])
            }

        # Fallback smart NLP synthesis from retrieved RAG chunks
        chunk_sentences = []
        for c in relevant_chunks:
            sents = ai_service.get_topic_sentences(resolved_query, c["text"])
            for s in sents:
                if ai_service.is_substantive_sentence(s) and s not in chunk_sentences:
                    chunk_sentences.append(s)

        if chunk_sentences:
            excerpt = "\n\n• " + "\n• ".join(chunk_sentences[:4])
            reply_text = (
                f"Based on relevant sections in **{doc['filename']}** for *'{resolved_query}'*:\n"
                f"{excerpt}\n\n"
                f"**Sources:**\n{sources_str}"
            )
        else:
            first_c = relevant_chunks[0]
            reply_text = (
                f"Based on **{doc['filename']}** [Page {first_c['page']} | Section: {first_c['section']}]:\n\n"
                f"{first_c['text']}\n\n"
                f"**Sources:**\n{sources_str}"
            )

        return {
            "reply": reply_text,
            "sources": unique_sources,
            "suggested_followups": [
                "Explain this concept in simpler terms",
                "Give an example from the notes",
                "What key terms should I memorize?"
            ]
        }

chat_service = ChatService()
