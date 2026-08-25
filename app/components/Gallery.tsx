"use client";
import { useEffect, useState } from "react";
import { galleryItems, type GalleryItem } from "../data";
import { Reveal } from "./Reveal";

export function Gallery() {
  const [active, setActive] = useState<GalleryItem | null>(null);
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setActive(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
  return (
    <section className="gallery-section" id="gallery">
      <Reveal><div className="section-heading"><div><span className="eyebrow">הוכחות מהשטח</span><h2>גלריית ביקורים מאומתים</h2></div><p>תמונות וקבלות שצורפו לביקורות אמיתיות</p></div></Reveal>
      <div className="gallery-grid">
        {galleryItems.map((item, i) => (
          <Reveal key={item.id} delay={i * 70} className="gallery-tile-wrap">
            <button className="gallery-tile" onClick={() => setActive(item)}>
              <img src={item.image} alt={item.caption} loading="lazy" />
              <div className="gallery-overlay"><strong>{item.business}</strong><span>{item.caption}</span></div>
            </button>
          </Reveal>
        ))}
      </div>
      {active && <div className="lightbox-backdrop" onMouseDown={() => setActive(null)}>
        <figure className="lightbox" onMouseDown={e => e.stopPropagation()}>
          <button className="close" onClick={() => setActive(null)}>×</button>
          <img src={active.image} alt={active.caption} />
          <figcaption><strong>{active.business}</strong><span>{active.caption}</span></figcaption>
        </figure>
      </div>}
    </section>
  );
}
