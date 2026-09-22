const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const genres = [
  ["Боевик", "boevik"],
  ["Комедия", "komediya"],
  ["Драма", "drama"],
  ["Фэнтези", "fentezi"],
  ["Фантастика", "fantastika"],
  ["Триллер", "triller"],
  ["Романтика", "romantika"],
  ["Приключения", "priklyucheniya"],
];

async function main() {
  for (const [name, slug] of genres) {
    await prisma.genre.upsert({ where: { slug }, update: {}, create: { name, slug } });
  }

  await prisma.anime.upsert({
    where: { slug: "nochnoy-strazh" },
    update: {},
    create: {
      slug: "nochnoy-strazh",
      title: "Ночной страж",
      description: "Демо-сериал для проверки каталога. Его можно заменить или удалить в админке.",
      posterUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80",
      backgroundUrl: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1800&q=85",
      year: 2026,
      genres: "Фэнтези,Боевик",
      status: "ongoing",
      type: "series",
      seasons: {
        create: [
          {
            number: 1,
            title: "Сезон 1",
            episodes: {
              create: [
                { number: 1, title: "Пробуждение", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", duration: 24 },
                { number: 2, title: "Первый дозор", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", duration: 24 },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.anime.upsert({
    where: { slug: "posledniy-reys-demo" },
    update: {},
    create: {
      slug: "posledniy-reys-demo",
      title: "Последний рейс",
      description: "Демо-фильм, чтобы увидеть отдельный тип контента в каталоге.",
      posterUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80",
      backgroundUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1800&q=85",
      year: 2026,
      genres: "Триллер,Приключения",
      status: "finished",
      type: "movie",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    },
  });

  console.log("Готово: базовые жанры и демо-данные добавлены.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
