"use client";

import { useMemo, useState } from "react";
import { businesses, questions, type Business } from "./data";
import { BusinessCard } from "./components/BusinessCard";
import { Gallery } from "./components/Gallery";
import { ReviewModal } from "./components/ReviewModal";
import { Reveal } from "./components/Reveal";
import { HelpAssistant } from "./components/HelpAssistant";
import { IdleNudge } from "./components/IdleNudge";

export default function Home() {
  const [query,setQuery]=useState("כלנית");
  const [locationEnabled,setLocationEnabled]=useState(false);
  const [selected,setSelected]=useState<Business|null>(null);
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState<string[]>(Array(questions.length).fill(""));
  const [files,setFiles]=useState<File[]>([]);
  const [submitting,setSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [stuckOnReview,setStuckOnReview]=useState(false);
  const results=useMemo(()=>{const q=query.trim().toLowerCase();return !q?businesses:businesses.filter(b=>[b.name,b.type,b.area,...b.tags].join(" ").toLowerCase().includes(q))},[query]);
  function openReview(b:Business){setSelected(b);setStep(0);setAnswers(Array(questions.length).fill(""));setFiles([]);setSubmitted(false);setStuckOnReview(false)}
  function closeReview(){setSelected(null);setStuckOnReview(false)}
  function bumpStep(fn:(s:number)=>number){setStuckOnReview(false);setStep(fn)}
  function bumpAnswers(fn:(a:string[])=>string[]){setStuckOnReview(false);setAnswers(fn)}
  async function submitReview(){if(!selected)return;setSubmitting(true);const form=new FormData();form.set("businessId",selected.id);form.set("businessName",selected.name);form.set("answers",JSON.stringify(answers));files.forEach(f=>form.append("evidence",f));try{await fetch("/api/reviews",{method:"POST",body:form})}finally{setSubmitting(false);setSubmitted(true)}}

  return <main dir="rtl">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">R</span><span>RealityScore</span><small>מה הובטח. מה קיבלת.</small></a><nav><a href="#results">מקומות</a><a href="#gallery">גלריה</a><a href="#method">איך זה עובד</a><button className="ghost-button" onClick={()=>results[0]&&openReview(results[0])}>כתיבת ביקורת</button></nav></header>
    <section className="hero" id="top">
      <div className="hero-copy"><div className="eyebrow"><span/> פיילוט פעיל: מושב כלנית</div><h1>אל תבחר לפי כוכבים.<br/><em>בחר לפי המציאות.</em></h1><p>מנוע אמון מקומי שמחבר בין מקורות, מאמת ביקורים ובודק מה העסק הבטיח מול מה שהאורחים קיבלו בפועל.</p>
        <div className="search-shell"><label htmlFor="place-search">חיפוש יישוב, עיר או עסק</label><div className="search-row"><span className="search-icon">⌕</span><input id="place-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="לדוגמה: כלנית, טבריה, צימר..."/><a href="#results">חיפוש</a></div></div>
        <button className={`location ${locationEnabled?"active":""}`} onClick={()=>setLocationEnabled(true)}><span>{locationEnabled?"✓":"◎"}</span>{locationEnabled?"המיקום אושר — נמצא מקומות סביבך":"אפשר מיקום וזיהוי אוטומטי של המקום"}</button>
      </div>
      <aside className="trust-card"><div className="live-chip">ביקור מאומת</div><h2>המערכת זיהתה שאתה בכלנית</h2><p>נמצאו 3 מתחמים בטווח הקרוב. נאשר את המקום בלי לשמור את מסלול הנסיעה שלך.</p><div className="nearby-place"><img src={businesses[0].image} alt="מתחם אירוח כפרי"/><div><strong>כלנית ריזורט</strong><span>כ־42 מטר ממיקומך</span></div><b>88</b></div><div className="signal-grid"><div><strong>76%</strong><span>ביקורים מאומתים</span></div><div><strong>91%</strong><span>טיפול בבעיות</span></div><div><strong>↑ 6</strong><span>מגמה חודשית</span></div></div><button onClick={()=>openReview(businesses[0])}>כן, הייתי כאן — לדירוג חכם</button><small>מיקום מדויק נמחק לאחר יצירת הוכחת הביקור</small></aside>
    </section>
    <section className="results-section" id="results">
      <Reveal><div className="section-heading"><div><span className="eyebrow">מפת האמון המקומית</span><h2>מקומות ב{query||"אזור שבחרת"}</h2></div><p>{results.length} תוצאות ראשונות · נתוני הפיילוט דורשים אימות מקורות</p></div></Reveal>
      <div className="business-grid">
        {results.map((b,i)=><Reveal key={b.id} delay={i*80}><BusinessCard business={b} onOpen={openReview}/></Reveal>)}
        {!results.length&&<div className="empty"><strong>עוד לא מצאנו תוצאה מדויקת</strong><p>אפשר להציע עסק חדש, והוא ייכנס לתור אימות המקורות.</p></div>}
      </div>
    </section>
    <Gallery/>
    <section className="method" id="method">
      <Reveal><div><span className="eyebrow">לא עוד ממוצע כוכבים</span><h2>שלוש שכבות של אמת</h2></div></Reveal>
      <div className="method-grid">
        <Reveal><article><span>01</span><h3>איפה באמת היית?</h3><p>מיקום, זמן שהייה, קבלה או QR יוצרים הוכחת ביקור פרטית ומונעים דירוגים מרחוק.</p></article></Reveal>
        <Reveal delay={100}><article><span>02</span><h3>הבטחה מול מציאות</h3><p>הבוט שואל על הבריכה, המחיר, הפרטיות והשירות לפי ההבטחות שהמקום עצמו פרסם.</p></article></Reveal>
        <Reveal delay={200}><article><span>03</span><h3>האם העסק פתר?</h3><p>תגובה מהירה ותיקון אמיתי משפרים את הציון. עסק לא יכול לשלם כדי למחוק ביקורת.</p></article></Reveal>
      </div>
    </section>
    {selected&&!submitted&&<IdleNudge key={`${step}:${answers.join("|")}`} delayMs={20000} onIdle={()=>setStuckOnReview(true)}/>}
    <HelpAssistant nudge={stuckOnReview}/>
    {selected&&<ReviewModal selected={selected} step={step} setStep={bumpStep} answers={answers} setAnswers={bumpAnswers} files={files} setFiles={setFiles} submitting={submitting} submitted={submitted} submitReview={submitReview} onClose={closeReview}/>}
  </main>
}
