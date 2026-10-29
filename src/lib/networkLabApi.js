import { schoolRequest } from './lab.js';

/** @typedef {{version:number,unlocked:boolean,prerequisitePassed:boolean,tasks:{taskId:string,config:any,passedAt:number}[]}} NetworkSnapshot */
/** @param {string} labId @returns {Promise<NetworkSnapshot>} */
export const loadNetworkLab = (labId) => schoolRequest(`/network-labs/${labId}`);
/** @param {string} labId @param {string} taskId @param {unknown} config @returns {Promise<NetworkSnapshot & {result:any,saved:boolean}>} */
export const saveNetworkCheck = (labId, taskId, config) =>
	schoolRequest(`/network-labs/${labId}/${taskId}/check`, { version: 1, config });
