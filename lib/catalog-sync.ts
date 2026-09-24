import {
  syncKodikCatalog,
  type KodikSyncResult,
} from "@/lib/kodik";

import {
  syncAniLibertyCatalog,
  type AniLibertySyncResult,
} from "@/lib/aniliberty-sync";

export type CatalogSyncResult = {
  aniliberty: AniLibertySyncResult | null;
  kodik: KodikSyncResult | null;
  errors: string[];
};

export async function syncCatalog(): Promise<CatalogSyncResult> {
  const errors: string[] = [];

  let aniliberty: CatalogSyncResult["aniliberty"] = null;
  let kodik: CatalogSyncResult["kodik"] = null;

  /*
   * AniLiberty — основной источник каталога.
   */
  try {
    aniliberty = await syncAniLibertyCatalog();
  } catch (error) {
    errors.push(
      `AniLiberty: ${
        error instanceof Error
          ? error.message
          : "Ошибка AniLiberty"
      }`
    );
  }

  /*
   * Kodik — отдельный источник видео.
   * Ошибка Kodik не должна ломать обновление каталога AniLiberty.
   */
  const kodikEnabled =
    process.env.KODIK_AUTO_TOKEN
      ?.trim()
      .toLowerCase() !== "false" ||
    Boolean(
      process.env.KODIK_API_TOKEN?.trim()
    );

  if (kodikEnabled) {
    try {
      kodik = await syncKodikCatalog();
    } catch (error) {
      errors.push(
        `Kodik: ${
          error instanceof Error
            ? error.message
            : "Ошибка Kodik"
        }`
      );
    }
  } else {
    errors.push(
      "Kodik отключён: KODIK_AUTO_TOKEN=false и KODIK_API_TOKEN не задан."
    );
  }

  return {
    aniliberty,
    kodik,
    errors,
  };
}
