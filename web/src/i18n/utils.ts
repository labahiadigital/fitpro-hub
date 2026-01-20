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

// Translate a path from the current language to another language
export function translatePathToLang(currentPath: string, fromLang: Lang, toLang: Lang): string {
  // Remove trailing slash for comparison
  const cleanPath = currentPath.replace(/\/$/, '') || '/';
  
  // If it's the homepage, just return the target language root
  if (cleanPath === '/' || cleanPath === '') {
    return `/${toLang}/`;
  }
  
  // Check if the current path matches any known route in the source language
  const fromRoutes = routes[fromLang];
  const toRoutes = routes[toLang];
  
  for (const [routeKey, routeValue] of Object.entries(fromRoutes)) {
    // Check if current path matches this route (with or without trailing slash)
    if (cleanPath === `/${routeValue}` || cleanPath === `/${routeValue}/`) {
      // Get the translated route for the target language
      const translatedRoute = toRoutes[routeKey as keyof typeof toRoutes];
      return `/${toLang}/${translatedRoute}/`;
    }
  }
  
  // If no translation found, just return the path with new language prefix
  return `/${toLang}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

export { languages, defaultLang };
