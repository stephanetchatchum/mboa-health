'use client';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string; image?: string };
type Lang = 'en' | 'fr';

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

const SUBTITLE = { en: 'For children under 5 · Not a doctor', fr: 'Enfants de moins de 5 ans · Pas un médecin' };
const CTA_LABEL = { en: 'Call 114', fr: 'Appeler le 114' };
const HANDOFF_LABEL = { en: 'Generate summary for health worker', fr: "Générer un résumé pour l'agent de santé" };
const HANDOFF_TITLE = { en: 'Health worker summary', fr: "Résumé pour l'agent de santé" };
const COPY_LABEL = { en: 'Copy', fr: 'Copier' };
const COPIED_LABEL = { en: 'Copied ✓', fr: 'Copié ✓' };
const GENERATING_LABEL = { en: 'Generating...', fr: 'Génération...' };
const LISTENING_HINT = { en: 'Listening...', fr: "Je t'écoute..." };
const PLACEHOLDER = { en: 'Message MBOA Health...', fr: 'Message à MBOA Health...' };
const PLACEHOLDER_IMG = { en: 'Add a message (optional)...', fr: 'Ajoute un message (facultatif)...' };
const IMG_ATTACHED = { en: 'Image attached', fr: 'Image jointe' };
const IMG_TOO_LARGE = { en: 'Image too large (max 5MB)', fr: 'Image trop grande (max 5 Mo)' };
const ADD_PHOTO = { en: 'Add photo', fr: 'Ajouter une photo' };
const LISTEN_LABEL = { en: 'Listen', fr: 'Écouter' };
const STOP_LABEL = { en: 'Stop', fr: 'Arrêter' };
const ERROR_GENERIC = { en: 'Sorry, something went wrong. Please try again.', fr: "Désolé, quelque chose a mal tourné. Réessaye." };
const ERROR_MIC = { en: 'Voice input is not supported in this browser. Try Chrome or Edge.', fr: "L'entrée vocale n'est pas supportée dans ce navigateur. Essaie Chrome ou Edge." };
const WELCOME = {
  en: "Hi 👋 What's happening with the child today?",
  fr: "Salut 👋 Que se passe-t-il avec l'enfant aujourd'hui ?"
};
const HERO_TAGLINE = { en: 'A calm voice in worried moments.', fr: 'Une voix calme dans les moments inquiets.' };
const HERO_DESCRIPTION = {
  en: 'I help caregivers in Africa know when a child under 5 needs medical care — written, spoken, or shown to me in a photo.',
  fr: "J'aide les soignants en Afrique à savoir quand un enfant de moins de 5 ans a besoin de soins — par écrit, en parlant, ou en photo."
};
const BEGIN_LABEL = { en: 'Begin', fr: 'Commencer' };
const TRUST_NOTICE = {
  en: 'Not a doctor. For emergencies, call 114 directly.',
  fr: 'Pas un médecin. Pour une urgence, appelle directement le 114.'
};
const STAT_LABEL = {
  en: '2.3M children under 5 die in sub-Saharan Africa each year — most from causes where early recognition saves lives.',
  fr: "2,3 millions d'enfants de moins de 5 ans meurent en Afrique subsaharienne chaque année — la plupart de causes où la reconnaissance précoce sauve des vies."
};
const ABOUT_LINK = { en: 'About MBOA Health', fr: 'À propos de MBOA Health' };
const EVIDENCE_LABEL = { en: 'Based on WHO IMCI', fr: 'Basé sur OMS IMCI' };
const NEW_CASE_LABEL = { en: 'Start new case', fr: 'Nouveau cas' };
const IMCI_URL = 'https://www.who.int/teams/maternal-newborn-child-adolescent-health-and-ageing/child-health/integrated-management-of-childhood-illness';

const ABOUT_CONTENT = {
  en: {
    title: 'About MBOA Health',
    whatItIs: 'What this is',
    whatItIsText: "MBOA Health is a companion for caregivers — older siblings, young mothers, grandmothers — caring for children under 5. It helps recognize when a child needs medical care and how urgently. It's grounded in the World Health Organization's Integrated Management of Childhood Illness (IMCI) framework, the same protocol used by community health workers across Africa.",
    whatItDoesNot: 'What it does NOT do',
    notList: [
      'Diagnose conditions',
      'Prescribe medicine or doses',
      'Replace a doctor, clinic, or community health worker',
      'Handle illness in adults or children over 5',
      'Store conversations, names, or personal data',
    ],
    privacy: 'Privacy by design',
    privacyText: "We never ask for the child's name, the caregiver's name, or any personally identifying information. We don't require accounts. We don't store conversations. The only personal detail we ask about is the child's age — because different danger signs apply at different ages. In emergencies, asking for a name wastes time we don't have.",
    sourceLink: 'Read the WHO IMCI protocol →',
    credit: 'Built for the Claude Builder Club Hackathon · African Leadership University · Kigali, 2026',
  },
  fr: {
    title: 'À propos de MBOA Health',
    whatItIs: "Ce que c'est",
    whatItIsText: "MBOA Health est un compagnon pour les soignants — grands frères, grandes sœurs, jeunes mères, grand-mères — qui s'occupent d'enfants de moins de 5 ans. Il aide à reconnaître quand un enfant a besoin de soins médicaux et avec quelle urgence. Il est basé sur le cadre IMCI de l'Organisation Mondiale de la Santé, le même protocole utilisé par les agents de santé communautaire à travers l'Afrique.",
    whatItDoesNot: 'Ce qu\'il ne fait PAS',
    notList: [
      'Diagnostiquer des maladies',
      'Prescrire des médicaments ou des doses',
      'Remplacer un médecin, une clinique ou un agent de santé',
      'Traiter les adultes ou les enfants de plus de 5 ans',
      'Conserver les conversations, les noms ou les données personnelles',
    ],
    privacy: 'Confidentialité par conception',
    privacyText: "Nous ne demandons jamais le nom de l'enfant, ni celui du soignant, ni aucune information personnelle. Nous n'avons pas de comptes. Nous ne stockons pas les conversations. Le seul détail personnel que nous demandons est l'âge de l'enfant — parce que les signes de danger varient selon l'âge. En cas d'urgence, demander un nom fait perdre un temps que nous n'avons pas.",
    sourceLink: 'Lire le protocole IMCI de l\'OMS →',
    credit: 'Construit pour le hackathon Claude Builder Club · African Leadership University · Kigali, 2026',
  },
};

function detectTriage(text: string) {
  for (const t of Object.values(TRIAGE)) if (t.regex.test(text)) return t;
  return null;
}

function detectLangFromText(text: string): Lang {
  return /\b(le|la|les|de|du|des|et|est|tu|vous|ça|maintenant|au|pour|avec|dans|son|sa|mon|ma|ton|ta)\b/i.test(text) ? 'fr' : 'en';
}

function stripForSpeech(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/[🔴🟡🟢🧡💚❤️💛🩷👋]/g, '')
    .replace(/^[-•]\s+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/_{1,2}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// SVG icons
const IconPlus = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>);
const IconMic = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>);
const IconSend = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>);
const IconImage = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>);
const IconPhone = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>);
const IconClipboard = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>);
const IconSpeaker = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>);
const IconStop = () => (<svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>);
const IconX = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const IconArrowRight = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>);
const IconArrowLeft = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>);
const IconInfo = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>);
const IconRefresh = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>);

export default function Chat() {
  const [lang, setLang] = useState<Lang>('en');
  const [started, setStarted] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: WELCOME.en }]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [image, setImage] = useState<{ dataUrl: string; mediaType: string } | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const browserLang = (navigator.language || 'en').toLowerCase();
      if (browserLang.startsWith('fr')) setLang('fr');
    }
  }, []);

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant' && !prev[0].image) {
        return [{ role: 'assistant', content: WELCOME[lang] }];
      }
      return prev;
    });
  }, [lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    }
    if (showAttachMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachMenu]);

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
      setImage({ dataUrl: reader.result as string, mediaType: file.type || 'image/jpeg' });
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
      setMessages(m => [...m, { role: 'assistant', content: ERROR_GENERIC[lang] }]);
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
      setSummary(ERROR_GENERIC[lang]);
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
    if (!recognitionRef.current) { alert(ERROR_MIC[lang]); return; }
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
      return;
    }
    recognitionRef.current.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    recognitionRef.current.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((result: any) => result[0].transcript).join('');
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
    const msgLang = detectLangFromText(text);
    utterance.lang = msgLang === 'fr' ? 'fr-FR' : 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeakingId(idx);
  }

  function resetToLanding() {
    setStarted(false);
    setMessages([{ role: 'assistant', content: WELCOME[lang] }]);
    setInput('');
    setImage(null);
    setShowSummary(false);
  }

  function newCase() {
    setMessages([{ role: 'assistant', content: WELCOME[lang] }]);
    setInput('');
    setImage(null);
    setShowSummary(false);
  }

  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  const lastTriage = lastAssistant ? detectTriage(lastAssistant.content) : null;
  const aboutContent = ABOUT_CONTENT[lang];

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=DM+Sans:wght@400;500;600;700&display=swap" />

      <style>{`
        .font-display { font-family: 'Fraunces', Georgia, 'Times New Roman', serif; font-optical-sizing: auto; }
        .font-body { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
        body { font-family: 'DM Sans', system-ui, sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(3deg); } 50% { transform: translateY(-6px) rotate(3deg); } }
        .a-fade-up { animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .a-slide-down { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .a-scale-in { animation: scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .a-float { animation: float 4s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen flex justify-center font-body" style={{ background: '#FAF6F0' }}>
        <div className="w-full max-w-[430px] min-h-screen flex flex-col relative overflow-hidden">

          {!started ? (
            // =================== LANDING SCREEN ===================
            <div className="relative min-h-screen flex flex-col px-6 py-8" style={{ background: 'linear-gradient(135deg, #FAF6F0 0%, #F5EFE5 40%, #E8F0EA 100%)' }}>
              <div className="absolute top-32 -right-20 w-72 h-72 rounded-full opacity-40 blur-3xl pointer-events-none" style={{ background: '#C8E6D4' }} />
              <div className="absolute bottom-32 -left-20 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: '#F5E6D3' }} />

              <div className="flex justify-end relative z-10">
                <button
                  onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
                  className="text-xs font-bold bg-white/60 backdrop-blur-sm border border-[#E8DEC9] px-3 py-1.5 rounded-full transition hover:bg-white"
                >
                  <span className={lang === 'fr' ? 'text-[#1F5739]' : 'text-[#6B5F4F] opacity-50'}>FR</span>
                  <span className="mx-1 text-[#6B5F4F] opacity-40">|</span>
                  <span className={lang === 'en' ? 'text-[#1F5739]' : 'text-[#6B5F4F] opacity-50'}>EN</span>
                </button>
              </div>

              <div className="flex-1 flex flex-col justify-center items-center text-center relative z-10 -mt-4">
                <div className="a-float mb-7">
                  <div className="w-20 h-20 rounded-3xl shadow-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2E7D52, #1F5739)' }}>
                    <span className="font-display text-white text-5xl font-black leading-none">M</span>
                  </div>
                </div>
                <h1 className="a-fade-up font-display text-[56px] leading-[0.95] font-black text-[#1F1B16] tracking-tight mb-3" style={{ animationDelay: '0.05s' }}>
                  MBOA<br/>Health
                </h1>
                <p className="a-fade-up font-display italic text-lg text-[#6B5F4F] mb-10 max-w-xs" style={{ animationDelay: '0.15s' }}>
                  {HERO_TAGLINE[lang]}
                </p>
                <div className="a-fade-up bg-white/70 backdrop-blur-sm border border-[#E8DEC9] rounded-3xl p-6 max-w-sm w-full shadow-lg shadow-[#1F1B16]/5" style={{ animationDelay: '0.25s' }}>
                  <p className="text-[15px] text-[#1F1B16] leading-relaxed mb-5">{HERO_DESCRIPTION[lang]}</p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    <span className="bg-[#2E7D52]/10 text-[#1F5739] px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide">WHO IMCI</span>
                    <span className="bg-[#C9764B]/10 text-[#9B5A36] px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide">FR · EN</span>
                    <span className="bg-[#2E7D52]/10 text-[#1F5739] px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide">FREE</span>
                  </div>
                </div>
                <button
                  onClick={() => setStarted(true)}
                  className="a-fade-up mt-8 w-full max-w-sm bg-[#2E7D52] hover:bg-[#1F5739] text-white px-8 py-4 rounded-2xl font-bold text-base shadow-xl shadow-[#1F5739]/20 transition-all hover:-translate-y-0.5 hover:shadow-2xl flex items-center justify-center gap-2.5"
                  style={{ animationDelay: '0.35s' }}
                >
                  <span>{BEGIN_LABEL[lang]}</span>
                  <IconArrowRight />
                </button>
              </div>

              <div className="relative z-10 pt-6 space-y-2 text-center">
                <button
                  onClick={() => setShowAbout(true)}
                  className="a-fade-up text-xs text-[#1F5739] underline underline-offset-2 hover:no-underline font-medium"
                  style={{ animationDelay: '0.42s' }}
                >
                  {ABOUT_LINK[lang]}
                </button>
                <p className="a-fade-up text-xs text-[#6B5F4F] max-w-sm mx-auto leading-relaxed" style={{ animationDelay: '0.45s' }}>
                  {STAT_LABEL[lang]}
                </p>
                <p className="a-fade-up text-[11px] text-[#9B5A36] font-medium" style={{ animationDelay: '0.55s' }}>
                  {TRUST_NOTICE[lang]}
                </p>
              </div>
            </div>
          ) : (
            // =================== CHAT SCREEN ===================
            <div className="flex flex-col min-h-screen bg-white">
              <header className="px-4 py-3.5 flex items-center justify-between gap-2 sticky top-0 z-10 border-b border-[#E8DEC9]" style={{ background: 'linear-gradient(180deg, #FAF6F0 0%, #FFFFFF 100%)' }}>
                <button onClick={resetToLanding} className="w-9 h-9 rounded-full grid place-items-center text-[#1F5739] hover:bg-[#E8F0EA] transition shrink-0" title="Home">
                  <IconArrowLeft />
                </button>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-2xl grid place-items-center font-display font-black text-white text-lg shrink-0" style={{ background: 'linear-gradient(135deg, #2E7D52, #1F5739)' }}>M</div>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-[#1F1B16] text-base leading-tight">MBOA Health</div>
                    <div className="text-[11px] text-[#6B5F4F] truncate">{SUBTITLE[lang]}</div>
                  </div>
                </div>
                <button onClick={() => setShowAbout(true)} className="w-9 h-9 rounded-full grid place-items-center text-[#1F5739] hover:bg-[#E8F0EA] transition shrink-0" title="About">
                  <IconInfo />
                </button>
                <button
                  onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
                  className="text-[11px] font-bold bg-[#E8F0EA] hover:bg-[#C8E6D4] px-2.5 py-1.5 rounded-lg transition shrink-0 select-none"
                >
                  <span className={lang === 'fr' ? 'text-[#1F5739]' : 'text-[#6B5F4F] opacity-50'}>FR</span>
                  <span className="mx-1 text-[#6B5F4F] opacity-40">|</span>
                  <span className={lang === 'en' ? 'text-[#1F5739]' : 'text-[#6B5F4F] opacity-50'}>EN</span>
                </button>
              </header>

              {lastTriage && (
                <div key={lastTriage.label[lang]} className={lastTriage.bg + ' text-white px-5 py-3 a-slide-down shadow-md'}>
                  <div className="flex items-center justify-between font-semibold text-sm mb-2">
                    <span className="tracking-wide">{lastTriage.label[lang]}</span>
                    {lastTriage.showCta && (
                      <a href="tel:114" className="bg-white/25 hover:bg-white/35 transition px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                        <IconPhone />
                        {CTA_LABEL[lang]}
                      </a>
                    )}
                  </div>
                  {lastTriage.showCta && (
                    <button onClick={generateSummary} className="w-full bg-white/20 hover:bg-white/30 transition py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2">
                      <IconClipboard />
                      {HANDOFF_LABEL[lang]}
                    </button>
                  )}
                </div>
              )}

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF6F0 100%)' }}>
                {messages.map((m, i) => {
                  const messageHasTriage = m.role === 'assistant' && !!detectTriage(m.content);
                  return (
                    <div key={i} className={'flex flex-col a-fade-up ' + (m.role === 'user' ? 'items-end' : 'items-start')}>
                      <div className={
                        'max-w-[82%] px-4 py-2.5 leading-relaxed shadow-sm ' +
                        (m.role === 'user'
                          ? 'bg-[#2E7D52] text-white rounded-2xl rounded-br-md whitespace-pre-wrap'
                          : 'bg-white text-[#1F1B16] rounded-2xl rounded-bl-md border border-[#E8DEC9]')
                      }>
                        {m.image && (<img src={m.image} alt="" className="max-w-full rounded-xl mb-2 max-h-64 object-contain" />)}
                        {m.role === 'user' ? (m.content) : (
                          <ReactMarkdown
                            components={{
                              p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({children}) => <ul className="list-disc ml-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal ml-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
                              li: ({children}) => <li>{children}</li>,
                              strong: ({children}) => <strong className="font-semibold text-[#1F5739]">{children}</strong>,
                              em: ({children}) => <em className="italic">{children}</em>,
                            }}
                          >
                            {m.content || '...'}
                          </ReactMarkdown>
                        )}
                      </div>
                      {m.role === 'assistant' && m.content && !(streaming && i === messages.length - 1) && (
                        <div className="flex items-center gap-3 mt-1.5 ml-2">
                          <button onClick={() => speak(m.content, i)} className="text-[11px] opacity-50 hover:opacity-100 transition font-semibold text-[#1F5739] flex items-center gap-1.5">
                            {speakingId === i ? <IconStop /> : <IconSpeaker />}
                            {speakingId === i ? STOP_LABEL[lang] : LISTEN_LABEL[lang]}
                          </button>
                          {messageHasTriage && (
                            <a
                              href={IMCI_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] opacity-50 hover:opacity-100 transition font-semibold text-[#9B5A36] flex items-center gap-1"
                              title="Open WHO IMCI protocol"
                            >
                              {EVIDENCE_LABEL[lang]} ↗
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Contextual "new case" button after assessment */}
                {lastTriage && !streaming && (
                  <div className="flex justify-center pt-2 a-fade-up">
                    <button
                      onClick={newCase}
                      className="text-xs font-semibold text-[#1F5739] bg-white border border-[#C8E6D4] hover:bg-[#E8F0EA] px-4 py-2 rounded-full transition flex items-center gap-2 shadow-sm"
                    >
                      <IconRefresh />
                      {NEW_CASE_LABEL[lang]}
                    </button>
                  </div>
                )}
              </div>

              <div className="px-3 pt-2.5 pb-3 border-t border-[#E8DEC9] sticky bottom-0 bg-white space-y-2">
                {recording && (
                  <div className="text-center text-xs text-red-600 font-semibold animate-pulse a-fade-up">{LISTENING_HINT[lang]}</div>
                )}
                {image && (
                  <div className="flex items-center gap-2 p-2 bg-[#FAF6F0] border border-[#E8DEC9] rounded-2xl a-fade-up">
                    <img src={image.dataUrl} alt="" className="w-12 h-12 object-cover rounded-xl" />
                    <span className="flex-1 text-xs text-[#6B5F4F] font-medium">{IMG_ATTACHED[lang]}</span>
                    <button onClick={() => setImage(null)} className="text-[#6B5F4F] hover:text-red-500 p-1 transition">
                      <IconX />
                    </button>
                  </div>
                )}
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" capture="environment" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <div className="flex gap-2 items-center">
                  <div className="relative shrink-0" ref={attachMenuRef}>
                    <button
                      onClick={() => setShowAttachMenu(s => !s)}
                      disabled={streaming}
                      className={'w-10 h-10 rounded-full grid place-items-center transition ' + (showAttachMenu ? 'bg-[#2E7D52] text-white rotate-45' : 'bg-[#E8F0EA] hover:bg-[#C8E6D4] text-[#1F5739]')}
                      style={{ transitionProperty: 'transform, background-color, color' }}
                      title="Attach"
                    >
                      <IconPlus />
                    </button>
                    {showAttachMenu && (
                      <div className="absolute bottom-full mb-2 left-0 bg-white shadow-2xl rounded-2xl py-1.5 border border-[#E8DEC9] min-w-[180px] z-20 a-scale-in origin-bottom-left">
                        <button
                          onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                          className="w-full px-4 py-2.5 hover:bg-[#FAF6F0] flex items-center gap-3 text-sm text-[#1F1B16] transition"
                        >
                          <span className="text-[#2E7D52]"><IconImage /></span>
                          <span className="font-medium">{ADD_PHOTO[lang]}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send()}
                    placeholder={recording ? LISTENING_HINT[lang] : (image ? PLACEHOLDER_IMG[lang] : PLACEHOLDER[lang])}
                    disabled={streaming}
                    className="flex-1 px-4 py-2.5 rounded-full border border-[#E8DEC9] focus:outline-none focus:border-[#2E7D52] focus:ring-2 focus:ring-[#2E7D52]/10 text-[#1F1B16] min-w-0 text-sm bg-[#FAF6F0]/50"
                  />

                  <button
                    onClick={toggleRecording}
                    disabled={streaming}
                    className={'w-10 h-10 rounded-full grid place-items-center transition shrink-0 ' + (recording ? 'bg-red-500 animate-pulse text-white' : 'bg-[#E8F0EA] hover:bg-[#C8E6D4] text-[#1F5739]')}
                    title="Voice input"
                  >
                    <IconMic />
                  </button>

                  <button
                    onClick={send}
                    disabled={streaming || (!input.trim() && !image)}
                    className="bg-[#2E7D52] hover:bg-[#1F5739] text-white w-10 h-10 rounded-full grid place-items-center shrink-0 disabled:opacity-40 transition shadow-md shadow-[#1F5739]/20"
                    title="Send"
                  >
                    <IconSend />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Summary modal */}
          {showSummary && (
            <div className="fixed inset-0 bg-[#1F1B16]/60 flex items-center justify-center p-4 z-50 a-fade-up backdrop-blur-sm">
              <div className="bg-white rounded-3xl max-w-[400px] w-full p-5 space-y-4 shadow-2xl a-scale-in">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-lg text-[#1F1B16]">{HANDOFF_TITLE[lang]}</h2>
                  <button onClick={() => setShowSummary(false)} className="text-[#6B5F4F] hover:text-[#1F1B16] p-1 transition">
                    <IconX />
                  </button>
                </div>
                {summaryLoading ? (
                  <div className="text-center py-12 text-[#6B5F4F] text-sm">
                    <div className="inline-block h-6 w-6 rounded-full border-2 border-[#2E7D52] border-t-transparent animate-spin mb-3"></div>
                    <div>{GENERATING_LABEL[lang]}</div>
                  </div>
                ) : summary ? (
                  <>
                    <div className="bg-[#FAF6F0] border border-[#E8DEC9] rounded-2xl p-4 whitespace-pre-wrap text-sm text-[#1F1B16] font-mono leading-relaxed">{summary}</div>
                    <div className="flex gap-2">
                      <button onClick={copySummary} className="flex-1 bg-[#2E7D52] hover:bg-[#1F5739] text-white py-2.5 rounded-xl font-semibold text-sm transition">
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

          {/* About modal */}
          {showAbout && (
            <div className="fixed inset-0 bg-[#1F1B16]/60 flex items-center justify-center p-4 z-50 a-fade-up backdrop-blur-sm" onClick={() => setShowAbout(false)}>
              <div className="bg-white rounded-3xl max-w-[420px] w-full p-6 space-y-5 shadow-2xl a-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-2xl text-[#1F1B16]">{aboutContent.title}</h2>
                  <button onClick={() => setShowAbout(false)} className="text-[#6B5F4F] hover:text-[#1F1B16] p-1 transition">
                    <IconX />
                  </button>
                </div>

                <div>
                  <h3 className="font-display font-bold text-sm text-[#1F5739] mb-2 uppercase tracking-wider">{aboutContent.whatItIs}</h3>
                  <p className="text-sm text-[#1F1B16] leading-relaxed">{aboutContent.whatItIsText}</p>
                </div>

                <div>
                  <h3 className="font-display font-bold text-sm text-[#9B5A36] mb-2 uppercase tracking-wider">{aboutContent.whatItDoesNot}</h3>
                  <ul className="text-sm text-[#1F1B16] space-y-1.5 list-disc ml-5">
                    {aboutContent.notList.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>

                <div>
                  <h3 className="font-display font-bold text-sm text-[#1F5739] mb-2 uppercase tracking-wider">{aboutContent.privacy}</h3>
                  <p className="text-sm text-[#1F1B16] leading-relaxed">{aboutContent.privacyText}</p>
                </div>

                <a
                  href={IMCI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center py-3 text-xs font-bold text-[#1F5739] bg-[#E8F0EA] hover:bg-[#C8E6D4] rounded-xl transition uppercase tracking-wider"
                >
                  {aboutContent.sourceLink}
                </a>

                <div className="pt-3 border-t border-[#E8DEC9]">
                  <p className="text-[11px] text-[#6B5F4F] text-center leading-relaxed">{aboutContent.credit}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}