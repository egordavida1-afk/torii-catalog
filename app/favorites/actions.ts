"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";

export async function toggleFavorite(animeId: string, slug: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/anime/${slug}`)}`);
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_animeId: { userId: user.id, animeId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({ data: { userId: user.id, animeId } });
  }

  revalidatePath(`/anime/${slug}`);
  revalidatePath("/favorites");
  redirect(`/anime/${slug}`);
}
