import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSeason, createEpisode, deleteAnime, deleteSeason, deleteEpisode, updateAnime } from "../../actions";
import ConfirmButton from "../../ConfirmButton";
import { categoryLabel, typeLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAnimePage({ params }: { params: { id: string } }) {
  const [anime, genres] = await Promise.all([
    prisma.anime.findUnique({ where: { id: params.id }, include: { seasons: { include: { episodes: true }, orderBy: { number: "asc" } }, kodikSources: { orderBy: { updatedAt: "desc" } } } }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!anime) notFound();

  const seasons = anime.seasons.map((s) => ({ ...s, episodes: [...s.episodes].sort((a, b) => a.number - b.number) }));
  const nextSeasonNumber = seasons.length ? Math.max(...seasons.map((s) => s.number)) + 1 : 1;
  const selected = new Set((anime.genres || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean));

  return (
    <>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div><h1>{anime.title}</h1><p>{categoryLabel(anime.category)} · {typeLabel(anime.type)} · <Link href={`/anime/${anime.slug}`} style={{ color: "var(--accent)" }}>открыть страницу →</Link></p></div>
        <form action={deleteAnime.bind(null, anime.id)}><ConfirmButton message={`Удалить «${anime.title}» вместе со всеми сезонами и сериями?`}>Удалить тайтл</ConfirmButton></form>
      </div>

      <div className="admin-shell">
        <aside className="admin-list">
          <Link href="/admin">← Все тайтлы</Link>
          {seasons.map((s) => <a key={s.id} href={`#season-${s.number}`}>{s.title || `Сезон ${s.number}`}<br /><span>{s.episodes.length} серий</span></a>)}
        </aside>

        <div>
          {anime.kodikSources.length > 0 && (
            <div className="panel kodik-admin-panel">
              <div className="panel-head"><div><h2>Kodik</h2><p className="meta">Источники просмотра, озвучки и доступные обновления, полученные автоматически.</p></div><span className="pill">{anime.kodikSources.length} источника</span></div>
              <div className="kodik-source-list">
                {anime.kodikSources.slice(0, 20).map((source) => <div key={source.id} className="kodik-source-row"><div><strong>{source.translationTitle || "Kodik"}</strong><div className="meta">{source.translationType === "subtitles" ? "Субтитры" : "Озвучка"}{source.quality ? ` · ${source.quality}` : ""}{source.lastSeason ? ` · сезон ${source.lastSeason}` : ""}{source.lastEpisode ? ` · серия ${source.lastEpisode}` : ""}</div></div><a href={source.link} target="_blank" rel="noreferrer" className="btn btn-secondary">Проверить</a></div>)}
              </div>
            </div>
          )}

          <form action={updateAnime.bind(null, anime.id)} className="panel">
            <h2>Основные данные</h2>
            <div className="field-row"><div className="field"><label>Название</label><input name="title" defaultValue={anime.title} required maxLength={120} /></div><div className="field"><label>Раздел</label><select name="category" defaultValue={anime.category}><option value="movie">Фильмы</option><option value="series">Сериалы</option><option value="anime">Аниме</option></select></div></div><div className="field-row"><div className="field"><label>Формат</label><select name="type" defaultValue={anime.type}><option value="series">Сериал</option><option value="movie">Фильм</option></select></div><div className="field"><label>Год</label><input name="year" type="number" min={1900} max={2200} defaultValue={anime.year || ""} /></div></div>
            <div className="field"><label>Описание</label><textarea name="description" rows={4} maxLength={5000} defaultValue={anime.description || ""} /></div>
            <div className="field-row"><div className="field"><label>Постер (URL)</label><input name="posterUrl" defaultValue={anime.posterUrl || ""} maxLength={2048} /></div><div className="field"><label>Фон страницы тайтла (URL)</label><input name="backgroundUrl" defaultValue={anime.backgroundUrl || ""} maxLength={2048} /></div></div>
            <div className="field-row"><div className="field"><label>Статус</label><select name="status" defaultValue={anime.status}><option value="ongoing">Онгоинг</option><option value="finished">Завершён</option><option value="announced">Анонс</option></select></div></div>
            <div className="field"><label>Жанры</label><div className="check-grid">{genres.map((g) => <label className="check" key={g.id}><input type="checkbox" name="genres" value={g.name} defaultChecked={selected.has(g.name.toLowerCase())} /> <span>{g.name}</span></label>)}</div></div>
            <div className="field"><label>Видео фильма (у сериала не используется)</label><input name="videoUrl" defaultValue={anime.videoUrl || ""} maxLength={2048} placeholder="https://..." /></div>
            <button className="btn" type="submit">Сохранить изменения</button>
          </form>

          {anime.type === "series" ? <>
            <form action={createSeason.bind(null, anime.id)} className="panel"><h2>Добавить сезон</h2><div className="field-row"><div className="field"><label>Номер</label><input name="number" type="number" min={1} max={1000} defaultValue={nextSeasonNumber} required /></div><div className="field"><label>Название</label><input name="title" maxLength={120} placeholder={`Сезон ${nextSeasonNumber}`} /></div></div><button className="btn" type="submit">Добавить сезон</button></form>
            {seasons.map((season) => {
              const nextEpNumber = season.episodes.length ? Math.max(...season.episodes.map((e) => e.number)) + 1 : 1;
              return <div key={season.id} id={`season-${season.number}`} className="panel">
                <div className="panel-head"><h2>{season.title || `Сезон ${season.number}`}</h2><form action={deleteSeason.bind(null, anime.id, season.id)}><ConfirmButton message={`Удалить ${season.title || `сезон ${season.number}`} и все его серии?`}>Удалить сезон</ConfirmButton></form></div>
                <div style={{ margin: "16px 0" }}>{season.episodes.length === 0 ? <p className="meta">Серий пока нет.</p> : season.episodes.map((ep) => <div key={ep.id} className="admin-row-item"><div><strong>{String(ep.number).padStart(2, "0")}</strong> {ep.title || `Серия ${ep.number}`}<div className="meta">{ep.videoUrl}</div></div><form action={deleteEpisode.bind(null, anime.id, ep.id)}><ConfirmButton message={`Удалить серию ${ep.number}?`}>Удалить</ConfirmButton></form></div>)}</div>
                <form action={createEpisode.bind(null, anime.id, season.id)}>
                  <div className="field-row"><div className="field"><label>Номер серии</label><input name="number" type="number" min={1} max={100000} defaultValue={nextEpNumber} required /></div><div className="field"><label>Название</label><input name="title" maxLength={120} placeholder={`Серия ${nextEpNumber}`} /></div></div>
                  <div className="field"><label>Видео URL</label><input name="videoUrl" maxLength={2048} required placeholder="https://..." /></div>
                  <div className="field-row"><div className="field"><label>Длительность, мин</label><input name="duration" type="number" min={1} max={600} placeholder="24" /></div><div className="field"><label>Дата выхода</label><input name="releaseDate" type="date" /></div></div>
                  <button className="btn" type="submit">Добавить серию</button>
                </form>
              </div>;
            })}
          </> : <div className="panel"><h2>Фильм</h2><p className="meta">У фильма одна видеоссылка. Она задаётся выше в поле «Видео фильма».</p></div>}
        </div>
      </div>
    </>
  );
}
