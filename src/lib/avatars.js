/** Stable IDs are stored on the profile; add future characters without renaming existing ones. */
export const avatars = [
	{ id: 'robot', title: 'Robot', color: '#85c8b1', background: '#193d39', kind: 'robot' },
	{ id: 'fox', title: 'Rev', color: '#eca96d', background: '#483222', kind: 'fox' },
	{ id: 'owl', title: 'Ugle', color: '#b9a2df', background: '#352c4b', kind: 'owl' },
	{ id: 'otter', title: 'Oter', color: '#bf9d7a', background: '#3a302a', kind: 'otter' },
	{ id: 'cat', title: 'Katt', color: '#8cbbda', background: '#253c4c', kind: 'cat' },
	{ id: 'frog', title: 'Frosk', color: '#a2c777', background: '#2d402a', kind: 'frog' },
	{ id: 'penguin', title: 'Pingvin', color: '#93b6d6', background: '#23384e', kind: 'penguin' },
	{ id: 'turtle', title: 'Skilpadde', color: '#a3c88e', background: '#283f34', kind: 'turtle' },
	{ id: 'axolotl', title: 'Axolotl', color: '#edb0c9', background: '#493146', kind: 'axolotl' },
	{ id: 'octopus', title: 'Blekksprut', color: '#b4a4e5', background: '#333051', kind: 'octopus' }
];
export const defaultAvatarId = 'robot';
/** @param {string|null|undefined} id */
export function avatarDefinition(id) {
	return avatars.find((item) => item.id === id) ?? avatars[0];
}
