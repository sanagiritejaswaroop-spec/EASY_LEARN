from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class UploadResponse(BaseModel):
    file_id: str
    filename: str
    file_size_bytes: int
    file_size_formatted: str
    total_pages: int
    total_words: int
    estimated_chapters: int
    status: str
    extracted_text_preview: str

class ConceptCard(BaseModel):
    number: str
    title: str
    description: str

class SummaryResponse(BaseModel):
    overview: str
    main_concepts: List[ConceptCard]
    key_takeaways: List[str]

class TopicItem(BaseModel):
    id: str
    name: str
    importance_percentage: int
    short_explanation: str
    what_you_should_know: List[str]
    key_terms: List[str]
    quick_summary: str

class TopicsResponse(BaseModel):
    topics: List[TopicItem]

class MCQOption(BaseModel):
    id: str
    text: str

class MCQItem(BaseModel):
    id: str
    question: str
    options: List[MCQOption]
    correct_option_id: str
    explanation: str
    topic: str
    difficulty: str

class MCQResponse(BaseModel):
    questions: List[MCQItem]
    total_questions: int

class ShortQuestionItem(BaseModel):
    id: str
    question: str
    answer: str
    topic: str

class ShortQuestionsResponse(BaseModel):
    questions: List[ShortQuestionItem]

class StructuredSection(BaseModel):
    heading: str
    content: str

class MediumQuestionItem(BaseModel):
    id: str
    question: str
    topic: str
    introduction: str
    main_points: List[str]
    example: Optional[str] = None
    conclusion: str

class MediumQuestionsResponse(BaseModel):
    questions: List[MediumQuestionItem]

class LongQuestionItem(BaseModel):
    id: str
    question: str
    topic: str
    definition: str
    detailed_explanation: str
    steps_or_types: List[str]
    practical_example: str
    pros_and_cons: Dict[str, List[str]]
    conclusion: str

class LongQuestionsResponse(BaseModel):
    questions: List[LongQuestionItem]

class FlashcardItem(BaseModel):
    id: str
    front: str
    back: str
    topic: str
    difficulty: str

class FlashcardResponse(BaseModel):
    flashcards: List[FlashcardItem]

class MockExamQuestion(BaseModel):
    id: str
    type: str  # mcq, short, medium
    question: str
    options: Optional[List[MCQOption]] = None
    correct_option_id: Optional[str] = None
    model_answer: str
    marks: int
    topic: str

class MockExamResponse(BaseModel):
    exam_id: str
    title: str
    total_questions: int
    total_marks: int
    time_limit_minutes: int
    questions: List[MockExamQuestion]

class ChatRequest(BaseModel):
    file_id: str
    message: str
    history: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    reply: str
    sources: Optional[List[str]] = []
    suggested_followups: List[str]
