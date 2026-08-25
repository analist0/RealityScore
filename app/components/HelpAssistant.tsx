"use client";
import { useEffect, useRef, useState } from "react";

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
  // recognition.onresult is a long-lived callback set once in
  // startListening() — it closes over whatever `ask` (and therefore
  // `pending`) existed at that render. If a typed submission starts and
  // flips `pending` to true afterward, that stale closure's `if (pending)`
  // check still reads the old, captured value. A ref is mutated in place
  // and shared across every closure, so reading pendingRef.current instead
  // always sees the live state regardless of which render's `ask` runs.
  const pendingRef = useRef(false);
  // Same staleness problem as pendingRef, for a different closure: the
  // async ask() continuation below reads `open` from whichever render it
  // started in. If the panel is closed while a request is still pending,
  // that continuation would otherwise still speak the reply out loud after
  // the user has left. Kept in sync via the effect right below.
  const openRef = useRef(false);
  // Starts false on both server and initial client render so hydration
  // matches; the real value (browser-only) is picked up right after mount.
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    // Deferred to a microtask (not called synchronously in the effect body)
    // to satisfy this repo's react-hooks/set-state-in-effect rule, which
    // treats a same-tick setState call as a cascading-render risk even
    // when — as here — it's a one-time, mount-only capability check.
    queueMicrotask(() => {
      if (getSpeechRecognition() !== null) setSpeechSupported(true);
    });
    return () => { recognitionRef.current?.stop(); };
  }, []);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  async function ask(question: string) {
    if (pendingRef.current) return;
    const text = question.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    pendingRef.current = true;
    setPending(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, scope: "help" }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!data.reply) console.error("assistant error:", data.error);
      const reply = data.reply ?? "לא הצלחתי לענות כרגע, נסו שוב עוד רגע.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
      if (openRef.current) speak(reply);
    } catch {
      const reply = "יש בעיית תקשורת. נסו שוב עוד רגע.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  function closePanel() {
    // A transcript can still arrive after the panel is closed (recognition
    // keeps running until it's told to stop), which would otherwise fire a
    // hidden ask() and speak a reply after the user thinks they left.
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setOpen(false);
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
          <header><strong>עזרה מהירה</strong><button className="close" onClick={closePanel}>×</button></header>
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
      <button type="button" className="help-fab" onClick={() => (open ? closePanel() : setOpen(true))} aria-label="עזרה">
        {nudge && !open ? "נתקעת? 🤔" : "?"}
      </button>
    </div>
  );
}
