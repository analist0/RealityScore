"use client";
import { questions, type Business } from "../data";

export function ReviewModal({ selected, step, setStep, answers, setAnswers, files, setFiles, submitting, submitted, submitReview, onClose }: {
  selected: Business;
  step: number;
  setStep: (fn: (s: number) => number) => void;
  answers: string[];
  setAnswers: (fn: (a: string[]) => string[]) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  submitting: boolean;
  submitted: boolean;
  submitReview: () => void;
  onClose: () => void;
}) {
  const draft = `ביקרתי ב${selected.name}. ${answers.filter(Boolean).join(" ")}`;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="review-modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        {!submitted ? <>
          <div className="modal-head"><span>ביקורת חכמה · {step + 1} מתוך {questions.length + 1}</span><h2>{selected.name}</h2><div className="progress"><i style={{ width: `${((step + 1) / (questions.length + 1)) * 100}%` }} /></div></div>
          {step < questions.length ? <div className="question">
            <h3>{questions[step]}</h3>
            <p>אפשר לכתוב חופשי. בהמשך נוסיף גם הקלטה קולית ותמלול.</p>
            <textarea autoFocus value={answers[step]} onChange={e => setAnswers(a => a.map((v, i) => i === step ? e.target.value : v))} placeholder="ספר לנו בקצרה ובמילים שלך..." />
            <div className="modal-actions"><button disabled={step === 0} onClick={() => setStep(s => s - 1)}>חזרה</button><button className="primary" onClick={() => setStep(s => s + 1)}>המשך</button></div>
          </div> : <div className="question final-step">
            <h3>הוספת הוכחות ואישור הנוסח</h3>
            <label className="upload-box">
              <input type="file" multiple accept="image/*" onChange={e => setFiles(Array.from(e.target.files ?? []))} />
              <span>＋</span><strong>העלאת תמונות או צילום קבלה</strong><small>{files.length ? `${files.length} קבצים נבחרו` : "הקבצים נשמרים באופן פרטי עד לאישור הפרסום"}</small>
            </label>
            <div className="draft"><span>הבוט ניסח עבורך</span><p>{draft}</p></div>
            <div className="modal-actions"><button onClick={() => setStep(s => s - 1)}>חזרה</button><button className="primary" disabled={submitting} onClick={submitReview}>{submitting ? "שומר..." : "שמירת הביקורת לבדיקה"}</button></div>
          </div>}
        </> : <div className="success">
          <span>✓</span><h2>הביקורת התקבלה</h2><p>המערכת תשמור את הראיות בנפרד, תטשטש מידע אישי ותעביר את הנוסח לבדיקת פרסום.</p><button onClick={onClose}>סיום</button>
        </div>}
      </section>
    </div>
  );
}
