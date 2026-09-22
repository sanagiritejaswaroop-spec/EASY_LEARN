import React from 'react';
import { KnowledgeUniverseUpload } from './KnowledgeUniverseUpload';

export const ProcessingScreen = ({ onComplete }) => {
  return <KnowledgeUniverseUpload onComplete={onComplete} />;
};

export default ProcessingScreen;
