import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createAnime, createGenre, deleteGenre, syncCatalogNow, updateSiteSettings } from "./actions";
import { logout } from "./login/actions";
import ConfirmButton from "./ConfirmButton";
import AppearanceForm from "./AppearanceForm";
import { categoryLabel, searchWhere, typeLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHome({ searchParams }: { searchParams: { q?: string; category?: string; sync?: string; updated?: string; syncError?: string; movies?: string; series?: string; anime?: string; settings?: string } }) {
  const q = searchParams.q?.trim() || "";
  const category = searchParams.category === "movie" || searchParams.category === "series" || searchParams.category === "anime" ? searchParams.category : "";
  const [content, genres, settings] = await Promise.all([
    prisma.anime.findMany({
      where: {
        ...(category ? { category } : {}),
        ...searchWhere(q),
      },
      orderBy: { updatedAt: "desc" },
      include: { seasons: { include: { episodes: true } } },
    }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
    prisma.siteSettings.findUnique({ where: { id: "global" } }),
  ]);

  const imported = Number(searchParams.sync || 0);
  const updated = Number(searchParams.updated || 0);

  return (
    <>
      <div className="page-head admin-page-head">
        <div><h1>Управление</h1><p>Контент, жанры, фоны и автозагрузка каталога — всё в одном месте.</p></div>
        <form action={logout}><button className="btn btn-secondary" type="submit">Выйти</button></form>
      </div>

      {searchParams.sync !== undefined && <div className="form-success">Автозагрузка завершена: добавлено {Number.isFinite(imported) ? imported : 0}, обновлено {Number.isFinite(updated) ? updated : 0}. Фильмов: {searchParams.movies || 0}, сериалов: {searchParams.series || 0}, аниме: {searchParams.anime || 0}.</div>}
      {searchParams.syncError && <div className="form-error">Автозагрузка не выполнилась. Проверь `TMDB_ACCESS_TOKEN` и логи deployment.</div>}
      {searchParams.settings !== undefined && <div className="form-success">Настройки оформления сохранены.</div>}

      <div className="panel auto-import-panel">
        <div className="panel-head">
          <div>
            <h2>Автозагрузка каталога</h2>
            <p className="meta">TMDB может автоматически подгружать свежие фильмы, сериалы и японскую анимацию. Видео не импортируется: ссылку на просмотр ты добавляешь отдельно.</p>
          </div>
          <form action={syncCatalogNow}><button className="btn" type="submit" disabled={!process.env.TMDB_ACCESS_TOKEN}>Обновить сейчас</button></form>
        </div>
        {!process.env.TMDB_ACCESS_TOKEN && <p className="tmdb-hint">Добавь на сервере переменную <strong>TMDB_ACCESS_TOKEN</strong> — это API Read Access Token из настроек TMDB.</p>}
      </div>

      <form className="search-panel admin-search" method="get" action="/admin">
        <input name="q" defaultValue={q} placeholder="Поиск по названию..." aria-label="Поиск тайтлов" autoComplete="off" />
        <select name="category" defaultValue={category} aria-label="Раздел">
          <option value="">Все разделы</option><option value="movie">Фильмы</option><option value="series">Сериалы</option><option value="anime">Аниме</option>
        </select>
        <button className="btn" type="submit">Найти</button>
        {(q || category) && <Link className="btn btn-secondary" href="/admin">Сбросить</Link>}
      </form>

      <div className="panel">
        <h2>Оформление сайта</h2>
        <AppearanceForm
          backgroundUrl={settings?.backgroundUrl || ""}
          accent={settings?.defaultAccent || "#E8A33D"}
          buttonTextColor={settings?.buttonTextColor || "#171208"}
        />
        <p className="meta">Настройки сохраняются только после «Применить». «Отменить» возвращает последнее сохранённое оформление.</p>
      </div>

      <div className="admin-shell">
        <aside>
          <div className="panel admin-list-panel">
            <h2>Контент · {content.length}</h2>
            <div className="admin-list">
              {content.length === 0 && <div className="admin-empty">Ничего не найдено.</div>}
              {content.map((a) => {
                const episodeCount = a.seasons.reduce((n, s) => n + s.episodes.length, 0);
                return <Link key={a.id} href={`/admin/anime/${a.id}`}><strong>{a.title}</strong><br /><span>{categoryLabel(a.category)} · {typeLabel(a.type)} · {a.seasons.length} сез. · {episodeCount} сер.</span></Link>;
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
            <h2>Новый контент</h2>
            <div className="field-row">
              <div className="field"><label>Название</label><input name="title" required maxLength={120} placeholder="Например: Ночной страж" /></div>
              <div className="field"><label>Раздел</label><select name="category" defaultValue="series"><option value="movie">Фильмы</option><option value="series">Сериалы</option><option value="anime">Аниме</option></select></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Формат</label><select name="type" defaultValue="series"><option value="series">Сериал</option><option value="movie">Фильм</option></select></div>
              <div className="field"><label>Год</label><input name="year" type="number" min={1900} max={2200} placeholder="2026" /></div>
            </div>
            <div className="field"><label>Описание</label><textarea name="description" rows={4} maxLength={5000} placeholder="Короткая аннотация" /></div>
            <div className="field-row">
              <div className="field"><label>Постер (URL)</label><input name="posterUrl" maxLength={2048} placeholder="https://..." /></div>
              <div className="field"><label>Фон страницы тайтла (URL)</label><input name="backgroundUrl" maxLength={2048} placeholder="https://.../wide-image.jpg" /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Статус</label><select name="status" defaultValue="ongoing"><option value="ongoing">Онгоинг</option><option value="finished">Завершён</option><option value="announced">Анонс</option></select></div>
              <div className="field"><label>Видео фильма (необязательно)</label><input name="videoUrl" maxLength={2048} placeholder="https://youtube.com/watch?v=... или .mp4" /></div>
            </div>
            <div className="field"><label>Жанры</label><div className="check-grid">{genres.map((g) => <label className="check" key={g.id}><input type="checkbox" name="genres" value={g.name} /> <span>{g.name}</span></label>)}</div></div>
            <button className="btn" type="submit">Создать тайтл</button>
          </form>
        </div>
      </div>
    </>
  );
}
