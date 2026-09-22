import React from 'react';
import { KnowledgeUniverseUpload } from './KnowledgeUniverseUpload';

export const FileUpload = ({ onStartProcessing, onClose }) => {
  return <KnowledgeUniverseUpload onClose={onClose} onComplete={onStartProcessing} />;
};

export default FileUpload;
