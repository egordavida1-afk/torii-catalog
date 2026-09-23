import type { Metadata } from "next";
import { Unbounded, Manrope } from "next/font/google";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { logoutUser } from "./auth/actions";
import "./globals.css";

const display = Unbounded({ subsets: ["latin", "cyrillic"], weight: ["500", "700", "900"], variable: "--font-display" });
const body = Manrope({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "TORII — фильмы, сериалы, аниме и мультфильмы",
  description: "TORII — фильмы, сериалы, аниме и мультфильмы в одном месте.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "global" } }),
    getCurrentUser(),
  ]);
  const background = settings?.backgroundUrl || "/bg-collage.svg";
  const accent = settings?.defaultAccent || "#8b5cf6";
  const buttonText = settings?.buttonTextColor || "#ffffff";
  const avatarLetter = user?.email?.slice(0, 1).toUpperCase() || "Т";

  return (
    <html lang="ru">
      <body className={`${display.variable} ${body.variable}`} style={{ "--accent": accent, "--accent-ink": buttonText } as React.CSSProperties}>
        <div className="bg-collage" aria-hidden="true" style={{ backgroundImage: `url("${background}")` }} />
        <div className="site-frame">
          <header className="site-header">
            <Link href="/" className="brand" aria-label="Torii — главная">
              <span className="brand-logo"><img src="/torii-mark.svg" alt="" aria-hidden="true" /></span>
              <span className="brand-name">TORII</span>
            </Link>

            <nav className="site-nav" aria-label="Основная навигация">
              <Link href="/">Главная</Link>
              <Link href="/catalog?category=movie">Фильмы</Link>
              <Link href="/catalog?category=series">Сериалы</Link>
              <Link href="/catalog?category=anime">Аниме</Link>
              <Link href="/catalog?category=cartoon">Мультфильмы</Link>
            </nav>

            <div className="header-actions">
              <Link href="/catalog" className="header-search" aria-label="Поиск" title="Поиск">
                <span aria-hidden="true">⌕</span>
                <span className="header-search-text">Поиск</span>
              </Link>
              <Link href="/favorites" className="header-icon" aria-label="Избранное" title="Избранное">♡</Link>
              {user ? (
                <>
                  <span className="header-avatar" aria-label={`Пользователь ${user.email}`} title={user.email}>{avatarLetter}</span>
                  <form action={logoutUser} className="nav-form">
                    <button className="header-logout" type="submit">Выйти</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="header-login">Войти</Link>
              )}
            </div>
          </header>

          <main>{children}</main>

          <footer className="site-footer">
            <span>TORII · фильмы, сериалы, аниме и мультфильмы.</span>
            <Link className="tmdb-credit" href="/credits">Источники</Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
