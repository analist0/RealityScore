"use client";
import { useState } from "react";
import { useCountUp } from "../hooks/useInView";
import { useInView } from "../hooks/useInView";
import type { Business } from "../data";

export function BusinessCard({ business, onOpen }: { business: Business; onOpen: (b: Business) => void }) {
  const [loaded, setLoaded] = useState(false);
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const score = useCountUp(business.score, inView);
  return (
    <article className="business-card" ref={ref}>
      <div className={`photo-wrap${loaded ? " loaded" : ""}`}>
        <img src={business.image} alt={`${business.type} — תמונת אווירה`} loading="lazy" onLoad={() => setLoaded(true)} />
        <span>{business.type}</span>
        <div className="score"><strong>{score}</strong><small>RealityScore</small></div>
      </div>
      <div className="business-body">
        <div className="business-title"><div><h3>{business.name}</h3><p>⌖ {business.area}</p></div><span className="verified">✓ אומת ממקורות</span></div>
        <p className="promise"><b>הבטחה מרכזית:</b> {business.promise}</p>
        <div className="tags">{business.tags.map(t => <span key={t}>{t}</span>)}</div>
        <div className="metrics"><span><b>{business.verified}%</b> ביקורים מאומתים</span><span><b>{business.reviews}</b> דיווחים</span></div>
        <button onClick={() => onOpen(business)}>הייתי כאן — מתחילים בדקה</button>
      </div>
    </article>
  );
}
