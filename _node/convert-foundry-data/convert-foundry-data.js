import fs from "fs";
import path from "path";
import {Command, Option} from "commander";
import {readJsonSync, writeJsonSync} from "5etools-utils/lib/UtilFs.js";
import {Um} from "5etools-utils";

class MiscUtil {
	static getDot (object, dotPath) {
		const path = dotPath.split(".");
		if (object == null) return null;
		for (let i = 0; i < path.length; ++i) {
			object = object[path[i]];
			if (object == null) return object;
		}
		return object;
	}

	static setDot (object, dotPath, val) {
		if (object == null) return object;

		const path = dotPath.split(".");

		const len = path.length;
		for (let i = 0; i < len; ++i) {
			const pathPart = path[i];
			if (i === len - 1) object[pathPart] = val;
			else object = (object[pathPart] = object[pathPart] || {});
		}

		return val;
	}

	static deleteDot (object, dotPath) {
		const path = dotPath.split(".");
		if (object == null) return object;
		for (let i = 0; i < path.length - 1; ++i) {
			object = object[path[i]];
			if (object == null) return object;
		}
		return delete object[path.at(-1)];
	}

	static getKeyPaths (obj) {
		const out = [];

		const recurse = (obj, stack) => {
			if (obj == null) return out.push(stack.join("."));

			if (typeof obj === "object") {
				if (obj instanceof Array) throw new Error("Unimplemented!");

				Object.entries(obj)
					.forEach(([k, v]) => {
						stack.push(k);
						recurse(v, stack);
						stack.pop();
					});

				return;
			}

			out.push(stack.join("."));
		};

		recurse(obj, []);

		return out;
	}
}

/** @abstract */
class EntityDataOptimizer {
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

class WallDataOptimizer extends EntityDataOptimizer {
	_defaultEntity = {
		"light": 20,
		"move": 20,
		"sight": 20,
		"sound": 20,
		"dir": 0,
		"door": 0,
		"ds": 0,
		"threshold": {
			"light": null,
			"sight": null,
			"sound": null,
			"attenuation": false,
		},
		"doorSound": null,
		"flags": {},
	};

	_requiredKeyPaths = [
		"c",
	];

	_ignoredKeyPaths = [
		"flags.ambientdoors",
		"flags.monks-active-tiles",
		"flags.smartdoors",
		"flags.wall-height",
		"flags.wallHeight",
	];
}

class LightDataOptimizer extends EntityDataOptimizer {
	_defaultEntity = {
		"rotation": 0,
		"walls": true,
		"vision": false,
		"config": {
			"alpha": 0.5,
			"angle": 360,
			"coloration": 1,
			"attenuation": 0.5,
			"luminosity": 0.5,
			"saturation": 0,
			"contrast": 0,
			"shadows": 0,
			"animation": {
				"type": null,
				"speed": 5,
				"intensity": 5,
				"reverse": false,
			},
			"darkness": {
				"min": 0,
				"max": 1,
			},
		},
		"hidden": false,
		"flags": {},
	};

	_requiredKeyPaths = [
		"x",
		"y",
		"config.bright",
		"config.dim",
	];
}

class FoundryDataConverter {
	static _LOG_TAG_WRITE = "WRITE";

	static run () {
		const params = this._getCliParams();

		const wallDataOptimizer = new WallDataOptimizer();
		const lightDataOptimizer = new LightDataOptimizer();

		const dataOptimizers = [
			wallDataOptimizer,
			lightDataOptimizer,
		];

		const jsons = this._getJsons({
			file: params.file,
			dir: params.dir,
			isRecursive: !!params.recurse,
		});

		const mapEntries = jsons
			.map(json => this._getMapEntry({
				wallDataOptimizer,
				lightDataOptimizer,
				scene: json,
				source: params.source,
				isLights: params.lights,
			}));

		this._writeMapEntries({mapEntries: mapEntries, type: params.type});

		dataOptimizers
			.forEach(dataOptimizer => dataOptimizer.doLogWarnings());
	}

	static _isJsonFile (fname) {
		return fname.toLowerCase().endsWith(".json");
	}

	static _getJsons ({file, dir, isRecursive}) {
		if (file) return [readJsonSync(file)];

		const dirList = fs.readdirSync(dir);

		const jsons = dirList
			.filter(this._isJsonFile.bind(this))
			.map(fname => readJsonSync(path.join(dir, fname)));

		if (!isRecursive) return jsons;

		return [
			...jsons,
			...dirList
				.filter(fname => fs.statSync(path.join(dir, fname)).isDirectory())
				.flatMap(dirSub => this._getJsons({dir: path.join(dir, dirSub), isRecursive: true})),
		];
	}

	static _getSceneLogName (scene) {
		return `"${scene?.name || "(Unnamed)"}" (${scene?._id || "Unknown ID"})`;
	}

	static _getSortedMapEntries (mapEntries) {
		return mapEntries
			.sort((a, b) => a.name.localeCompare(b.name, {sensitivity: "base"}));
	}

	static _getMapEntryIdentifier (mapEntry) {
		return [mapEntry.name.toLowerCase(), mapEntry.source.toLowerCase()].join("_");
	}

	static _getCliParams () {
		const program = new Command()
			.option("--file <file>", `Path to exported Foundry "fvtt-Scene-*.json" file.`)
			.option("--dir <dir>", `Path to a directory containing exported Foundry "fvtt-Scene-*.json" file.`)
			.option("-R, --recurse", `If the directories should be recursively searched.`)
			.addOption(
				new Option("--type <type>")
					.choices(["adventure", "book"])
					.makeOptionMandatory(),
			)
			.option("--source <file>", `5etools source (e.g. "LMoP"). This may be omitted when using a Plutonium-imported scene.`)
			.option("--lights", `Additionally convert lights data.`)
		;

		program.parse(process.argv);

		const params = program.opts();

		const cntInputs = [params.file, params.dir].filter(Boolean).length;
		if (cntInputs !== 1) program.error(`Exactly one of "file" and "dir" must be specified!`);

		return params;
	}

	static _getMapEntry_walls ({wallDataOptimizer, scene}) {
		const seen = new Set();

		return scene.walls
			.map(wall => wallDataOptimizer.getOptimizedEntity(wall))
			.filter(wall => {
				// Use coordinates as "id", as we do not expect walls with duplicate coords
				const id = wall.c.join("__");
				if (seen.has(id)) return false;
				seen.add(id);
				return true;
			});
	}

	static _getMapEntry ({wallDataOptimizer, lightDataOptimizer, scene, source = null, isLights = false}) {
		if (!scene?.name) throw new Error(`Scene ${this._getSceneLogName(scene)} had no name!`);

		source ||= scene.flags?.["plutonium"]?.["source"];
		if (!source) throw new Error(`Source was neither provided as an argument, nor in scene flags for scene ${this._getSceneLogName(scene)}!`);

		if (!scene.walls?.length) throw new Error(`Scene ${this._getSceneLogName(scene)} had no walls!`);

		const out = {
			name: scene.name,
			source,
			walls: this._getMapEntry_walls({wallDataOptimizer, scene}),
		};

		if (isLights && scene.lights?.length) {
			out.lights = scene.lights
				.map(light => lightDataOptimizer.getOptimizedEntity(light));
		}

		return out;
	}

	static _writeMapEntries ({mapEntries, type}) {
		let isIndexUpdate = false;
		const fpathIndex = `data/foundry-index.json`;
		const indexJson = readJsonSync(fpathIndex);

		Object.entries(
			mapEntries
				.reduce(
					(all, mapEntry) => {
						(all[mapEntry.source] ||= []).push(mapEntry);
						return all;
					},
					{},
				),
		)
			.forEach(([source, mapEntriesBySource]) => {
				const fname = `foundry-${type}-${source.toLowerCase()}.json`;
				const fpath = `data/${fname}`;

				if (!fs.existsSync(fpath)) {
					writeJsonSync(fpath, {map: this._getSortedMapEntries(mapEntriesBySource)});
					Um.info(this._LOG_TAG_WRITE, `Wrote ${source} map entries to "${fpath}" (${mapEntriesBySource.length} new; 0 updates)`);
					isIndexUpdate = true;
					indexJson[source] = fname;
					return;
				}

				const json = readJsonSync(fpath);
				const mapEntryIds = new Set(mapEntriesBySource.map(map => this._getMapEntryIdentifier(map)));

				let cntUpdated = 0;
				json.map = this._getSortedMapEntries(
					[
						...json.map
							.filter(map => {
								if (!mapEntryIds.has(this._getMapEntryIdentifier(map))) return true;
								cntUpdated++;
							}),
						...mapEntriesBySource,
					],
				);

				writeJsonSync(fpath, json, {isClean: true});

				Um.info(this._LOG_TAG_WRITE, `Wrote ${source} map entries to "${fpath}" (${mapEntriesBySource.length - cntUpdated} new; ${cntUpdated} update${cntUpdated === 1 ? "" : "s"})`);

				if (indexJson[source]) return;

				isIndexUpdate = true;
				indexJson[source] = fname;
			});

		if (!isIndexUpdate) return;

		const indexJsonOut = {};
		Object.entries(indexJson)
			.sort(([a], [b]) => a.localeCompare(b, {sensitivity: "base"}))
			.forEach(([source, fname]) => indexJsonOut[source] = fname);
		writeJsonSync(fpathIndex, indexJsonOut, {isClean: true});
		Um.info(this._LOG_TAG_WRITE, `Updated index`);
	}
}

FoundryDataConverter.run();
