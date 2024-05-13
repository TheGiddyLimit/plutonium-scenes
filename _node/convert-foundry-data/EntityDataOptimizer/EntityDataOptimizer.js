import {MiscUtil} from "../../MiscUtil.js";

/** @abstract */
export class EntityDataOptimizer {
	_defaultEntity;
	_requiredKeyPaths;
	_ignoredKeyPaths = [];

	_keyPathsUnknown = new Set();

	getOptimizedEntity (entity) {
		entity = {...entity};

		const out = {};
		this._requiredKeyPaths
			.forEach(keyPath => MiscUtil.setDot(out, keyPath, MiscUtil.getDot(entity, keyPath)));

		[
			"_id",
			...this._requiredKeyPaths,
			...this._ignoredKeyPaths,
		].forEach(keyPath => MiscUtil.deleteDot(entity, keyPath));

		const keyPathsDefault = MiscUtil.getKeyPaths(this._defaultEntity);
		const keyPathsEntity = MiscUtil.getKeyPaths(entity);

		const keyPathsUnknown = keyPathsEntity.filter(keyPath => !keyPathsDefault.includes(keyPath));

		keyPathsDefault
			.forEach(keyPath => {
				const valEntity = MiscUtil.getDot(entity, keyPath);

				if (valEntity == null) return;
				if (typeof valEntity === "string" && !valEntity) return;

				const valDefault = MiscUtil.getDot(this._defaultEntity, keyPath);
				if (valEntity === valDefault) return;

				MiscUtil.setDot(out, keyPath, valEntity);
			});

		if (keyPathsUnknown.length) {
			keyPathsUnknown.map(keyPath => keyPath)
				.forEach(keyPath => this._keyPathsUnknown.add(keyPath));
		}

		return out;
	}

	doLogWarnings () {
		if (!this._keyPathsUnknown.size) return;

		const keyPaths = Array.from(this._keyPathsUnknown)
			.sort((a, b) => a.localeCompare(b, {sensitivity: "base"}))
			.map(keyPath => `\t"${keyPath}"`)
			.join("\n");

		console.warn(`Unhandled key paths in ${this.constructor.name}:\n${keyPaths}`);
	}
}
