import Link from "next/link";
import { loginUser } from "../auth/actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string; blocked?: string; exists?: string; next?: string } }) {
  const next = searchParams.next || "/";
  const adminLogin = next.startsWith("/admin");
  return (
    <div className="auth-card">
      <div className="page-head"><h1>Вход</h1><p>Войди, чтобы смотреть фильмы, сериалы и аниме.</p></div>
      <form action={loginUser} className="panel">
        <input type="hidden" name="next" value={next} />
        {searchParams.error && <p className="form-error">Логин/почта или пароль указаны неверно.</p>}
        {searchParams.exists && <p className="form-error">Аккаунт уже есть — войди под ним.</p>}
        {searchParams.blocked && <p className="form-error">Слишком много попыток. Попробуй позже.</p>}
        <div className="field"><label>Email или логин</label><input name="login" type="text" required maxLength={160} autoComplete="username" /></div>
        <div className="field"><label>Пароль</label><input name="password" type="password" required minLength={8} maxLength={128} autoComplete="current-password" /></div>
        <button className="btn" type="submit" style={{ width: "100%" }}>Войти</button>
      </form>
      {!adminLogin && <p className="auth-note">Нет аккаунта? <Link href={`/register?next=${encodeURIComponent(next)}`}>Зарегистрироваться →</Link></p>}
    </div>
  );
}
