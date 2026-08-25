"use client";
import { useEffect, useRef, useState } from "react";

const SYSTEM_PROMPT =
  "אתה עוזר שימוש קצר לאתר RealityScore. ענה רק על שאלות ניווט ושימוש באתר עצמו (איך לחפש, איך לכתוב ביקורת, איך להעלות תמונות) בעברית, בקצרה. אל תמציא מידע על עסקים או ציונים.";

type Message = { role: "assistant" | "user"; text: string };

type MinimalSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => MinimalSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => MinimalSpeechRecognition; webkitSpeechRecognition?: new () => MinimalSpeechRecognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "he-IL";
  window.speechSynthesis.speak(utterance);
}

// Fallback help only — a quiet corner control that becomes noticeable
// (`nudge`) when the caller detects the user seems stuck, never a primary
// UI element. Voice input/output are progressive enhancements: the panel
// works with typed questions alone when Web Speech isn't available.
export function HelpAssistant({ nudge }: { nudge: boolean }) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const speechSupported = typeof window !== "undefined" && getSpeechRecognition() !== null;

  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  async function ask(question: string) {
    if (pending) return;
    const text = question.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, system: SYSTEM_PROMPT, scope: "help" }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!data.reply) console.error("assistant error:", data.error);
      const reply = data.reply ?? "לא הצלחתי לענות כרגע, נסו שוב עוד רגע.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
      speak(reply);
    } catch {
      const reply = "יש בעיית תקשורת. נסו שוב עוד רגע.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } finally {
      setPending(false);
    }
  }

  function startListening() {
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "he-IL";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) ask(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <div className={`help-assistant${nudge ? " nudge" : ""}`}>
      {open && (
        <section className="help-panel" role="dialog" aria-label="עזרה בשימוש באתר">
          <header><strong>עזרה מהירה</strong><button className="close" onClick={() => setOpen(false)}>×</button></header>
          <p className="help-scope-note">עוזר זה עונה רק על שאלות ניווט ושימוש באתר.</p>
          <div className="help-log">
            {messages.length === 0 && <p className="help-empty">שאלו אותי בקול או בכתב איך להשתמש באתר — למשל &quot;איך כותבים ביקורת?&quot;</p>}
            {messages.map((m, i) => <div key={i} className={`help-msg ${m.role}`}>{m.text}</div>)}
            {pending && <div className="help-msg assistant pending">חושב...</div>}
          </div>
          <div className="help-input-row">
            {speechSupported && <button type="button" className={`mic ${listening ? "listening" : ""}`} onClick={startListening} disabled={listening} aria-label="שאלה בקול">🎤</button>}
            <input value={input} disabled={pending} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(input); }} placeholder="הקלידו שאלה על השימוש באתר..." />
            <button type="button" className="primary" onClick={() => ask(input)} disabled={pending}>שלח</button>
          </div>
        </section>
      )}
      <button type="button" className="help-fab" onClick={() => setOpen((v) => !v)} aria-label="עזרה">
        {nudge && !open ? "נתקעת? 🤔" : "?"}
      </button>
    </div>
  );
}
