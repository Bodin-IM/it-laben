// Vite supplies these values at build time. Plain Node imports use school mode.
// Public deployments never infer backend availability from the visitor's network.
export const publicMode = import.meta.env?.MODE === 'public';
export const basePath = import.meta.env?.VITE_ITLAB_BASE_PATH ?? '';
