import React, { createContext, useContext, useState } from 'react';

const StudyContext = createContext();

export const StudyProvider = ({ children }) => {
  // Document state
  const [docData, setDocData] = useState(null); // { file_id, filename, total_pages, total_words, estimated_chapters, ... }
  const [activeView, setActiveView] = useState('summary'); // summary, topics, mcq, short, medium, long, flashcards, mock, chat
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);

  // Cached materials
  const [summaryData, setSummaryData] = useState(null);
  const [topicsData, setTopicsData] = useState(null);
  const [mcqData, setMcqData] = useState(null);
  const [shortQData, setShortQData] = useState(null);
  const [mediumQData, setMediumQData] = useState(null);
  const [longQData, setLongQData] = useState(null);
  const [flashcardData, setFlashcardData] = useState(null);
  const [mockExamData, setMockExamData] = useState(null);

  const resetSession = () => {
    setDocData(null);
    setActiveView('summary');
    setSummaryData(null);
    setTopicsData(null);
    setMcqData(null);
    setShortQData(null);
    setMediumQData(null);
    setLongQData(null);
    setFlashcardData(null);
    setMockExamData(null);
  };

  return (
    <StudyContext.Provider
      value={{
        docData,
        setDocData,
        activeView,
        setActiveView,
        isProcessing,
        setIsProcessing,
        processingStage,
        setProcessingStage,
        summaryData,
        setSummaryData,
        topicsData,
        setTopicsData,
        mcqData,
        setMcqData,
        shortQData,
        setShortQData,
        mediumQData,
        setMediumQData,
        longQData,
        setLongQData,
        flashcardData,
        setFlashcardData,
        mockExamData,
        setMockExamData,
        resetSession,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
};

export const useStudy = () => useContext(StudyContext);
