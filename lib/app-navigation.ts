export const VUES = [
  'overview',
  'warband',
  'combat',
  'spells',
  'campaign',
  'library',
  'homebrew',
  'settings',
] as const;

export type Vue = (typeof VUES)[number];

export function hashPourVue(vue: Vue) {
  return `#/${vue}`;
}

export function hashPourBande(slug: string) {
  return `#/library/${encodeURIComponent(slug)}`;
}

export function vueDepuisHash(hash: string): Vue {
  const [candidate] = hash.replace(/^#\/?/, '').split('/');
  return VUES.includes(candidate as Vue) ? (candidate as Vue) : 'overview';
}

export function bandeDepuisHash(hash: string) {
  const [vue, slug, reste] = hash.replace(/^#\/?/, '').split('/');
  if (vue !== 'library' || !slug || reste) return null;
  try {
    return decodeURIComponent(slug);
  } catch {
    return null;
  }
}
