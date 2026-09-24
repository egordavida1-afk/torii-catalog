import Link from "next/link";

export default function CreditsPage() {
  return (
    <div className="auth-card credits-card">
      <div className="page-head">
        <h1>Источники</h1>
        <p>Информация об автоматических данных каталога.</p>
      </div>
      <div className="panel">
        <h2>Kodik</h2>
        <p className="title-desc">Каталог аниме и данные плеера загружаются через подключённую интеграцию Kodik.</p>
        <p className="title-desc">Используемые API и плеер должны соответствовать условиям предоставившего их сервиса.</p>
      </div>
      <p className="auth-note"><Link href="/catalog">← В каталог</Link></p>
    </div>
  );
}
