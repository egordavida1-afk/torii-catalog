import { redirect } from "next/navigation";

export default function LegacyAdminLogin({ searchParams }: { searchParams: { next?: string } }) {
  redirect(`/login?next=${encodeURIComponent(searchParams.next || "/admin")}`);
}
