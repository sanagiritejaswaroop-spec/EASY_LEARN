import React, { useState, useRef, useEffect } from 'react';
import { MessageSquareText, Send, Sparkles, User, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudy } from '../../context/StudyContext';
import { sendChatMessage } from '../../services/api';
import MagneticButton from '../common/MagneticButton';

export const AskNovaView = () => {
  const { docData } = useStudy();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm EASY-LEARN, your personal AI study assistant. Ask me anything about **${docData?.filename || 'your document'}**, and I'll extract precise answers grounded in your notes.`,
      followups: [
        'Summarize key topics simply',
        'What are the core concepts to master?',
        'Give me 3 potential exam questions',
        'Explain key terms for a beginner'
      ]
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
    const query = textToSend || input;
    if (!query.trim() || !docData) return;

    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await sendChatMessage(docData.file_id, query, historyPayload);

      const botMsg = {
        role: 'assistant',
        content: res.reply,
        followups: res.suggested_followups || []
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠ Sorry, I encountered an issue analyzing your document context. Please try again.',
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
            Ask EASY-LEARN — AI Document Chat
          </h2>
          <p className="text-xs text-slate-400">
            Interactive Q&A powered directly by text extracted from {docData?.filename}
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
                  : 'bg-slate-900/60 border border-slate-800 text-slate-200 rounded-tl-none space-y-3'
              }`}>
                <div className="whitespace-pre-line leading-relaxed">{msg.content}</div>

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
            <span className="font-mono animate-pulse">EASY-LEARN is querying document chunks...</span>
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
          placeholder={`Ask anything about ${docData?.filename || 'your document'}...`}
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
