'use client';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string; image?: string };

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
const MIC_HINT = { en: 'Tap to speak', fr: 'Appuie pour parler' };
const LISTENING_HINT = { en: 'Listening...', fr: "Je t'écoute..." };
const PLACEHOLDER = { en: "Describe what's happening...", fr: "Décris ce qui se passe..." };
const PLACEHOLDER_IMG = { en: 'Add a message (optional)...', fr: 'Ajoute un message (facultatif)...' };
const IMG_ATTACHED = { en: 'Image attached', fr: 'Image jointe' };
const IMG_TOO_LARGE = { en: 'Image too large (max 5MB)', fr: 'Image trop grande (max 5 Mo)' };

function detectTriage(text: string) {
  for (const t of Object.values(TRIAGE)) if (t.regex.test(text)) return t;
  return null;
}

function detectLang(text: string): 'fr' | 'en' {
  return /\b(le|la|les|de|du|des|et|est|tu|vous|ça|maintenant|au|pour|avec|dans|son|sa|mon|ma|ton|ta)\b/i.test(text) ? 'fr' : 'en';
}

function stripForSpeech(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/[🔴🟡🟢🧡💚❤️💛🩷]/g, '')
    .replace(/^[-•]\s+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/_{1,2}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "Hello, I'm MBOA Health. I help caregivers know when a child under five needs medical attention. You can write, speak, or send a photo — in English or French. What's happening?"
  }]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speechLang, setSpeechLang] = useState<'fr' | 'en'>('en');
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [image, setImage] = useState<{ dataUrl: string; mediaType: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setSpeechSupported(true);
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognitionRef.current = recognition;
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(IMG_TOO_LARGE[lang]);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage({
        dataUrl: reader.result as string,
        mediaType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function send() {
    if ((!input.trim() && !image) || streaming) return;
    const userMessage: Message = {
      role: 'user',
      content: input || (image ? (lang === 'fr' ? 'Regarde cette image.' : 'Please look at this image.') : ''),
      image: image?.dataUrl,
    };
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setImage(null);
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
      setSummary('Sorry, something went wrong. Try again.');
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

  function toggleRecording() {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
      return;
    }
    recognitionRef.current.lang = speechLang === 'fr' ? 'fr-FR' : 'en-US';
    recognitionRef.current.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setInput(transcript);
    };
    recognitionRef.current.onend = () => setRecording(false);
    recognitionRef.current.onerror = () => setRecording(false);
    try {
      recognitionRef.current.start();
      setRecording(true);
    } catch (e) {
      setRecording(false);
    }
  }

  function speak(text: string, idx: number) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speakingId === idx) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    const clean = stripForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(clean);
    const msgLang = detectLang(text);
    utterance.lang = msgLang === 'fr' ? 'fr-FR' : 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeakingId(idx);
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
            <div key={i} className={'flex flex-col ' + (m.role === 'user' ? 'items-end' : 'items-start')}>
              <div className={'max-w-[80%] px-4 py-2.5 rounded-2xl leading-relaxed ' + (m.role === 'user' ? 'bg-[#2E7D52] text-white rounded-br-md whitespace-pre-wrap' : 'bg-[#C8E6D4] text-[#1A1A2E] rounded-bl-md')}>
                {m.image && (
                  <img src={m.image} alt="" className="max-w-full rounded-xl mb-2 max-h-64 object-contain" />
                )}
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
              {m.role === 'assistant' && m.content && !(streaming && i === messages.length - 1) && (
                <button
                  onClick={() => speak(m.content, i)}
                  className="text-xs mt-1 ml-2 opacity-60 hover:opacity-100 transition font-medium text-[#2E7D52]"
                  title="Read aloud"
                >
                  {speakingId === i ? '🔇 Stop' : '🔊 Listen'}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="px-3 pt-2 pb-3 border-t border-[#E8ECEF] sticky bottom-0 bg-white space-y-2">
          {recording && (
            <div className="text-center text-xs text-red-600 font-semibold animate-pulse">
              🎤 {LISTENING_HINT[speechLang]}
            </div>
          )}
          {image && (
            <div className="flex items-center gap-2 p-2 bg-[#EAF3EE] rounded-xl">
              <img src={image.dataUrl} alt="" className="w-12 h-12 object-cover rounded-lg" />
              <span className="flex-1 text-xs text-[#4A5568] font-medium">{IMG_ATTACHED[lang]}</span>
              <button
                onClick={() => setImage(null)}
                className="text-2xl text-[#4A5568] hover:text-red-500 px-2 leading-none"
              >
                ×
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex gap-2 items-center">
            {speechSupported && (
              <button
                onClick={() => setSpeechLang(l => l === 'fr' ? 'en' : 'fr')}
                className="text-xs font-bold text-[#2E7D52] px-2 py-1 rounded-lg bg-[#EAF3EE] shrink-0"
                title="Switch voice language"
              >
                {speechLang === 'fr' ? 'FR' : 'EN'}
              </button>
            )}
            {speechSupported && (
              <button
                onClick={toggleRecording}
                disabled={streaming}
                className={'w-11 h-11 rounded-full grid place-items-center transition shrink-0 ' + (recording ? 'bg-red-500 animate-pulse text-white' : 'bg-[#EAF3EE] hover:bg-[#C8E6D4] text-[#2E7D52]')}
                title={MIC_HINT[speechLang]}
              >
                <span className="text-lg">🎤</span>
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
              className="w-11 h-11 rounded-full grid place-items-center transition shrink-0 bg-[#EAF3EE] hover:bg-[#C8E6D4] text-[#2E7D52]"
              title="Send photo"
            >
              <span className="text-lg">📷</span>
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={recording ? LISTENING_HINT[speechLang] : (image ? PLACEHOLDER_IMG[lang] : PLACEHOLDER[lang])}
              disabled={streaming}
              className="flex-1 px-4 py-3 rounded-2xl border border-[#E8ECEF] focus:outline-none focus:border-[#2E7D52] text-[#1A1A2E] min-w-0"
            />
            <button
              onClick={send}
              disabled={streaming || (!input.trim() && !image)}
              className="bg-[#2E7D52] text-white px-5 rounded-2xl font-semibold disabled:opacity-50 shrink-0"
            >
              Send
            </button>
          </div>
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