import React, { useState, useRef, useEffect } from 'react';
import { MessageSquareText, Send, Sparkles, User, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudy } from '../../context/StudyContext';
import { sendChatMessage } from '../../services/api';
import MagneticButton from '../common/MagneticButton';

const parseInlineFormatting = (text) => {
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((chunk, idx) => {
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length >= 4) {
      return (
        <strong key={idx} className="font-bold text-white">
          {chunk.slice(2, -2)}
        </strong>
      );
    }
    if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length >= 2) {
      return (
        <code key={idx} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-[11px]">
          {chunk.slice(1, -1)}
        </code>
      );
    }
    return chunk;
  });
};

const renderFormattedMarkdown = (text) => {
  if (!text) return null;

  const codeBlockRegex = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'code',
      code: match[2].trim()
    });
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.map((part, pIdx) => {
    if (part.type === 'code') {
      return (
        <div key={pIdx} className="my-3 rounded-xl bg-slate-950 border border-slate-800/90 overflow-hidden font-mono text-xs shadow-lg">
          <div className="px-4 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex justify-between items-center">
            <span>{part.language || 'Code'}</span>
          </div>
          <pre className="p-4 overflow-x-auto text-indigo-100 leading-relaxed font-mono select-text">
            <code>{part.code}</code>
          </pre>
        </div>
      );
    }

    const lines = part.content.split('\n');
    return (
      <div key={pIdx} className="space-y-1.5">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={lIdx} className="h-1" />;

          if (line.startsWith('# ')) {
            return (
              <h1 key={lIdx} className="text-base sm:text-lg font-extrabold text-indigo-300 font-['Outfit'] mt-3 mb-1 tracking-tight">
                {parseInlineFormatting(line.slice(2))}
              </h1>
            );
          }

          if (line.startsWith('## ')) {
            return (
              <h2 key={lIdx} className="text-sm sm:text-base font-bold text-slate-100 font-['Outfit'] mt-3 mb-1 tracking-tight border-b border-slate-800/60 pb-1">
                {parseInlineFormatting(line.slice(3))}
              </h2>
            );
          }

          if (line.startsWith('### ')) {
            return (
              <h3 key={lIdx} className="text-xs sm:text-sm font-bold text-indigo-200 mt-2.5 mb-1">
                {parseInlineFormatting(line.slice(4))}
              </h3>
            );
          }

          if (/^[-*]\s+/.test(trimmed)) {
            const bulletText = trimmed.replace(/^[-*]\s+/, '');
            return (
              <div key={lIdx} className="flex items-start gap-2 pl-2 text-slate-200">
                <span className="text-indigo-400 font-bold text-sm leading-none">•</span>
                <span className="flex-1">{parseInlineFormatting(bulletText)}</span>
              </div>
            );
          }

          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={lIdx} className="flex items-start gap-2 pl-2 text-slate-200">
                <span className="font-mono text-xs font-bold text-indigo-400 min-w-[1.2rem]">{numMatch[1]}.</span>
                <span className="flex-1">{parseInlineFormatting(numMatch[2])}</span>
              </div>
            );
          }

          return (
            <p key={lIdx} className="leading-relaxed text-slate-200">
              {parseInlineFormatting(line)}
            </p>
          );
        })}
      </div>
    );
  });
};

export const AskNovaView = () => {
  const { docData } = useStudy();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: docData
        ? `Hello! I'm EASY-LEARN, your AI study assistant. Ask me anything about your studies — or ask directly about **${docData.filename}**!`
        : `Hello! I'm EASY-LEARN, your personal AI study assistant. Ask me any study question, programming concept, or upload a document to get started!`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    if (loading) return;
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({ role: m.role, content: m.content }));
      const fileId = docData?.file_id || '';
      const res = await sendChatMessage(fileId, query, historyPayload);

      const botMsg = {
        role: 'assistant',
        content: res.reply || 'The AI service is temporarily busy. Please try again in a moment.',
        followups: res.suggested_followups || []
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'The AI service is temporarily busy. Please try again in a moment.',
          followups: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
          <MessageSquareText className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            Ask EASY-LEARN — AI Study Assistant
          </h2>
          <p className="text-xs text-slate-400">
            {docData
              ? `General study assistant & document Q&A for ${docData.filename}`
              : 'General-purpose AI study assistant for all academic subjects'}
          </p>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 overflow-y-auto space-y-4">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                msg.role === 'user'
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-slate-900 border-slate-800 text-indigo-300'
              }`}>
                {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[82%] p-4 rounded-xl text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-slate-900 border border-slate-700/80 text-slate-100 rounded-tr-none'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-200 rounded-tl-none space-y-2'
              }`}>
                <div className="leading-relaxed">{renderFormattedMarkdown(msg.content)}</div>

                {/* Follow-up chips */}
                {msg.followups && msg.followups.length > 0 && (
                  <div className="pt-3 flex flex-wrap gap-2 border-t border-slate-800/80">
                    <span className="w-full text-[10px] font-mono uppercase font-semibold text-slate-400">
                      Suggested Questions:
                    </span>
                    {msg.followups.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => handleSend(chip)}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-all text-left flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>{chip}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 text-xs text-slate-400"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
            <span className="font-mono animate-pulse">EASY-LEARN is processing your question...</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="bg-slate-950/90 p-2 rounded-xl border border-slate-800 flex items-center gap-2 shadow-lg"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={docData ? `Ask anything about ${docData.filename} or any study topic...` : 'Ask any study question, concept, or code...'}
          className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
        />

        <MagneticButton
          type="submit"
          disabled={!input.trim() || loading}
          className="p-3 rounded-lg bg-slate-100 hover:bg-white text-slate-950 disabled:opacity-40 transition-all shadow-sm"
        >
          <Send className="w-4 h-4" />
        </MagneticButton>
      </form>
    </div>
  );
};
