import Link from "next/link";
import { register } from "../auth/actions";

export default function RegisterPage({ searchParams }: { searchParams: { error?: string; blocked?: string; next?: string } }) {
  const next = searchParams.next || "/";
  return (
    <div className="auth-card">
      <div className="page-head"><h1>Регистрация</h1><p>Создай аккаунт, чтобы получить доступ к просмотру.</p></div>
      <form action={register} className="panel">
        <input type="hidden" name="next" value={next} />
        {searchParams.error && <p className="form-error">Проверь email и пароль. Пароль — от 8 до 128 символов.</p>}
        {searchParams.blocked && <p className="form-error">Слишком много попыток. Попробуй позже.</p>}
        <div className="field"><label>Email</label><input name="email" type="email" required maxLength={160} autoComplete="email" /></div>
        <div className="field"><label>Пароль</label><input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" /></div>
        <button className="btn" type="submit" style={{ width: "100%" }}>Создать аккаунт</button>
      </form>
      <p className="auth-note">Уже зарегистрирован? <Link href={`/login?next=${encodeURIComponent(next)}`}>Войти →</Link></p>
    </div>
  );
}
