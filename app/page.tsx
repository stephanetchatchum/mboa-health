'use client';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };

const TRIAGE = {
  red: {
    regex: /🔴/,
    bg: 'bg-red-600',
    showCta: true,
    label: { en: 'GO TO A CLINIC NOW', fr: 'VA À LA CLINIQUE MAINTENANT' },
  },
  yellow: {
    regex: /🟡/,
    bg: 'bg-amber-500',
    showCta: true,
    label: { en: 'SEE A HEALTH WORKER TODAY', fr: "VOIR UN AGENT DE SANTÉ AUJOURD'HUI" },
  },
  green: {
    regex: /🟢/,
    bg: 'bg-emerald-600',
    showCta: false,
    label: { en: 'CARE AT HOME — WATCH CLOSELY', fr: 'SOINS À LA MAISON — SURVEILLE BIEN' },
  },
};

const CTA_LABEL = { en: 'Call 114', fr: 'Appeler le 114' };
const HANDOFF_LABEL = { en: '📋 Generate summary for health worker', fr: "📋 Générer un résumé pour l'agent de santé" };
const HANDOFF_TITLE = { en: 'Health worker summary', fr: "Résumé pour l'agent de santé" };
const COPY_LABEL = { en: 'Copy', fr: 'Copier' };
const COPIED_LABEL = { en: 'Copied ✓', fr: 'Copié ✓' };
const GENERATING_LABEL = { en: 'Generating...', fr: 'Génération...' };

function detectTriage(text: string) {
  for (const t of Object.values(TRIAGE)) if (t.regex.test(text)) return t;
  return null;
}

function detectLang(text: string): 'fr' | 'en' {
  return /\b(le|la|les|de|du|des|et|est|tu|vous|ça|maintenant|au|pour|avec|dans|son|sa|mon|ma|ton|ta)\b/i.test(text) ? 'fr' : 'en';
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "Hello, I'm MBOA Health. I help caregivers know when a child under five needs medical attention. You can write to me in English, French, or Kinyarwanda. What's happening?"
  }]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || streaming) return;
    const newMessages: Message[] = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!res.ok) throw new Error('Server error');

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      setMessages(m => [...m, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value);
        setMessages(m => [...m.slice(0, -1), { role: 'assistant', content: acc }]);
      }
    } catch (err) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: "Sorry, something went wrong. Please try again."
      }]);
    } finally {
      setStreaming(false);
    }
  }

  async function generateSummary() {
    setShowSummary(true);
    setSummaryLoading(true);
    setSummary(null);
    setCopied(false);

    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      setSummary("Sorry, something went wrong. Try again.");
    } finally {
      setSummaryLoading(false);
    }
  }

  function copySummary() {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openWhatsApp() {
    if (!summary) return;
    const url = 'https://wa.me/?text=' + encodeURIComponent(summary);
    window.open(url, '_blank');
  }

  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  const triage = lastAssistant ? detectTriage(lastAssistant.content) : null;
  const lang = lastAssistant ? detectLang(lastAssistant.content) : 'en';

  return (
    <div className="min-h-screen bg-[#EAF3EE] flex justify-center">
      <div className="w-full max-w-[430px] bg-white min-h-screen flex flex-col shadow-xl relative">
        <header className="bg-[#2E7D52] text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
          <div className="w-10 h-10 rounded-full bg-white text-[#2E7D52] grid place-items-center font-bold">M</div>
          <div>
            <div className="font-semibold">MBOA Health</div>
            <div className="text-xs opacity-80">For children under 5 · Not a doctor</div>
          </div>
        </header>

        {triage && (
          <div className={triage.bg + ' text-white px-5 py-3'}>
            <div className="flex items-center justify-between font-semibold text-sm mb-2">
              <span>{triage.label[lang]}</span>
              {triage.showCta && (
                <a href="tel:114" className="bg-white/25 px-3 py-1 rounded-lg text-xs font-bold">{CTA_LABEL[lang]}</a>
              )}
            </div>
            {triage.showCta && (
              <button onClick={generateSummary} className="w-full bg-white/20 hover:bg-white/30 transition py-2 rounded-lg text-xs font-semibold">
                {HANDOFF_LABEL[lang]}
              </button>
            )}
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={'flex ' + (m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={'max-w-[80%] px-4 py-2.5 rounded-2xl leading-relaxed ' + (m.role === 'user' ? 'bg-[#2E7D52] text-white rounded-br-md whitespace-pre-wrap' : 'bg-[#C8E6D4] text-[#1A1A2E] rounded-bl-md')}>
                {m.role === 'user' ? (
                  m.content
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({children}) => <ul className="list-disc ml-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal ml-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
                      li: ({children}) => <li>{children}</li>,
                      strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                      em: ({children}) => <em className="italic">{children}</em>,
                    }}
                  >
                    {m.content || '...'}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-[#E8ECEF] flex gap-2 sticky bottom-0 bg-white">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Describe what's happening with the child..."
            disabled={streaming}
            className="flex-1 px-4 py-3 rounded-2xl border border-[#E8ECEF] focus:outline-none focus:border-[#2E7D52] text-[#1A1A2E]"
          />
          <button onClick={send} disabled={streaming || !input.trim()} className="bg-[#2E7D52] text-white px-5 rounded-2xl font-semibold disabled:opacity-50">
            Send
          </button>
        </div>

        {showSummary && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-[400px] w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg text-[#1A1A2E]">{HANDOFF_TITLE[lang]}</h2>
                <button onClick={() => setShowSummary(false)} className="text-3xl leading-none text-slate-400 hover:text-slate-700">×</button>
              </div>

              {summaryLoading ? (
                <div className="text-center py-10 text-slate-500 text-sm">{GENERATING_LABEL[lang]}</div>
              ) : summary ? (
                <>
                  <div className="bg-[#EAF3EE] border border-[#C8E6D4] rounded-xl p-4 whitespace-pre-wrap text-sm text-[#1A1A2E] font-mono leading-relaxed">
                    {summary}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={copySummary} className="flex-1 bg-[#2E7D52] text-white py-2.5 rounded-xl font-semibold text-sm">
                      {copied ? COPIED_LABEL[lang] : COPY_LABEL[lang]}
                    </button>
                    <button onClick={openWhatsApp} className="flex-1 bg-green-500 hover:bg-green-600 transition text-white py-2.5 rounded-xl font-semibold text-sm">
                      WhatsApp
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}