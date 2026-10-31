import { derived } from 'svelte/store';
import { lab } from './lab.js';
import { labPreferences } from './labPreferences.js';
import { hasTeacherRole } from './learning.js';

// This preference changes navigation, never the user's role or assessment result.
export const teacherPreview = derived([lab, labPreferences], ([account, preferences]) =>
	hasTeacherRole(account.user?.role) && preferences.teacherUnlockTasks
);
