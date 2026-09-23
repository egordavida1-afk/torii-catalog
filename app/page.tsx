import Link from "next/link";

export const dynamic = "force-dynamic";

type Choice = {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  className: string;
};

const choices: Choice[] = [
  { href: "/catalog?category=movie", icon: "✦", title: "Фильмы", subtitle: "Большие истории на один вечер", className: "welcome-choice-movie" },
  { href: "/catalog?category=series", icon: "◈", title: "Сериалы", subtitle: "Сезоны, серии и новые выпуски", className: "welcome-choice-series" },
  { href: "/catalog?category=anime", icon: "鳥", title: "Аниме", subtitle: "Анимация, японские истории и новинки", className: "welcome-choice-anime" },
];

export default function HomePage() {
  return (
    <section className="welcome-page" aria-labelledby="welcome-title">
      <div className="welcome-orbit welcome-orbit-one" aria-hidden="true" />
      <div className="welcome-orbit welcome-orbit-two" aria-hidden="true" />
      <div className="welcome-spark welcome-spark-one" aria-hidden="true" />
      <div className="welcome-spark welcome-spark-two" aria-hidden="true" />

      <div className="welcome-content">
        <div className="welcome-kicker">Добро пожаловать в Тории</div>
        <h1 id="welcome-title">Что бы вы хотели<br /><span>посмотреть?</span></h1>
        <p className="welcome-lead">Выберите направление — и мы откроем каталог с новинками, жанрами и доступным просмотром.</p>

        <div className="welcome-choices">
          {choices.map((choice, index) => (
            <Link
              key={choice.href}
              href={choice.href}
              className={`welcome-choice ${choice.className}`}
              style={{ "--welcome-delay": `${index * 110}ms` } as React.CSSProperties}
            >
              <span className="welcome-choice-glow" aria-hidden="true" />
              <span className="welcome-choice-icon" aria-hidden="true">{choice.icon}</span>
              <span className="welcome-choice-copy">
                <span className="welcome-choice-title">{choice.title}</span>
                <span className="welcome-choice-subtitle">{choice.subtitle}</span>
              </span>
              <span className="welcome-choice-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>

        <Link className="welcome-all" href="/catalog">Открыть весь каталог <span>→</span></Link>
      </div>
    </section>
  );
}
