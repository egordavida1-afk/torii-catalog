import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { categoryLabel, searchWhere, typeLabel } from "@/lib/utils";
import { logoutUser } from "./auth/actions";

export const dynamic = "force-dynamic";

const fallbackPoster = "https://placehold.co/300x450/1c1a26/a9a3b5?text=Нет+постера";

function contentWhere(q?: string, category?: string, genre?: string) {
  return {
    ...(category === "movie" || category === "series" || category === "anime" ? { category } : {}),
    ...(genre ? { genres: { contains: genre, mode: "insensitive" as const } } : {}),
    ...searchWhere(q || ""),
  };
}

export default async function HomePage({ searchParams }: { searchParams: { q?: string; category?: string; genre?: string } }) {
  const q = searchParams.q?.trim() || "";
  const category = searchParams.category === "movie" || searchParams.category === "series" || searchParams.category === "anime" ? searchParams.category : "";
  const genre = searchParams.genre?.trim() || "";
  const user = await getCurrentUser();

  const where = contentWhere(q, category, genre);
  const [results, genres] = await Promise.all([
    prisma.anime.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { seasons: { include: { episodes: true } } } }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
  ]);

  const hasSearchFilters = Boolean(q || genre);
  const hasFilters = Boolean(q || category || genre);
  const categoryTitle = category === "movie" ? "Фильмы" : category === "series" ? "Сериалы" : category === "anime" ? "Аниме" : "Каталог";
  const newReleases = results.slice(0, 10);
  const movies = results.filter((a) => a.category === "movie").slice(0, 10);
  const series = results.filter((a) => a.category === "series").slice(0, 10);
  const anime = results.filter((a) => a.category === "anime").slice(0, 10);
  const genreSections = genres.map((g) => ({
    ...g,
    items: results.filter((a) => a.genres?.split(",").map((x) => x.trim().toLowerCase()).includes(g.name.toLowerCase())).slice(0, 6),
  })).filter((g) => g.items.length);

  return (
    <>
      <div className="page-head catalog-head">
        <div>
          <h1>{categoryTitle}</h1>
          <p>{category ? `Новинки, жанры и доступный просмотр в разделе «${categoryTitle.toLowerCase()}».` : "Фильмы, сериалы и аниме. Новинки, жанры и быстрый поиск по названию."}</p>
        </div>
      </div>

      <form className="search-panel" method="get" action="/catalog">
        <input name="q" defaultValue={q} placeholder="Поиск по названию..." aria-label="Поиск по названию" autoComplete="off" />
        <select name="category" defaultValue={category} aria-label="Раздел">
          <option value="">Все разделы</option><option value="movie">Фильмы</option><option value="series">Сериалы</option><option value="anime">Аниме</option>
        </select>
        <select name="genre" defaultValue={genre} aria-label="Жанр">
          <option value="">Все жанры</option>
          {genres.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
        </select>
        <button className="btn" type="submit">Найти</button>
        {hasFilters && <Link className="btn btn-secondary" href="/catalog">Сбросить</Link>}
      </form>

      {hasSearchFilters ? (
        <section className="catalog-section">
          <div className="section-title"><h2>Результаты</h2><span>{results.length}</span></div>
          {results.length ? <div className="grid">{results.map((a) => <Card key={a.id} item={a} />)}</div> : <div className="empty-state">Ничего не найдено. Попробуй другое название или сбрось фильтры.</div>}
        </section>
      ) : category ? (
        <>
          <CatalogSection title="Новинки" items={newReleases} />
          <div className="catalog-section">
            <div className="section-title"><h2>Жанры</h2></div>
            {genreSections.length ? <div className="genre-chip-grid">{genreSections.map((section) => <Link key={section.id} href={`/catalog?category=${encodeURIComponent(category)}&genre=${encodeURIComponent(section.name)}`} className="genre-chip">{section.name}<span>{section.items.length}</span></Link>)}</div> : <div className="empty-state">Жанры появятся после импорта каталога.</div>}
          </div>
          <CatalogSection title={categoryTitle} items={results} empty={`В разделе «${categoryTitle}» пока нет тайтлов.`} category={category} />
        </>
      ) : (
        <>
          {newReleases.length > 0 && <CatalogSection title="Новинки" items={newReleases} />}
          <CatalogSection title="Фильмы" items={movies} empty="Фильмов пока нет." category="movie" />
          <CatalogSection title="Сериалы" items={series} empty="Сериалов пока нет." category="series" />
          <CatalogSection title="Аниме" items={anime} empty="Аниме пока нет." category="anime" />
          {genreSections.map((section) => <CatalogSection key={section.id} title={`Жанр: ${section.name}`} items={section.items} genre={section.name} />)}
          {!newReleases.length && !movies.length && !series.length && !anime.length && <div className="empty-state">Каталог пока пуст. Добавь тайтл через админку или запусти автозагрузку.</div>}
        </>
      )}
    </>
  );
}

function CatalogSection({ title, items, empty = "В этом разделе пока нет тайтлов.", genre, category }: { title: string; items: any[]; empty?: string; genre?: string; category?: string }) {
  const href = genre ? `/catalog?genre=${encodeURIComponent(genre)}` : category ? `/catalog?category=${category}` : "/catalog";
  return (
    <section className="catalog-section">
      <div className="section-title"><h2>{title}</h2>{items.length > 0 && <Link href={href}>Смотреть все →</Link>}</div>
      {items.length ? <div className="grid">{items.map((a) => <Card key={a.id} item={a} />)}</div> : <div className="empty-state">{empty}</div>}
    </section>
  );
}

function Card({ item }: { item: any }) {
  const episodes = item.seasons.reduce((n: number, s: any) => n + s.episodes.length, 0);
  return (
    <Link href={`/anime/${item.slug}`} className="card">
      <span className="card-tag">{categoryLabel(item.category)}</span>
      <img className="card-poster" src={item.posterUrl || fallbackPoster} alt={item.title} loading="lazy" />
      <div className="card-body">
        <div className="card-title">{item.title}</div>
        <div className="card-meta">{item.year ?? "—"} · {typeLabel(item.type)}{item.type === "series" && episodes ? ` · ${episodes} ${episodes === 1 ? "серия" : "серий"}` : ""}</div>
      </div>
    </Link>
  );
}
