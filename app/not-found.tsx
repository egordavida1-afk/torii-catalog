import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty-state">
      Страница не найдена. <Link href="/">На главную →</Link>
    </div>
  );
}
