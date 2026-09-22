import Link from "next/link";
import { loginUser } from "../auth/actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string; blocked?: string; exists?: string; next?: string } }) {
  const next = searchParams.next || "/";
  return (
    <div className="auth-card">
      <div className="page-head"><h1>Вход</h1><p>Для просмотра фильмов и сериалов нужно войти.</p></div>
      <form action={loginUser} className="panel">
        <input type="hidden" name="next" value={next} />
        {searchParams.error && <p className="form-error">Почта или пароль указаны неверно.</p>}
        {searchParams.exists && <p className="form-error">Аккаунт уже есть — войди под ним.</p>}
        {searchParams.blocked && <p className="form-error">Слишком много попыток. Попробуй позже.</p>}
        <div className="field"><label>Email</label><input name="email" type="email" required maxLength={160} autoComplete="email" /></div>
        <div className="field"><label>Пароль</label><input name="password" type="password" required minLength={8} maxLength={128} autoComplete="current-password" /></div>
        <button className="btn" type="submit" style={{ width: "100%" }}>Войти</button>
      </form>
      <p className="auth-note">Нет аккаунта? <Link href={`/register?next=${encodeURIComponent(next)}`}>Зарегистрироваться →</Link></p>
    </div>
  );
}
