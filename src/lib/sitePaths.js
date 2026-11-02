import { basePath } from '#lib/deployment.js';

/**
 * Content keeps canonical root paths. Add the deployment prefix only where a
 * path becomes a browser link, download or navigation target.
 * @template {string | null | undefined} T
 * @param {T} href
 * @param {string} [base]
 * @returns {T}
 */
export function siteHref(href, base = basePath) {
	if (!href || !base || !href.startsWith('/') || href.startsWith('//')) return href;
	if (
		href === base ||
		href.startsWith(`${base}/`) ||
		href.startsWith(`${base}?`) ||
		href.startsWith(`${base}#`)
	)
		return href;
	return /** @type {T} */ (`${base}${href}`);
}

/**
 * Compare the current browser path with canonical paths in the content model.
 * @param {string} pathname
 * @param {string} [base]
 */
export function appPathname(pathname, base = basePath) {
	if (base && pathname === base) return '/';
	return base && pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
}
