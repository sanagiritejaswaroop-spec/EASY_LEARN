# NOVA — AI Study Assistant 🌌

**NOVA** is a premium, cinematic AI-powered study assistant application designed to transform complex study materials into exam-ready resources. Students can upload any PDF document, and NOVA will parse, extract, analyze, and synthesize the content into structured summaries, ranked key topics with weightage scores, interactive MCQs, 2/5/10-mark exam questions, 3D flip flashcards, timed mock exams, and an interactive "Ask NOVA" AI document chat.

---

## 🚀 Key Features

1. **Cosmic Universe Visual Identity**:
   - High-performance HTML5 Canvas deep-space background with moving stars, glowing nebula gradients, subtle depth parallax, and periodic shooting stars.
   - Glassmorphism dark UI with glowing accents, large rounded corners, and Framer Motion micro-animations.

2. **PDF Parsing & Text Processing**:
   - PyMuPDF (`fitz`) backend engine for fast, reliable text extraction and page layout structure parsing.
   - Support for drag & drop file uploads up to 50 MB with animated processing stages.

3. **Session Persistence**:
   - Remembers uploaded document text and analysis across sections so students can navigate freely without re-uploading.

4. **Comprehensive Study Modules**:
   - **Executive Summary**: Overview summary + numbered concept cards + high-yield exam takeaways.
   - **Important Topics**: Topic weightage ranking (% relevance), short explanations, and detail breakdown drawers.
   - **MCQ Practice Engine**: Single-question stepper with topic & count filters, instant feedback, score card, and review mode.
   - **2-Mark Questions**: Short-answer exam questions with toggleable model answers and "Generate More".
   - **5-Mark Questions**: Structured university exam format (Introduction, Core Working Principles, Example, Conclusion).
   - **10-Mark Questions**: Comprehensive long essay answers (Definition, Architecture, Steps/Types, Practical Example, Advantages/Disadvantages, Conclusion).
   - **3D Flip Flashcards**: Interactive active-recall cards with 3D CSS perspective flips and mastery tracking (`Known` vs `Review`).
   - **Timed Mock Exam Mode**: Realistic 30-minute exam simulation with countdown timer, mixed question types, and automated score report (Strong Areas vs Needs Revision).
   - **Ask NOVA AI Chat**: Context-aware interactive Q&A assistant trained directly on the uploaded PDF text with suggested follow-up chips.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide React Icons.
- **Backend**: Python 3.13+, FastAPI, PyMuPDF (`fitz`), Pydantic v2, Uvicorn.
- **AI/NLP Layer**: Configurable LLM API integration (`AI_API_KEY`, `AI_MODEL`) with built-in Smart NLP Fallback Engine for offline/keyless functionality.

---

## 📂 Project Structure

```text
nova-study-assistant/
 ├── frontend/
 │    ├── public/
 │    ├── src/
 │    │    ├── components/
 │    │    │    ├── background/CosmicBackground.jsx
 │    │    │    ├── layout/Navbar.jsx, Sidebar.jsx
 │    │    │    ├── upload/FileUpload.jsx, ProcessingScreen.jsx
 │    │    │    └── dashboard/
 │    │    │         ├── SummaryView.jsx
 │    │    │         ├── TopicsView.jsx
 │    │    │         ├── MCQView.jsx
 │    │    │         ├── ShortQuestionsView.jsx
 │    │    │         ├── MediumQuestionsView.jsx
 │    │    │         ├── LongQuestionsView.jsx
 │    │    │         ├── FlashcardsView.jsx
 │    │    │         ├── MockExamView.jsx
 │    │    │         └── AskNovaView.jsx
 │    │    ├── pages/LandingPage.jsx, DashboardPage.jsx
 │    │    ├── services/api.js
 │    │    ├── context/StudyContext.jsx
 │    │    ├── App.jsx
 │    │    └── index.css
 │    ├── package.json
 │    ├── tailwind.config.js
 │    └── vite.config.js
 │
 └── backend/
      ├── app/
      │    ├── main.py
      │    ├── config.py
      │    ├── routes/
      │    │    ├── pdf_routes.py
      │    │    ├── study_routes.py
      │    │    └── chat_routes.py
      │    ├── services/
      │    │    ├── pdf_service.py
      │    │    ├── ai_service.py
      │    │    ├── summary_service.py
      │    │    ├── topic_service.py
      │    │    ├── question_service.py
      │    │    ├── flashcard_service.py
      │    │    ├── mock_exam_service.py
      │    │    └── chat_service.py
      │    └── models/schemas.py
      ├── requirements.txt
      └── .env.example
```

---

## ⚡ Quick Start & Running Locally

### 1. Prerequisites
- **Node.js**: v18+ (Node v24 recommended)
- **Python**: v3.10+ (Python 3.13 recommended)

---

### 2. Backend Setup & Startup

Navigate to the `backend` directory:

```bash
cd backend
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file (Optional, if connecting to OpenAI or another compatible provider):

```env
AI_API_KEY=your_openai_or_compatible_api_key
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=50
```

Start the FastAPI backend server:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend server will be live at `http://localhost:8000`.

---

### 3. Frontend Setup & Startup

In a separate terminal, navigate to the `frontend` directory:

```bash
cd frontend
```

Install Node packages:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

---

## 🔧 AI API Configuration

NOVA is designed with a dual-mode AI service layer:

1. **Configured API Key Mode**:
   Set `AI_API_KEY` in `backend/.env`. NOVA will stream structured prompt queries to your configured model (e.g. OpenAI GPT-4o-mini, Gemini, Anthropic, or local Ollama).

2. **Built-in Smart NLP Fallback Engine**:
   If no API key is provided, NOVA uses its built-in NLP TF-IDF keyword extraction, sentence scoring, N-gram topic discovery, and question formulation heuristics directly against the uploaded PDF text. This ensures NOVA works out of the box even without paid API keys!

---

## ❓ Troubleshooting

- **PDF Text Extraction Failure**: Ensure the PDF contains readable text. Scanned images or OCR-only PDFs require pre-processing into text PDFs.
- **Port Conflict**: If port 8000 is occupied, change the port in `uvicorn app.main:app --reload --port 8000` and update `vite.config.js` proxy settings accordingly.
- **CORS Errors**: The FastAPI backend includes full CORS middleware allowing request origins from localhost development servers.
