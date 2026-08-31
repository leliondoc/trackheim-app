export const VUES = [
  'overview',
  'warband',
  'campaign',
  'library',
  'homebrew',
  'settings',
] as const;

export type Vue = (typeof VUES)[number];

export function hashPourVue(vue: Vue) {
  return `#/${vue}`;
}

export function vueDepuisHash(hash: string): Vue {
  const candidate = hash.replace(/^#\/?/, '');
  return VUES.includes(candidate as Vue) ? (candidate as Vue) : 'overview';
}
