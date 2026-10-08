import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  Send, 
  X, 
  ShieldAlert, 
  Copy, 
  Check, 
  Trash2, 
  Minimize2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  isSafe?: boolean;
  engine?: string;
  timestamp: string;
}

interface AIChatModalProps {
  currentAccount?: string;
}

export const AIChatModal: React.FC<AIChatModalProps> = ({ currentAccount }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `### 👁️ Vajra-Netra\nActive forensic copilot. Ask a trail question or select an action below.`,
      isSafe: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          selected_account: currentAccount || null
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'No response generated.',
        isSafe: data.is_safe !== false,
        engine: data.engine || 'vajra-netra',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ Error contacting Vajra-Netra backend: ${err.message}. Please verify the API server is active.`,
        isSafe: false,
        engine: 'error',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: 'Session reset. Ask a question or select a prompt below.',
        isSafe: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const quickPrompts = [
    { label: '📊 Trail Summary', query: 'Summarize the multi-hop money trail for this case' },
    { label: '🏛️ Freeze Notice', query: 'Draft a Section 106 and 107 BNSS freeze notice for Axis Bank' },
    { label: '🔒 Recoverable Funds', query: 'Which accounts are holding recoverable funds right now?' },
    { label: '🚨 Top Mules', query: 'Identify top money mule collector accounts in Stage 1 and Stage 2' }
  ];

  return (
    <>
      {/* 1. Floating Action Trigger Button (Bottom Right) - Themed with UI Almond & Cobalt */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Open Vajra-Netra AI Copilot (Ollama & Anti-Injection Guardrail)"
          style={{
            position: 'fixed',
            bottom: '22px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 16px',
            backgroundColor: '#FFFFFF',
            color: '#0F172A',
            border: '2px solid #D5C7B5',
            borderRadius: '9999px',
            boxShadow: '0 6px 20px rgba(84, 71, 58, 0.16), 0 2px 6px rgba(0, 0, 0, 0.04)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.04)';
            e.currentTarget.style.borderColor = '#2563EB';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.2), 0 2px 6px rgba(0, 0, 0, 0.06)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = '#D5C7B5';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(84, 71, 58, 0.16), 0 2px 6px rgba(0, 0, 0, 0.04)';
          }}
        >
          <div style={{
            position: 'relative',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#EFF6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #BFDBFE'
          }}>
            <Eye size={16} color="#2563EB" />
            <span style={{
              position: 'absolute',
              top: '-1px',
              right: '-1px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 6px #10B981',
              border: '1.5px solid #FFFFFF'
            }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A', letterSpacing: '0.01em', lineHeight: 1.2 }}>
              Vajra-Netra
            </span>
          </div>
        </button>
      )}

      {/* 2. Pop-up AI Chat Window (Bottom Right) - Warm Almond, Slate & Cobalt Theme */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '22px',
          right: '24px',
          width: '560px',
          maxWidth: 'calc(100vw - 36px)',
          height: '650px',
          maxHeight: 'calc(100vh - 44px)',
          zIndex: 10000,
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '2px solid #D5C7B5',
          boxShadow: '0 20px 45px rgba(60, 45, 30, 0.22), 0 4px 14px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {/* Header Strip */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#FAF6F0',
            borderBottom: '1.5px solid #D5C7B5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
              }}>
                <Eye size={17} color="#FFFFFF" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#0F172A', fontWeight: 800, fontSize: '0.94rem' }}>
                  Vajra-Netra
                </span>
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 600,
                  padding: '1px 7px',
                  borderRadius: '9999px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  Active
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <button
                onClick={handleClearHistory}
                title="Clear conversation"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
                onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize window"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
                onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
              >
                <Minimize2 size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
                onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Quick Action Suggestion Chips */}
          <div style={{
            display: 'flex',
            gap: '6px',
            padding: '9px 14px',
            backgroundColor: '#FAF6F0',
            borderBottom: '1px solid #E2D7C8',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.query)}
                disabled={isLoading}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  border: '1.5px solid #D5C7B5',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#1D4ED8';
                  e.currentTarget.style.borderColor = '#2563EB';
                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.borderColor = '#D5C7B5';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Message History Body */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            backgroundColor: '#FBF9F6'
          }}>
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '100%'
                }}
              >
                {/* Bubble Container */}
                <div style={{
                  position: 'relative',
                  maxWidth: '92%',
                  padding: '11px 14px',
                  borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  backgroundColor: msg.sender === 'user' 
                    ? '#2563EB' 
                    : msg.isSafe === false 
                      ? '#FEF2F2' 
                      : '#FFFFFF',
                  border: msg.sender === 'user'
                    ? '1.5px solid #1D4ED8'
                    : msg.isSafe === false
                      ? '1.5px solid #F87171'
                      : '1.5px solid #D5C7B5',
                  color: msg.sender === 'user' ? '#FFFFFF' : '#1E293B',
                  fontSize: '0.8rem',
                  lineHeight: 1.55,
                  boxShadow: msg.sender === 'user'
                    ? '0 2px 8px rgba(37, 99, 235, 0.25)'
                    : '0 2px 6px rgba(60, 45, 30, 0.05)'
                }}>
                  {/* Rejection / Injection warning badge */}
                  {msg.isSafe === false && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#DC2626',
                      fontWeight: 700,
                      marginBottom: '6px',
                      fontSize: '0.72rem'
                    }}>
                      <ShieldAlert size={14} color="#DC2626" />
                      <span>Security Guardrail Intercepted</span>
                    </div>
                  )}

                  {/* Message Content with clean heading & list formatting */}
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit' }}>
                    {msg.text.split('\n').map((line, lIdx) => {
                      if (line.startsWith('### ')) {
                        return <h4 key={lIdx} style={{ margin: '4px 0 6px 0', color: msg.sender === 'user' ? '#FFFFFF' : '#1E40AF', fontSize: '0.88rem', fontWeight: 800 }}>{line.replace('### ', '')}</h4>;
                      }
                      if (line.startsWith('#### ')) {
                        return <h5 key={lIdx} style={{ margin: '4px 0 4px 0', color: msg.sender === 'user' ? '#DBEAFE' : '#B45309', fontSize: '0.82rem', fontWeight: 700 }}>{line.replace('#### ', '')}</h5>;
                      }
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <div key={lIdx} style={{ fontWeight: 700, margin: '4px 0', color: msg.sender === 'user' ? '#FFFFFF' : '#0F172A' }}>{line.replaceAll('**', '')}</div>;
                      }
                      return <div key={lIdx}>{line}</div>;
                    })}
                  </div>

                  {/* Assistant Message Footer: Copy Button */}
                  {msg.sender === 'assistant' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      marginTop: '6px',
                      paddingTop: '4px'
                    }}>
                      <button
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        title="Copy text"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copiedId === msg.id ? '#059669' : '#94A3B8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 4px',
                          fontSize: '0.68rem',
                          fontWeight: 600
                        }}
                      >
                        {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span style={{ fontSize: '0.62rem', color: '#94A3B8', marginTop: '3px', padding: '0 4px' }}>
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Live Typing / Reasoning Animation */}
            {isLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                width: 'fit-content',
                border: '1.5px solid #D5C7B5',
                boxShadow: '0 1px 4px rgba(60, 45, 30, 0.05)'
              }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB', animation: 'pulse 1s infinite' }} />
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB', animation: 'pulse 1s infinite 0.2s' }} />
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB', animation: 'pulse 1s infinite 0.4s' }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>
                  Analyzing...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box Footer */}
          <div style={{
            padding: '12px 14px',
            backgroundColor: '#FAF6F0',
            borderTop: '1.5px solid #D5C7B5'
          }}>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask about money trail, freeze notice, or accounts..."
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1.5px solid #D5C7B5',
                  fontSize: '0.8rem',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.03)'
                }}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = '#D5C7B5')}
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                title="Send query to Vajra-Netra"
                style={{
                  padding: '9px 14px',
                  backgroundColor: inputMessage.trim() ? '#2563EB' : '#94A3B8',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: inputMessage.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.15s ease',
                  boxShadow: inputMessage.trim() ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none'
                }}
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatModal;
