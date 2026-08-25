"use client";

import { useMemo, useState } from "react";
import { HelpAssistant } from "./components/HelpAssistant";
import { IdleNudge } from "./components/IdleNudge";

type Business = { id:string; name:string; type:string; area:string; score:number; verified:number; reviews:number; promise:string; tags:string[]; image:string };

const businesses: Business[] = [
  { id:"kalanit-resort", name:"כלנית ריזורט", type:"מתחם אירוח", area:"כלנית", score:88, verified:76, reviews:34, promise:"בריכה מחוממת, אירוח למשפחות ומרחב משותף", tags:["משפחות","בריכה","שומרי שבת"], image:"https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80" },
  { id:"olmeya", name:"עולמיה — Olmaya", type:"סוויטות לזוגות", area:"כלנית", score:94, verified:91, reviews:48, promise:"פרטיות מלאה ובריכה פרטית לכל סוויטה", tags:["זוגות","פרטיות","בריכה פרטית"], image:"https://images.unsplash.com/photo-1601918774946-25832a4be0d6?auto=format&fit=crop&w=1000&q=80" },
  { id:"shetach-galili", name:"שטח גלילי", type:"אטרקציות שטח", area:"כלנית", score:91, verified:84, reviews:57, promise:"רייזרים מתוחזקים, תדריך בטיחות ומסלולים למשפחות", tags:["משפחות","רייזרים","קבוצות"], image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80" },
];

const questions = ["האם המקום נראה כמו בתמונות?","מה הובטח לך לפני ההזמנה?","מה קיבלת בפועל?","האם היו תשלומים או תנאים שלא נאמרו מראש?","האם פנית לבעל העסק, ואיך הוא טיפל בבעיה?"];

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
  function openReview(b:Business){setSelected(b);setStep(0);setSubmitted(false);setStuckOnReview(false)}
  function closeReview(){setSelected(null);setStuckOnReview(false)}
  function goToStep(fn:(s:number)=>number){setStuckOnReview(false);setStep(fn)}
  function editAnswer(i:number,value:string){setStuckOnReview(false);setAnswers(a=>a.map((v,idx)=>idx===i?value:v))}
  async function submitReview(){if(!selected)return;setSubmitting(true);const form=new FormData();form.set("businessId",selected.id);form.set("businessName",selected.name);form.set("answers",JSON.stringify(answers));files.forEach(f=>form.append("evidence",f));try{await fetch("/api/reviews",{method:"POST",body:form})}finally{setSubmitting(false);setSubmitted(true)}}
  const draft=selected?`ביקרתי ב${selected.name}. ${answers.filter(Boolean).join(" ")}`:"";

  return <main dir="rtl">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">R</span><span>RealityScore</span><small>מה הובטח. מה קיבלת.</small></a><nav><a href="#results">מקומות</a><a href="#method">איך זה עובד</a><button className="ghost-button" onClick={()=>results[0]&&openReview(results[0])}>כתיבת ביקורת</button></nav></header>
    <section className="hero" id="top">
      <div className="hero-copy"><div className="eyebrow"><span/> פיילוט פעיל: מושב כלנית</div><h1>אל תבחר לפי כוכבים.<br/><em>בחר לפי המציאות.</em></h1><p>מנוע אמון מקומי שמחבר בין מקורות, מאמת ביקורים ובודק מה העסק הבטיח מול מה שהאורחים קיבלו בפועל.</p>
        <div className="search-shell"><label htmlFor="place-search">חיפוש יישוב, עיר או עסק</label><div className="search-row"><span className="search-icon">⌕</span><input id="place-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="לדוגמה: כלנית, טבריה, צימר..."/><a href="#results">חיפוש</a></div></div>
        <button className={`location ${locationEnabled?"active":""}`} onClick={()=>setLocationEnabled(true)}><span>{locationEnabled?"✓":"◎"}</span>{locationEnabled?"המיקום אושר — נמצא מקומות סביבך":"אפשר מיקום וזיהוי אוטומטי של המקום"}</button>
      </div>
      <aside className="trust-card"><div className="live-chip">ביקור מאומת</div><h2>המערכת זיהתה שאתה בכלנית</h2><p>נמצאו 3 מתחמים בטווח הקרוב. נאשר את המקום בלי לשמור את מסלול הנסיעה שלך.</p><div className="nearby-place"><img src={businesses[0].image} alt="מתחם אירוח כפרי"/><div><strong>כלנית ריזורט</strong><span>כ־42 מטר ממיקומך</span></div><b>88</b></div><div className="signal-grid"><div><strong>76%</strong><span>ביקורים מאומתים</span></div><div><strong>91%</strong><span>טיפול בבעיות</span></div><div><strong>↑ 6</strong><span>מגמה חודשית</span></div></div><button onClick={()=>openReview(businesses[0])}>כן, הייתי כאן — לדירוג חכם</button><small>מיקום מדויק נמחק לאחר יצירת הוכחת הביקור</small></aside>
    </section>
    <section className="results-section" id="results"><div className="section-heading"><div><span className="eyebrow">מפת האמון המקומית</span><h2>מקומות ב{query||"אזור שבחרת"}</h2></div><p>{results.length} תוצאות ראשונות · נתוני הפיילוט דורשים אימות מקורות</p></div><div className="business-grid">{results.map(b=><article className="business-card" key={b.id}><div className="photo-wrap"><img src={b.image} alt={`${b.type} — תמונת אווירה`}/><span>{b.type}</span><div className="score"><strong>{b.score}</strong><small>RealityScore</small></div></div><div className="business-body"><div className="business-title"><div><h3>{b.name}</h3><p>⌖ {b.area}</p></div><span className="verified">✓ אומת ממקורות</span></div><p className="promise"><b>הבטחה מרכזית:</b> {b.promise}</p><div className="tags">{b.tags.map(t=><span key={t}>{t}</span>)}</div><div className="metrics"><span><b>{b.verified}%</b> ביקורים מאומתים</span><span><b>{b.reviews}</b> דיווחים</span></div><button onClick={()=>openReview(b)}>הייתי כאן — מתחילים בדקה</button></div></article>)}{!results.length&&<div className="empty"><strong>עוד לא מצאנו תוצאה מדויקת</strong><p>אפשר להציע עסק חדש, והוא ייכנס לתור אימות המקורות.</p></div>}</div></section>
    <section className="method" id="method"><div><span className="eyebrow">לא עוד ממוצע כוכבים</span><h2>שלוש שכבות של אמת</h2></div><div className="method-grid"><article><span>01</span><h3>איפה באמת היית?</h3><p>מיקום, זמן שהייה, קבלה או QR יוצרים הוכחת ביקור פרטית ומונעים דירוגים מרחוק.</p></article><article><span>02</span><h3>הבטחה מול מציאות</h3><p>הבוט שואל על הבריכה, המחיר, הפרטיות והשירות לפי ההבטחות שהמקום עצמו פרסם.</p></article><article><span>03</span><h3>האם העסק פתר?</h3><p>תגובה מהירה ותיקון אמיתי משפרים את הציון. עסק לא יכול לשלם כדי למחוק ביקורת.</p></article></div></section>
    {selected&&!submitted&&<IdleNudge key={`${step}:${answers.join("|")}`} delayMs={20000} onIdle={()=>setStuckOnReview(true)}/>}
    <HelpAssistant nudge={stuckOnReview}/>
    {selected&&<div className="modal-backdrop" onMouseDown={closeReview}><section className="review-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={closeReview}>×</button>{!submitted?<><div className="modal-head"><span>ביקורת חכמה · {step+1} מתוך {questions.length+1}</span><h2>{selected.name}</h2><div className="progress"><i style={{width:`${((step+1)/(questions.length+1))*100}%`}}/></div></div>{step<questions.length?<div className="question"><h3>{questions[step]}</h3><p>אפשר לכתוב חופשי. בהמשך נוסיף גם הקלטה קולית ותמלול.</p><textarea autoFocus value={answers[step]} onChange={e=>editAnswer(step,e.target.value)} placeholder="ספר לנו בקצרה ובמילים שלך..."/><div className="modal-actions"><button disabled={step===0} onClick={()=>goToStep(s=>s-1)}>חזרה</button><button className="primary" onClick={()=>goToStep(s=>s+1)}>המשך</button></div></div>:<div className="question final-step"><h3>הוספת הוכחות ואישור הנוסח</h3><label className="upload-box"><input type="file" multiple accept="image/*" onChange={e=>setFiles(Array.from(e.target.files??[]))}/><span>＋</span><strong>העלאת תמונות או צילום קבלה</strong><small>{files.length?`${files.length} קבצים נבחרו`:"הקבצים נשמרים באופן פרטי עד לאישור הפרסום"}</small></label><div className="draft"><span>הבוט ניסח עבורך</span><p>{draft}</p></div><div className="modal-actions"><button onClick={()=>goToStep(s=>s-1)}>חזרה</button><button className="primary" disabled={submitting} onClick={submitReview}>{submitting?"שומר...":"שמירת הביקורת לבדיקה"}</button></div></div>}</>:<div className="success"><span>✓</span><h2>הביקורת התקבלה</h2><p>המערכת תשמור את הראיות בנפרד, תטשטש מידע אישי ותעביר את הנוסח לבדיקת פרסום.</p><button onClick={closeReview}>סיום</button></div>}</section></div>}
  </main>
}
