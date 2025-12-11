import {NameIdGenerator} from "./NameIdGenerator.js";

export class IdMapper {
	constructor () {
		this._idMap = {};
	}

	addMappedId ({id, name}) {
		this._idMap[id] ||= {
			foundryId: new NameIdGenerator({name}).getNextId(),
			isUsed: false,
		};
	}

	getMappedId ({id, name}) {
		if (!this._idMap[id]) throw new Error(`Unknown ID "${id}"!`);
		this._idMap[id].isUsed = true;
		return this._idMap[id].foundryId;
	}

	getUsedMappedId ({id}) {
		if (!this._idMap[id]?.isUsed) return null;
		return this._idMap[id].foundryId;
	}
}
