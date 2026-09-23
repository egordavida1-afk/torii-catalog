import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { categoryLabel, typeLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/favorites")}`);

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { anime: true },
  });

  return (
    <>
      <div className="page-head">
        <h1>Избранное</h1>
        <p>Тайтлы, которые ты сохранил в свой список.</p>
      </div>
      {favorites.length ? (
        <div className="grid favorites-grid">
          {favorites.map(({ anime }) => (
            <Link href={`/anime/${anime.slug}`} className="card favorite-card" key={anime.id}>
              <span className="card-tag">{categoryLabel(anime.category)}</span>
              <img className="card-poster" src={anime.posterUrl || "https://placehold.co/300x450/1c1a26/a9a3b5?text=Нет+постера"} alt={anime.title} loading="lazy" />
              <div className="card-body">
                <div className="card-title">{anime.title}</div>
                <div className="card-meta">{anime.year ?? "—"} · {typeLabel(anime.type)}</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">Пока ничего нет. Открой тайтл и нажми «Добавить в избранное».</div>
      )}
    </>
  );
}
