import { en } from './locales/en.js';
import { es } from './locales/es.js';
import { fr } from './locales/fr.js';

const locales = { en, es, fr };

let currentLocale = localStorage.getItem('lang') || 'en';

/** Returns the translated string for the given key in the current locale, with optional param interpolation. */
export function t(key, params = {}) {
  const template = locales[currentLocale]?.[key] ?? locales['en'][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}

/** Returns the current locale code (e.g. 'en', 'es'). */
export function getLang() {
  return currentLocale;
}

/**
 * Changes the active locale, persists it to localStorage, and re-renders
 * all elements that carry a data-i18n attribute.
 */
export function setLocale(lang) {
  if (!locales[lang]) return;
  currentLocale = lang;
  localStorage.setItem('lang', lang);
  applyTranslations();
}

/**
 * Walks the live DOM and updates every element that has a data-i18n attribute.
 * Also updates document.title.
 */
export function applyTranslations() {
  document.title = t('page_title');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}
