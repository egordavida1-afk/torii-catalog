import { syncKodikCatalog, type KodikSyncResult } from "@/lib/kodik";
import { syncTmdbCatalog } from "@/lib/tmdb";

export type CatalogSyncResult = {
  tmdb: Awaited<ReturnType<typeof syncTmdbCatalog>> | null;
  kodik: KodikSyncResult | null;
  errors: string[];
};

export async function syncCatalog(): Promise<CatalogSyncResult> {
  const tmdbEnabled = Boolean(process.env.TMDB_ACCESS_TOKEN?.trim());
  // Kodik can resolve a public token automatically; an explicit KODIK_API_TOKEN remains an optional override.
  const kodikEnabled = process.env.KODIK_AUTO_TOKEN?.trim().toLowerCase() !== "false" || Boolean(process.env.KODIK_API_TOKEN?.trim());
  if (!tmdbEnabled && !kodikEnabled) {
    throw new Error("TMDB отключён, а автоматический поиск токена Kodik отключён.");
  }

  const errors: string[] = [];
  let tmdb: CatalogSyncResult["tmdb"] = null;
  let kodik: CatalogSyncResult["kodik"] = null;

  // Сначала обновляем TMDB-метаданные, если ключ есть. Это помогает Kodik-синхронизации
  // сопоставлять уже существующие карточки по оригинальному названию и году.
  if (tmdbEnabled) {
    try {
      tmdb = await syncTmdbCatalog();
    } catch (error) {
      errors.push(`TMDB: ${error instanceof Error ? error.message : "Ошибка TMDB"}`);
    }
  }

  // Kodik работает независимо. Даже при ошибке/отсутствии TMDB его новые тайтлы
  // всё равно импортируются как самостоятельный источник каталога.
  if (kodikEnabled) {
    try {
      kodik = await syncKodikCatalog();
    } catch (error) {
      errors.push(`Kodik: ${error instanceof Error ? error.message : "Ошибка Kodik"}`);
    }
  }

  return { tmdb, kodik, errors };
}
