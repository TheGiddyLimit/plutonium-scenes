import fs from "fs";
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

class WallDataOptimizer {
	static _DEFAULT_WALL = {
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
		"flags": {},
	};

	static getMinimalWall (wall) {
		wall = {...wall};

		const out = {
			c: wall.c,
		};

		["c", "_id"].forEach(prop => delete wall[prop]);

		const keyPathsDefault = MiscUtil.getKeyPaths(this._DEFAULT_WALL);
		const keyPathsWall = MiscUtil.getKeyPaths(wall);

		const keyPathsUnknown = keyPathsWall.filter(keyPath => !keyPathsDefault.includes(keyPath));

		keyPathsDefault
			.forEach(keyPath => {
				const valWall = MiscUtil.getDot(wall, keyPath);

				if (valWall == null) return;

				const valDefault = MiscUtil.getDot(this._DEFAULT_WALL, keyPath);
				if (valWall === valDefault) return;

				MiscUtil.setDot(out, keyPath, valWall);
			});

		// TODO(Future) more useful handling
		if (keyPathsUnknown.length) console.warn(`Unhandled key paths: ${keyPathsUnknown.map(keyPath => `"${keyPath}"`).join("; ")}`);

		return out;
	}
}

class FoundryDataConverter {
	static _LOG_TAG_WRITE = "WRITE";

	static run () {
		const params = this._getCliParams();

		const json = readJsonSync(params.file);

		const mapEntry = this._getMapEntry({scene: json, source: params.source});

		this._writeMapEntries({mapEntries: [mapEntry], type: params.type});
	}

	static _getSceneLogName (scene) {
		return `"${scene?.name || "(Unnamed)"}" (${scene?._id || "(Unknown ID)"})`;
	}

	static _getSortedMapEntries (mapEntries) {
		return mapEntries
			.sort((a, b) => a.name.localeCompare(b.name, {sensitivity: "base"}));
	}

	static _getMapEntryIdentifier (mapEntry) {
		return [mapEntry.name.toLowerCase(), mapEntry.source.toLowerCase()].join("_");
	}

	static _getCliParams () {
		// TODO(Future) allow directory as input
		const program = new Command()
			.requiredOption("--file <file>", `Path to exported Foundry "fvtt-Scene-*.json" file.`)
			.addOption(
				new Option("--type <type>")
					.choices(["adventure", "book"])
					.makeOptionMandatory(),
			)
			.option("--source <file>", `5etools source (e.g. "LMoP"). This may be omitted when using a Plutonium-imported scene.`)
		;

		program.parse(process.argv);
		return program.opts();
	}

	static _getMapEntry ({scene, source = null}) {
		if (!scene?.name) throw new Error(`Scene ${this._getSceneLogName(scene)} had no name!`);

		source ||= scene.flags?.["plutonium"]?.["source"];
		if (!source) throw new Error(`Source was neither provided as an argument, nor in scene flags for scene ${this._getSceneLogName(scene)}!`);

		const walls = scene.walls;
		if (!walls?.length) throw new Error(`Scene ${this._getSceneLogName(scene)} had no walls!`);

		return {
			name: scene.name,
			source,
			walls: walls
				.map(wall => WallDataOptimizer.getMinimalWall(wall)),
		};
	}

	static _writeMapEntries ({mapEntries, type}) {
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
				const fpath = `data/foundry-${type}-${source.toLowerCase()}.json`;

				if (!fs.existsSync(fpath)) {
					writeJsonSync(fpath, {map: this._getSortedMapEntries(mapEntriesBySource)});
					Um.info(this._LOG_TAG_WRITE, `Wrote ${source} map entries to "${fpath}" (${mapEntriesBySource.length} new; 0 updates)`);
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

				writeJsonSync(fpath, json);

				Um.info(this._LOG_TAG_WRITE, `Wrote ${source} map entries to "${fpath}" (${mapEntriesBySource.length - cntUpdated} new; ${cntUpdated} update${cntUpdated === 1 ? "" : "s"})`);
			});
	}
}

FoundryDataConverter.run();
