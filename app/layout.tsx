import type { Metadata } from "next";
import { Unbounded, Manrope } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Unbounded({ subsets: ["latin", "cyrillic"], weight: ["500", "700", "900"], variable: "--font-display" });
const body = Manrope({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Тории — каталог фильмов и сериалов",
  description: "Свой каталог фильмов и сериалов с новинками, жанрами и просмотром для зарегистрированных пользователей.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${display.variable} ${body.variable}`}>
        <div className="bg-collage" aria-hidden="true" />
        <div className="site-frame">
          <header className="site-header">
            <Link href="/" className="brand"><span className="brand-mark">鳥</span><span className="brand-name">Тории</span></Link>
            <nav className="site-nav"><Link href="/">Каталог</Link><Link href="/register">Регистрация</Link><Link href="/admin">Админка</Link></nav>
          </header>
          <main>{children}</main>
          <footer className="site-footer"><span>Свой каталог. Загружай только контент, на который у тебя есть права.</span></footer>
        </div>
      </body>
    </html>
  );
}
