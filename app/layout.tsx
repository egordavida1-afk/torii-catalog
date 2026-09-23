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
  title: "Тории — каталог фильмов, сериалов и аниме",
  description: "Каталог фильмов, сериалов и аниме с новинками, жанрами, поиском и просмотром для зарегистрированных пользователей.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "global" } }),
    getCurrentUser(),
  ]);
  const background = settings?.backgroundUrl || "/bg-collage.svg";
  const accent = settings?.defaultAccent || "#E8A33D";
  const buttonText = settings?.buttonTextColor || "#171208";
  return (
    <html lang="ru">
      <body className={`${display.variable} ${body.variable}`} style={{ "--accent": accent, "--accent-ink": buttonText } as React.CSSProperties}>
        <div className="bg-collage" aria-hidden="true" style={{ backgroundImage: `url("${background}")` }} />
        <div className="site-frame">
          <header className="site-header">
            <Link href="/" className="brand"><span className="brand-mark">鳥</span><span className="brand-name">Тории</span></Link>
            <nav className="site-nav" aria-label="Навигация">
              <Link href="/catalog">Каталог</Link>
              {user ? (
                <>
                  <Link href="/favorites">Избранное</Link>
                  <form action={logoutUser} className="nav-form"><button className="nav-link-button" type="submit">Выйти</button></form>
                </>
              ) : <Link href="/login">Войти</Link>}
            </nav>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <span>Каталог фильмов, сериалов и аниме.</span>
            <Link className="tmdb-credit" href="/credits">Источники и TMDB</Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
