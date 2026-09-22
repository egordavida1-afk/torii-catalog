import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { typeLabel, statusLabel } from "@/lib/utils";
import { logoutUser } from "./auth/actions";

export const dynamic = "force-dynamic";

const fallbackPoster = "https://placehold.co/300x450/1c1a26/a9a3b5?text=Нет+постера";

function contentWhere(q?: string, type?: string, genre?: string) {
  const text = q?.trim();
  return {
    ...(type === "movie" || type === "series" ? { type } : {}),
    ...(genre ? { genres: { contains: genre, mode: "insensitive" as const } } : {}),
    ...(text ? {
      OR: [
        { title: { contains: text, mode: "insensitive" as const } },
        { description: { contains: text, mode: "insensitive" as const } },
      ],
    } : {}),
  };
}

export default async function HomePage({ searchParams }: { searchParams: { q?: string; type?: string; genre?: string } }) {
  const q = searchParams.q?.trim() || "";
  const type = searchParams.type === "movie" || searchParams.type === "series" ? searchParams.type : "";
  const genre = searchParams.genre?.trim() || "";
  const user = await getCurrentUser();

  const where = contentWhere(q, type, genre);
  const [results, genres] = await Promise.all([
    prisma.anime.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { seasons: { include: { episodes: true } } } }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
  ]);

  const hasFilters = Boolean(q || type || genre);
  const newReleases = hasFilters ? [] : results.slice(0, 8);
  const movies = hasFilters ? results.filter((a) => a.type === "movie") : results.filter((a) => a.type === "movie").slice(0, 8);
  const series = hasFilters ? results.filter((a) => a.type === "series") : results.filter((a) => a.type === "series").slice(0, 8);

  const genreSections = hasFilters ? [] : genres.map((g) => ({
    ...g,
    items: results.filter((a) => a.genres?.split(",").map((x) => x.trim().toLowerCase()).includes(g.name.toLowerCase())).slice(0, 6),
  })).filter((g) => g.items.length);

  return (
    <>
      <div className="page-head catalog-head">
        <div>
          <h1>Каталог</h1>
          <p>Фильмы и сериалы. Новинки, подборки по жанрам и поиск по каталогу.</p>
        </div>
        <div className="account-box">
          {user ? (
            <><span>{user.email}</span><form action={logoutUser}><button className="btn btn-secondary" type="submit">Выйти</button></form></>
          ) : (
            <><Link className="btn btn-secondary" href="/login">Войти</Link><Link className="btn" href="/register">Регистрация</Link></>
          )}
        </div>
      </div>

      <form className="search-panel" method="get">
        <input name="q" value={q} placeholder="Поиск по названию..." aria-label="Поиск" />
        <select name="type" defaultValue={type} aria-label="Тип">
          <option value="">Все</option><option value="movie">Фильмы</option><option value="series">Сериалы</option>
        </select>
        <select name="genre" defaultValue={genre} aria-label="Жанр">
          <option value="">Все жанры</option>
          {genres.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
        </select>
        <button className="btn" type="submit">Найти</button>
        {hasFilters && <Link className="btn btn-secondary" href="/">Сбросить</Link>}
      </form>

      {hasFilters ? (
        <section className="catalog-section">
          <div className="section-title"><h2>Результаты</h2><span>{results.length}</span></div>
          {results.length ? <div className="grid">{results.map((a) => <Card key={a.id} item={a} />)}</div> : <div className="empty-state">По запросу ничего не найдено.</div>}
        </section>
      ) : (
        <>
          {newReleases.length > 0 && <CatalogSection title="Новинки" items={newReleases} />}
          <CatalogSection title="Фильмы" items={movies} empty="Фильмов пока нет." />
          <CatalogSection title="Сериалы" items={series} empty="Сериалов пока нет." />
          {genreSections.map((section) => <CatalogSection key={section.id} title={`Жанр: ${section.name}`} items={section.items} genre={section.name} />)}
          {!newReleases.length && !movies.length && !series.length && <div className="empty-state">Каталог пока пуст. Добавь первый тайтл через <Link href="/admin">админку →</Link></div>}
        </>
      )}
    </>
  );
}

function CatalogSection({ title, items, empty = "В этом разделе пока нет тайтлов.", genre }: { title: string; items: any[]; empty?: string; genre?: string }) {
  return (
    <section className="catalog-section">
      <div className="section-title"><h2>{title}</h2>{items.length > 0 && <Link href={genre ? `/?genre=${encodeURIComponent(genre)}` : `/?q=&type=${title === "Фильмы" ? "movie" : title === "Сериалы" ? "series" : ""}`}>Смотреть все →</Link>}</div>
      {items.length ? <div className="grid">{items.map((a) => <Card key={a.id} item={a} />)}</div> : <div className="empty-state">{empty}</div>}
    </section>
  );
}

function Card({ item }: { item: any }) {
  const episodes = item.seasons.reduce((n: number, s: any) => n + s.episodes.length, 0);
  const accessText = "Только для зарегистрированных";
  return (
    <Link href={`/anime/${item.slug}`} className="card">
      <span className="card-tag">{typeLabel(item.type)}</span>
      <img className="card-poster" src={item.posterUrl || fallbackPoster} alt={item.title} />
      <div className="card-body">
        <div className="card-title">{item.title}</div>
        <div className="card-meta">{item.year ?? "—"} · {item.type === "movie" ? "Фильм" : `${episodes} ${episodes === 1 ? "серия" : "серий"}`}</div>
        <div className="card-access">{accessText}</div>
      </div>
    </Link>
  );
}
