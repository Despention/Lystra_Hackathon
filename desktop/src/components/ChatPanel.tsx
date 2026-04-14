import React, { useEffect, useRef, useState } from 'react';
import { IoClose, IoPaperPlane, IoChatbubbles } from 'react-icons/io5';
import { sendChatMessage } from '../services/api';
import Spinner from './Spinner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  analysisId: string;
}

export default function ChatPanel({ analysisId }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Привет! Я AI-ассистент по техническим заданиям. Задайте вопрос об этом анализе или попросите помочь улучшить конкретный раздел.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendChatMessage(analysisId, text, [...messages, userMsg]);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Ошибка при обращении к ассистенту. Попробуйте ещё раз.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button className="chat-fab" onClick={() => setOpen((v) => !v)} title="AI Ассистент">
        <IoChatbubbles size={24} />
        <span>Ассистент</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="chat-panel">
          <div className="chat-panel__header">
            <IoChatbubbles size={18} />
            <span>AI Ассистент по ТЗ</span>
            <button className="chat-panel__close" onClick={() => setOpen(false)}>
              <IoClose size={18} />
            </button>
          </div>

          <div className="chat-panel__messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-msg chat-msg--${msg.role}`}
              >
                <div className="chat-msg__bubble">{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg chat-msg--assistant">
                <div className="chat-msg__bubble chat-msg__bubble--loading">
                  <Spinner size="small" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-panel__input-row">
            <textarea
              className="chat-panel__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Задайте вопрос об анализе..."
              rows={2}
              disabled={loading}
            />
            <button
              className="chat-panel__send"
              onClick={send}
              disabled={loading || !input.trim()}
              title="Отправить"
            >
              <IoPaperPlane size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
