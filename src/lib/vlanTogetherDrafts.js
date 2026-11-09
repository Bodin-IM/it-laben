/** @typedef {import('./vlanTogether.js').TogetherDevice} Device */
/** @typedef {import('./vlanTogether.js').AreaDocument} AreaDocument */
/** Compare editable fields, independently of server revisions. @param {Pick<Device,'name'|'config'>|null|undefined} value */
export const deviceDraftKey = (value) => JSON.stringify(value && { name: value.name, config: value.config });
/** @param {AreaDocument} value */
export const documentDraftKey = (value) => JSON.stringify({ areaName: value.areaName, notes: value.notes });

/** A late acknowledgement must preserve edits made while the request was in flight.
 * @param {Device|null} draft @param {Pick<Device,'id'|'revision'|'name'|'config'>} sent @param {Device|undefined} saved
 */
export function acknowledgeDevice(draft, sent, saved) {
	if (!draft || !saved || draft.id !== sent.id || saved.id !== sent.id || draft.revision !== sent.revision || saved.revision !== sent.revision + 1) return draft;
	return deviceDraftKey(draft) === deviceDraftKey(sent)
		? structuredClone(saved) : { ...draft, revision: saved.revision };
}
/** @param {AreaDocument} draft @param {AreaDocument} sent @param {AreaDocument} saved */
export function acknowledgeDocument(draft, sent, saved) {
	if (draft.revision !== sent.revision || saved.revision !== sent.revision + 1) return draft;
	return documentDraftKey(draft) === documentDraftKey(sent)
		? { ...saved } : { ...draft, revision: saved.revision };
}
