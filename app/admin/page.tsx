import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createAnime, createGenre, deleteGenre } from "./actions";
import { logout } from "./login/actions";
import ConfirmButton from "./ConfirmButton";
import { typeLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHome({ searchParams }: { searchParams: { q?: string; type?: string } }) {
  const q = searchParams.q?.trim() || "";
  const type = searchParams.type === "movie" || searchParams.type === "series" ? searchParams.type : "";
  const [anime, genres] = await Promise.all([
    prisma.anime.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { seasons: { include: { episodes: true } } },
    }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div><h1>Админка</h1><p>Управляй фильмами, сериалами, фонами и жанрами в одном месте.</p></div>
        <form action={logout}><button className="btn btn-secondary" type="submit">Выйти</button></form>
      </div>

      <form className="search-panel" method="get">
        <input name="q" value={q} placeholder="Найти тайтл..." aria-label="Поиск тайтлов" />
        <select name="type" defaultValue={type} aria-label="Тип">
          <option value="">Все типы</option><option value="movie">Фильмы</option><option value="series">Сериалы</option>
        </select>
        <button className="btn" type="submit">Найти</button>
        {(q || type) && <Link className="btn btn-secondary" href="/admin">Сбросить</Link>}
      </form>

      <div className="admin-shell">
        <aside>
          <div className="panel admin-list-panel">
            <h2>Контент</h2>
            <div className="admin-list">
              {anime.length === 0 && <div className="admin-empty">Ничего не найдено.</div>}
              {anime.map((a) => {
                const episodeCount = a.seasons.reduce((n, s) => n + s.episodes.length, 0);
                return <Link key={a.id} href={`/admin/anime/${a.id}`}><strong>{a.title}</strong><br /><span>{typeLabel(a.type)} · {a.seasons.length} сез. · {episodeCount} сер.</span></Link>;
              })}
            </div>
          </div>

          <div className="panel">
            <h2>Жанры</h2>
            <form action={createGenre} className="inline-form">
              <input name="name" maxLength={50} required placeholder="Например: Мистика" />
              <button className="btn" type="submit">Добавить</button>
            </form>
            <div className="genre-admin-list">
              {genres.map((genre) => <div key={genre.id} className="genre-admin-item"><span>{genre.name}</span><form action={deleteGenre.bind(null, genre.id)}><ConfirmButton message={`Удалить жанр «${genre.name}»?`} className="icon-btn">×</ConfirmButton></form></div>)}
            </div>
          </div>
        </aside>

        <div>
          <form action={createAnime} className="panel">
            <h2>Новый фильм или сериал</h2>
            <div className="field-row">
              <div className="field"><label>Название</label><input name="title" required maxLength={120} placeholder="Например: Ночной страж" /></div>
              <div className="field"><label>Тип</label><select name="type" defaultValue="series"><option value="series">Сериал</option><option value="movie">Фильм</option></select></div>
            </div>
            <div className="field"><label>Описание</label><textarea name="description" rows={4} maxLength={5000} placeholder="Короткая аннотация" /></div>
            <div className="field-row">
              <div className="field"><label>Постер (URL)</label><input name="posterUrl" maxLength={2048} placeholder="https://..." /></div>
              <div className="field"><label>Фон для страницы тайтла (URL)</label><input name="backgroundUrl" maxLength={2048} placeholder="https://.../wide-image.jpg" /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Год</label><input name="year" type="number" min={1900} max={2200} placeholder="2026" /></div>
              <div className="field"><label>Статус</label><select name="status" defaultValue="ongoing"><option value="ongoing">Онгоинг</option><option value="finished">Завершён</option><option value="announced">Анонс</option></select></div>
            </div>
            <div className="field"><label>Жанры</label><div className="check-grid">{genres.map((g) => <label className="check" key={g.id}><input type="checkbox" name="genres" value={g.name} /> <span>{g.name}</span></label>)}</div></div>
            <div className="field"><label>Видео для фильма (для сериала оставь пустым)</label><input name="videoUrl" maxLength={2048} placeholder="https://youtube.com/watch?v=... или прямой .mp4" /></div>
            <button className="btn" type="submit">Создать тайтл</button>
          </form>
        </div>
      </div>
    </>
  );
}
