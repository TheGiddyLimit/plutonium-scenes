import {WallDataOptimizer} from "./EntityDataOptimizer/WallDataOptimizer.js";
import {LightDataOptimizer} from "./EntityDataOptimizer/LightDataOptimizer.js";
import {Cli} from "./Cli.js";
import {JsonReader} from "./JsonReader.js";
import {JsonWriter} from "./JsonWriter.js";
import {RegionDataOptimizer} from "./EntityDataOptimizer/RegionDataOptimizer.js";

class FoundryDataConverter {
	static run () {
		const params = Cli.getParams();

		const wallDataOptimizer = new WallDataOptimizer();
		const lightDataOptimizer = new LightDataOptimizer();
		const regionDataOptimizer = new RegionDataOptimizer();

		const dataOptimizers = [
			wallDataOptimizer,
			lightDataOptimizer,
			regionDataOptimizer,
		];

		const jsons = JsonReader.getJsons({
			file: params.file,
			dir: params.dir,
			isRecursive: !!params.isRecursive,
		});

		const mapEntryMetas = jsons
			.map(json => this._getMapEntryMeta({
				wallDataOptimizer,
				lightDataOptimizer,
				regionDataOptimizer,
				scene: json,
				source: params.source,
				isLights: params.isLights,
				isRegions: params.isRegions,
				isRequireWalls: params.isRequireWalls(),
			}));

		JsonWriter.doWriteMapEntries({mapEntryMetas});

		dataOptimizers
			.forEach(dataOptimizer => dataOptimizer.doLogWarnings());
	}

	static _getSceneLogName (scene) {
		return `"${scene?.name || "(Unnamed)"}" (${scene?._id || "Unknown ID"})`;
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

	static _getMapEntryMeta (
		{
			wallDataOptimizer,
			lightDataOptimizer,
			regionDataOptimizer,
			scene,
			source = null,
			isLights = false,
			isRegions = false,
			isRequireWalls = false,
		},
	) {
		if (!scene?.name) throw new Error(`Scene ${this._getSceneLogName(scene)} had no name!`);

		source ||= scene.flags?.["plutonium"]?.["source"];
		if (!source) throw new Error(`Source was neither provided as an argument, nor in scene flags for scene ${this._getSceneLogName(scene)}!`);

		if (isRequireWalls && !scene.walls?.length) throw new Error(`Scene ${this._getSceneLogName(scene)} had no walls!`);

		const mapEntry = {
			name: scene.name,
			source,
		};

		if (scene.walls?.length) mapEntry.walls = this._getMapEntry_walls({wallDataOptimizer, scene});

		if (isLights && scene.lights?.length) {
			mapEntry.lights = scene.lights
				.map(light => lightDataOptimizer.getOptimizedEntity(light))
				.filter(Boolean);
		}

		if (isRegions && scene.regions?.length) {
			mapEntry.regions = scene.regions
				.map(region => regionDataOptimizer.getOptimizedEntity(region))
				.filter(Boolean);
		}

		return {
			mapEntry,
		};
	}
}

FoundryDataConverter.run();
