const API_BASE = '/api';

export const uploadPDF = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(errorData.detail || 'Failed to upload document');
  }

  return await res.json();
};

export const fetchSummary = async (fileId) => {
  const res = await fetch(`${API_BASE}/summary/${fileId}`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return await res.json();
};

export const fetchTopics = async (fileId) => {
  const res = await fetch(`${API_BASE}/topics/${fileId}`);
  if (!res.ok) throw new Error('Failed to fetch topics');
  return await res.json();
};

export const fetchMCQ = async (fileId, count = 10, difficulty = 'Medium', topic = 'All') => {
  const res = await fetch(`${API_BASE}/questions/mcq/${fileId}?count=${count}&difficulty=${difficulty}&topic=${encodeURIComponent(topic)}`);
  if (!res.ok) throw new Error('Failed to fetch MCQs');
  return await res.json();
};

export const fetchShortQuestions = async (fileId, count = 8) => {
  const res = await fetch(`${API_BASE}/questions/short/${fileId}?count=${count}`);
  if (!res.ok) throw new Error('Failed to fetch 2-mark questions');
  return await res.json();
};

export const fetchMediumQuestions = async (fileId, count = 5) => {
  const res = await fetch(`${API_BASE}/questions/medium/${fileId}?count=${count}`);
  if (!res.ok) throw new Error('Failed to fetch 5-mark questions');
  return await res.json();
};

export const fetchLongQuestions = async (fileId, count = 3) => {
  const res = await fetch(`${API_BASE}/questions/long/${fileId}?count=${count}`);
  if (!res.ok) throw new Error('Failed to fetch 10-mark questions');
  return await res.json();
};

export const fetchFlashcards = async (fileId, count = 12) => {
  const res = await fetch(`${API_BASE}/flashcards/${fileId}?count=${count}`);
  if (!res.ok) throw new Error('Failed to fetch flashcards');
  return await res.json();
};

export const fetchMockExam = async (fileId, timeLimitMinutes = 30) => {
  const res = await fetch(`${API_BASE}/mock-exam/${fileId}?time_limit_minutes=${timeLimitMinutes}`);
  if (!res.ok) throw new Error('Failed to generate mock exam');
  return await res.json();
};

export const sendChatMessage = async (fileId, message, history = []) => {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId || "", message, history }),
  });
  if (!res.ok) throw new Error('Failed to process chat message');
  return await res.json();
};

export const generateExamMission = async (fileId, daysRemaining = 5, examDate = null) => {
  const res = await fetch(`${API_BASE}/exam-mission/${fileId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days_remaining: daysRemaining, exam_date: examDate }),
  });
  if (!res.ok) throw new Error('Failed to generate exam mission plan');
  return await res.json();
};

export const adaptExamMission = async (fileId, currentDays, weakTopic, failedDayNumber) => {
  const res = await fetch(`${API_BASE}/exam-mission/${fileId}/adapt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_days: currentDays, weak_topic: weakTopic, failed_day_number: failedDayNumber }),
  });
  if (!res.ok) throw new Error('Failed to adapt exam mission plan');
  return await res.json();
};

