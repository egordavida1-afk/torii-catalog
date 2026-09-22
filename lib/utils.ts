export function slugify(input: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c",
    ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return input.toLowerCase().split("").map((ch) => map[ch] ?? ch).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

export function normalizeSearch(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export function searchTerms(input: string) {
  return normalizeSearch(input).toLocaleLowerCase("ru-RU").split(" ").map((term) => term.trim()).filter(Boolean).slice(0, 8);
}

export function searchWhere(input: string) {
  const q = normalizeSearch(input);
  const terms = searchTerms(q);
  if (!terms.length) return {};
  return {
    OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { slug: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
      { genres: { contains: q, mode: "insensitive" as const } },
      ...(terms.length > 1 ? [{ AND: terms.map((term) => ({
        OR: [
          { title: { contains: term, mode: "insensitive" as const } },
          { description: { contains: term, mode: "insensitive" as const } },
          { genres: { contains: term, mode: "insensitive" as const } },
        ],
      })) }] : []),
    ],
  };
}

export function normalizeVideoUrl(url: string): { type: "iframe" | "video"; src: string } {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([\w-]+)/);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  return { type: "video", src: url };
}

export function statusLabel(status: string): string {
  switch (status) {
    case "ongoing": return "Онгоинг";
    case "finished": return "Завершён";
    case "announced": return "Анонс";
    default: return status;
  }
}

export function typeLabel(type: string) {
  return type === "movie" ? "Фильм" : "Сериал";
}

export function categoryLabel(category: string) {
  switch (category) {
    case "movie": return "Фильмы";
    case "series": return "Сериалы";
    case "anime": return "Аниме";
    default: return category;
  }
}
