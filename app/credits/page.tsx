import Link from "next/link";

export default function CreditsPage() {
  return (
    <div className="auth-card credits-card">
      <div className="page-head">
        <h1>Источники</h1>
        <p>Информация об автоматических данных каталога.</p>
      </div>
      <div className="panel">
        <h2>TMDB</h2>
        <p className="title-desc">Этот продукт использует TMDB API, но не одобрен и не сертифицирован TMDB.</p>
        <p className="title-desc"><a className="tmdb-credit" href="https://www.themoviedb.org" target="_blank" rel="noreferrer">The Movie Database (TMDB)</a></p>
      </div>
      <p className="auth-note"><Link href="/catalog">← В каталог</Link></p>
    </div>
  );
}
