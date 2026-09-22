"use client";

import { useEffect, useState } from "react";
import { updateSiteSettings } from "./actions";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function normalizeHex(value: string, fallback: string) {
  const next = value.trim();
  return HEX_RE.test(next) ? next.toUpperCase() : fallback;
}

export default function AppearanceForm({
  backgroundUrl,
  accent,
  buttonTextColor,
}: {
  backgroundUrl: string;
  accent: string;
  buttonTextColor: string;
}) {
  const [draftBackground, setDraftBackground] = useState(backgroundUrl);
  const [draftAccent, setDraftAccent] = useState(accent);
  const [draftButtonText, setDraftButtonText] = useState(buttonTextColor);
  const [savedBackground, setSavedBackground] = useState(backgroundUrl);
  const [savedAccent, setSavedAccent] = useState(accent);
  const [savedButtonText, setSavedButtonText] = useState(buttonTextColor);
  const [dirty, setDirty] = useState(false);
  const [customBackgroundPreview, setCustomBackgroundPreview] = useState(backgroundUrl);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", draftAccent);
    document.documentElement.style.setProperty("--accent-ink", draftButtonText);
    setCustomBackgroundPreview(draftBackground);
  }, [draftAccent, draftButtonText, draftBackground]);

  useEffect(() => {
    setDirty(draftBackground !== savedBackground || draftAccent !== savedAccent || draftButtonText !== savedButtonText);
  }, [draftBackground, draftAccent, draftButtonText, savedBackground, savedAccent, savedButtonText]);

  function chooseAccent(value: string) {
    const next = normalizeHex(value, savedAccent);
    setDraftAccent(next);
  }

  function chooseButtonText(value: string) {
    const next = normalizeHex(value, savedButtonText);
    setDraftButtonText(next);
  }

  function resetDraft() {
    setDraftBackground(savedBackground);
    setDraftAccent(savedAccent);
    setDraftButtonText(savedButtonText);
    document.documentElement.style.setProperty("--accent", savedAccent);
    document.documentElement.style.setProperty("--accent-ink", savedButtonText);
  }

  return (
    <form action={updateSiteSettings} className="appearance-form">
      <div className="appearance-grid">
        <div className="appearance-controls">
          <div className="field">
            <label htmlFor="backgroundUrl">Фон сайта</label>
            <input
              id="backgroundUrl"
              name="backgroundUrl"
              type="url"
              maxLength={2048}
              value={draftBackground}
              onChange={(event) => setDraftBackground(event.target.value)}
              placeholder="https://.../background.jpg"
            />
            <p className="meta">Вставь ссылку на широкое изображение. Для фона тайтла используется отдельная настройка карточки.</p>
          </div>

          <div className="appearance-color-row">
            <div className="field">
              <label htmlFor="accent">Цвет кнопок</label>
              <div className="color-control">
                <input id="accent" type="color" value={normalizeHex(draftAccent, savedAccent)} onChange={(event) => chooseAccent(event.target.value)} aria-label="Выбрать цвет кнопок" />
                <input name="defaultAccent" value={draftAccent} onChange={(event) => setDraftAccent(event.target.value)} onBlur={() => chooseAccent(draftAccent)} maxLength={7} placeholder="#E8A33D" aria-label="HEX цвет кнопок" />
              </div>
            </div>

            <div className="field">
              <label htmlFor="buttonTextColor">Цвет текста на кнопках</label>
              <div className="color-control">
                <input id="buttonTextColor" type="color" value={normalizeHex(draftButtonText, savedButtonText)} onChange={(event) => chooseButtonText(event.target.value)} aria-label="Выбрать цвет текста кнопок" />
                <input name="buttonTextColor" value={draftButtonText} onChange={(event) => setDraftButtonText(event.target.value)} onBlur={() => chooseButtonText(draftButtonText)} maxLength={7} placeholder="#171208" aria-label="HEX цвет текста кнопок" />
              </div>
            </div>
          </div>

          <div className="appearance-actions">
            <button type="button" className="btn btn-secondary" onClick={resetDraft} disabled={!dirty}>Отменить</button>
            <button type="submit" className="btn" disabled={!dirty}>Применить</button>
          </div>
        </div>

        <div className="appearance-preview" aria-label="Предпросмотр оформления">
          <div className="appearance-preview-media" style={{ backgroundImage: customBackgroundPreview ? `url("${customBackgroundPreview}")` : undefined }} />
          <div className="appearance-preview-shade" />
          <div className="appearance-preview-content">
            <span className="eyebrow">Предпросмотр</span>
            <h3>Тории</h3>
            <p>Так будут выглядеть основные кнопки после применения.</p>
            <div className="appearance-preview-buttons">
              <button type="button" className="btn">Смотреть</button>
              <button type="button" className="btn btn-secondary">Подробнее</button>
            </div>
          </div>
        </div>
      </div>
      {!dirty && <p className="appearance-note">Измените фон или цвет и нажмите «Применить».</p>}
    </form>
  );
}
