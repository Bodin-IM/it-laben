import { schoolRequest } from './lab.js';

/** @typedef {{version:number,unlocked:boolean,preview:boolean,prerequisitePassed:boolean,tasks:{taskId:string,config:any,passedAt:number}[]}} NetworkSnapshot */
/** @param {string} labId @param {boolean} [preview] @returns {Promise<NetworkSnapshot>} */
export const loadNetworkLab = (labId, preview = false) => schoolRequest(`/network-labs/${labId}${preview ? '?preview=1' : ''}`);
/** @param {string} labId @param {string} taskId @param {unknown} config @param {boolean} [preview] @returns {Promise<NetworkSnapshot & {result:any,saved:boolean}>} */
export const saveNetworkCheck = (labId, taskId, config, preview = false) =>
	schoolRequest(`/network-labs/${labId}/${taskId}/check`, { version: 1, config, ...(preview ? { preview: true } : {}) });
