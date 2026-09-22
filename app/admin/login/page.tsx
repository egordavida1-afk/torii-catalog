import Link from "next/link";
import { login } from "./actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string; blocked?: string; next?: string } }) {
  const next = searchParams.next || "/admin";
  return (
    <div className="auth-card">
      <div className="page-head"><h1>Вход в админку</h1><p>Раздел управления каталогом.</p></div>
      <form action={login} className="panel">
        <input type="hidden" name="next" value={next} />
        {searchParams.blocked && <p className="form-error">Слишком много попыток входа. Попробуй позже.</p>}
        {searchParams.error && <p className="form-error">Неверный логин или пароль.</p>}
        <div className="field"><label>Логин</label><input name="username" required autoFocus maxLength={100} /></div>
        <div className="field"><label>Пароль</label><input name="password" type="password" required maxLength={128} /></div>
        <button className="btn" type="submit" style={{ width: "100%" }}>Войти</button>
      </form>
      <p className="auth-note"><Link href="/">← На сайт</Link></p>
    </div>
  );
}
