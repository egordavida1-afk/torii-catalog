"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/admin-auth";
import { normalizeHttpUrl } from "@/lib/security";
import { slugify } from "@/lib/utils";

const VALID_TYPES = new Set(["series", "movie"]);
const VALID_STATUSES = new Set(["ongoing", "finished", "announced"]);

function cleanText(value: FormDataEntryValue | null, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

function cleanNumber(value: FormDataEntryValue | null, min: number, max: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

async function uniqueSlug(title: string) {
  const base = slugify(title) || `title-${Date.now()}`;
  let slug = base;
  let i = 2;
  while (await prisma.anime.findUnique({ where: { slug } })) slug = `${base}-${i++}`;
  return slug;
}

async function selectedGenres(formData: FormData) {
  const names = [...new Set(formData.getAll("genres").map((x) => String(x).trim()).filter(Boolean))];
  if (!names.length) return null;
  const dbGenres = await prisma.genre.findMany({ where: { name: { in: names } }, select: { name: true } });
  return dbGenres.map((g) => g.name).join(",") || null;
}

export async function createAnime(formData: FormData) {
  await requireAdminAction();
  const title = cleanText(formData.get("title"), 120);
  if (!title) throw new Error("Название обязательно");

  const type = cleanText(formData.get("type"), 20);
  if (!VALID_TYPES.has(type)) throw new Error("Некорректный тип контента");

  const status = cleanText(formData.get("status"), 20);
  if (!VALID_STATUSES.has(status)) throw new Error("Некорректный статус");

  const posterUrl = normalizeHttpUrl(cleanText(formData.get("posterUrl"), 2048));
  const backgroundUrl = normalizeHttpUrl(cleanText(formData.get("backgroundUrl"), 2048));
  const videoUrl = type === "movie" ? normalizeHttpUrl(cleanText(formData.get("videoUrl"), 2048)) : null;
  if (type === "movie" && !videoUrl) throw new Error("Для фильма нужна ссылка на видео");

  const yearRaw = cleanNumber(formData.get("year"), 1900, 2200);
  const genres = await selectedGenres(formData);
  const anime = await prisma.anime.create({
    data: {
      title,
      slug: await uniqueSlug(title),
      description: cleanText(formData.get("description"), 5000) || null,
      posterUrl,
      backgroundUrl,
      year: yearRaw,
      genres,
      status,
      type,
      videoUrl,
    },
  });

  revalidatePath("/");
  redirect(`/admin/anime/${anime.id}`);
}

export async function updateAnime(animeId: string, formData: FormData) {
  await requireAdminAction();
  const existing = await prisma.anime.findUnique({ where: { id: animeId } });
  if (!existing) throw new Error("Тайтл не найден");

  const title = cleanText(formData.get("title"), 120);
  if (!title) throw new Error("Название обязательно");
  const type = cleanText(formData.get("type"), 20);
  if (!VALID_TYPES.has(type)) throw new Error("Некорректный тип контента");
  const status = cleanText(formData.get("status"), 20);
  if (!VALID_STATUSES.has(status)) throw new Error("Некорректный статус");

  const posterUrl = normalizeHttpUrl(cleanText(formData.get("posterUrl"), 2048));
  const backgroundUrl = normalizeHttpUrl(cleanText(formData.get("backgroundUrl"), 2048));
  const videoUrl = type === "movie" ? normalizeHttpUrl(cleanText(formData.get("videoUrl"), 2048)) : null;
  if (type === "movie" && !videoUrl) throw new Error("Для фильма нужна ссылка на видео");
  if (type === "movie" && existing.type === "series") {
    const seasonCount = await prisma.season.count({ where: { animeId } });
    if (seasonCount > 0) throw new Error("Сначала удали сезоны сериала, затем переводи тайтл в фильм.");
  }

  const year = cleanNumber(formData.get("year"), 1900, 2200);
  const genres = await selectedGenres(formData);
  await prisma.anime.update({
    where: { id: animeId },
    data: {
      title,
      description: cleanText(formData.get("description"), 5000) || null,
      posterUrl,
      backgroundUrl,
      year,
      genres,
      status,
      type,
      videoUrl,
    },
  });

  revalidatePath("/");
  revalidatePath(`/admin/anime/${animeId}`);
  revalidatePath(`/anime/${existing.slug}`);
}

export async function deleteAnime(id: string) {
  await requireAdminAction();
  await prisma.anime.delete({ where: { id } });
  revalidatePath("/");
  redirect("/admin");
}

export async function createSeason(animeId: string, formData: FormData) {
  await requireAdminAction();
  const anime = await prisma.anime.findUnique({ where: { id: animeId }, select: { type: true } });
  if (!anime || anime.type !== "series") throw new Error("Сезоны доступны только для сериалов");

  const number = cleanNumber(formData.get("number"), 1, 1000);
  if (!number) throw new Error("Некорректный номер сезона");

  await prisma.season.create({ data: { animeId, number, title: cleanText(formData.get("title"), 120) || null } });
  revalidatePath(`/admin/anime/${animeId}`);
  revalidatePath("/");
}

export async function deleteSeason(animeId: string, seasonId: string) {
  await requireAdminAction();
  const season = await prisma.season.findFirst({ where: { id: seasonId, animeId } });
  if (!season) throw new Error("Сезон не найден");
  await prisma.season.delete({ where: { id: seasonId } });
  revalidatePath(`/admin/anime/${animeId}`);
  revalidatePath("/");
}

export async function createEpisode(animeId: string, seasonId: string, formData: FormData) {
  await requireAdminAction();
  const season = await prisma.season.findFirst({ where: { id: seasonId, animeId }, select: { id: true } });
  if (!season) throw new Error("Сезон не найден");

  const number = cleanNumber(formData.get("number"), 1, 100000);
  const videoUrl = normalizeHttpUrl(cleanText(formData.get("videoUrl"), 2048));
  if (!number) throw new Error("Некорректный номер серии");
  if (!videoUrl) throw new Error("Ссылка на видео должна быть корректным http/https URL");

  const duration = formData.get("duration") ? cleanNumber(formData.get("duration"), 1, 600) : null;
  const releaseDateRaw = cleanText(formData.get("releaseDate"), 20);
  const releaseDate = releaseDateRaw ? new Date(releaseDateRaw) : null;
  if (releaseDate && Number.isNaN(releaseDate.getTime())) throw new Error("Некорректная дата выхода");
  await prisma.episode.create({
    data: {
      seasonId,
      number,
      videoUrl,
      title: cleanText(formData.get("title"), 120) || null,
      duration,
      releaseDate,
    },
  });

  revalidatePath(`/admin/anime/${animeId}`);
  revalidatePath("/");
}

export async function deleteEpisode(animeId: string, episodeId: string) {
  await requireAdminAction();
  const episode = await prisma.episode.findFirst({ where: { id: episodeId, season: { animeId } } });
  if (!episode) throw new Error("Серия не найдена");
  await prisma.episode.delete({ where: { id: episodeId } });
  revalidatePath(`/admin/anime/${animeId}`);
  revalidatePath("/");
}

export async function createGenre(formData: FormData) {
  await requireAdminAction();
  const name = cleanText(formData.get("name"), 50);
  if (!name) throw new Error("Название жанра обязательно");
  const slug = slugify(name);
  if (!slug) throw new Error("Невозможно создать slug для жанра");
  await prisma.genre.create({ data: { name, slug } });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteGenre(id: string) {
  await requireAdminAction();
  const genre = await prisma.genre.findUnique({ where: { id } });
  if (!genre) throw new Error("Жанр не найден");
  const usedTitles = await prisma.anime.findMany({ where: { genres: { contains: genre.name, mode: "insensitive" } }, select: { genres: true } });
  const used = usedTitles.filter((row) => (row.genres || "").split(",").some((value) => value.trim().toLowerCase() === genre.name.toLowerCase())).length;
  if (used > 0) throw new Error(`Жанр «${genre.name}» используется в ${used} тайтл(ах). Сначала убери его из карточек.`);
  await prisma.genre.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin");
}
