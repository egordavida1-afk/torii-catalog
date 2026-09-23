"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export type HeroItem = {
  id: string;
  slug: string;
  title: string;
  posterUrl: string | null;
  backgroundUrl: string | null;
  year: number | null;
  category: string;
  type: string;
  description: string | null;
  episodes: number;
};

const fallbackPoster = "https://placehold.co/600x900/10121c/9ea4b8?text=TORII";

function categoryLabel(category: string) {
  if (category === "anime") return "Аниме";
  if (category === "cartoon") return "Мультфильмы";
  if (category === "series") return "Сериал";
  return "Фильм";
}

function typeLabel(type: string) {
  if (type === "series") return "Сериал";
  if (type === "anime") return "Аниме";
  return "Фильм";
}

export default function HeroCarousel({ items }: { items: HeroItem[] }) {
  const safeItems = useMemo(() => items.filter(Boolean).slice(0, 6), [items]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (safeItems.length <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % safeItems.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [paused, safeItems.length]);

  if (!safeItems.length) return null;

  const item = safeItems[active];
  const background = item.backgroundUrl || item.posterUrl || fallbackPoster;

  return (
    <section
      className="home-hero hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {safeItems.map((slide, index) => (
        <div
          key={slide.id}
          className={`hero-slide ${index === active ? "is-active" : ""}`}
          style={{ backgroundImage: `url(${JSON.stringify(slide.backgroundUrl || slide.posterUrl || fallbackPoster)})` }}
          aria-hidden={index !== active}
        />
      ))}
      <div className="hero-ambient" aria-hidden="true" />
      <div className="hero-noise" aria-hidden="true" />

      <div className="hero-copy">
        <div className="hero-eyebrow"><span className="hero-dot" /> {categoryLabel(item.category)}</div>
        <h1 className="hero-title-animated" key={item.id}>{item.title}</h1>
        <div className="hero-meta">
          {item.year && <span>{item.year}</span>}
          <span>{typeLabel(item.type)}</span>
          {item.episodes > 0 && <span>{item.episodes} серий</span>}
        </div>
        {item.description && <p className="hero-description">{item.description}</p>}
        <div className="hero-actions">
          <Link href={`/anime/${item.slug}`} className="hero-button hero-button-glow">▶ Смотреть</Link>
          <Link href={`/anime/${item.slug}`} className="hero-button ghost">♡ В избранное</Link>
          {safeItems.length > 1 && (
            <button type="button" className="hero-button ghost surprise-button" onClick={() => setActive(Math.floor(Math.random() * safeItems.length))}>✦ Удиви меня</button>
          )}
        </div>
      </div>

      <div className="hero-poster-wrap" aria-hidden="true">
        <img key={item.id} src={item.posterUrl || fallbackPoster} alt="" className="hero-poster hero-poster-animated" />
      </div>

      <div className="hero-fade" aria-hidden="true" />
      <div className="hero-carousel-controls" aria-label="Выбор главного тайтла">
        {safeItems.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            className={`hero-carousel-dot ${index === active ? "is-active" : ""}`}
            onClick={() => setActive(index)}
            aria-label={`Показать ${slide.title}`}
            aria-pressed={index === active}
          />
        ))}
      </div>
    </section>
  );
}
