import { ui, defaultLang, showDefaultLang, routes, languages } from './ui';

export type Lang = keyof typeof ui;

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]): string {
    return ui[lang][key] || ui[defaultLang][key];
  };
}

export function useTranslatedPath(lang: Lang) {
  return function translatePath(path: string, l: Lang = lang): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return !showDefaultLang && l === defaultLang ? cleanPath : `/${l}${cleanPath}`;
  };
}

export function getRouteFromUrl(url: URL): string | undefined {
  const pathname = new URL(url).pathname;
  const parts = pathname?.split('/').filter(Boolean);
  // Remove language prefix if present
  if (parts[0] in languages) {
    parts.shift();
  }
  return parts.join('/') || undefined;
}

export function getLocalizedRoute(route: keyof (typeof routes)[typeof defaultLang], lang: Lang): string {
  return routes[lang][route] || routes[defaultLang][route];
}

export { languages, defaultLang };
