/**
 * Deliberate publication list for the public build, independent of the school's
 * database. New modules stay hidden until their ID is added here.
 * "active" means available in this catalogue, not active in a school class.
 * @type {import('./modulePublication.js').ModulePublication[]}
 */
export const publicModules = [
	{ id: 'backend', status: 'active', revision: 1, updatedAt: null },
	{ id: 'databaser', status: 'active', revision: 1, updatedAt: null }
];
