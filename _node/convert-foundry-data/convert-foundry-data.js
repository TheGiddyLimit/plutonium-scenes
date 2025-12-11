import {WallDataOptimizer} from "./EntityDataOptimizer/WallDataOptimizer.js";
import {LightDataOptimizer} from "./EntityDataOptimizer/LightDataOptimizer.js";
import {Cli} from "./Cli.js";
import {JsonReader} from "./JsonReader.js";
import {JsonWriter} from "./JsonWriter.js";
import {RegionDataOptimizer} from "./EntityDataOptimizer/RegionDataOptimizer.js";
import {IdMapper} from "./IdMapper.js";

class FoundryDataConverter {
	static run () {
		const params = Cli.getParams();

		const sceneIdMapper = new IdMapper();
		const regionIdMapper = new IdMapper();

		const wallDataOptimizer = new WallDataOptimizer();
		const lightDataOptimizer = new LightDataOptimizer();
		const regionDataOptimizer = new RegionDataOptimizer({sceneIdMapper, regionIdMapper});

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

		// Pre-populate ID lookups
		jsons
			.forEach(json => {
				const sceneId = this._getSceneId(json);
				if (!sceneId) throw new Error(`Could not determine scene ID!`);

				sceneIdMapper.addMappedId({id: sceneId, name: json.name});

				if (json.regions) {
					json.regions
						.forEach(region => {
							regionIdMapper.addMappedId({id: region._id, name: region.name});
						});
				}
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

		// Post-step to add `foundryId`s to any entries which require them in order
		//   for region links to function
		jsons
			.forEach((json, ix) => {
				const mappedEntryMeta = mapEntryMetas[ix];

				const foundryId = sceneIdMapper.getUsedMappedId({id: this._getSceneId(json)});
				if (foundryId) mappedEntryMeta.mapEntry.foundryId = foundryId;

				if (json.regions) {
					json.regions
						.forEach((region, ix) => {
							const mappedRegionMeta = mappedEntryMeta.mapEntry.regions[ix];
							if (!mappedRegionMeta) return;

							const foundryId = regionIdMapper.getUsedMappedId({id: region._id});
							if (foundryId) mappedRegionMeta.foundryId = foundryId;
						});

					json.regions = json.regions.filter(Boolean);
				}
			});

		JsonWriter.doWriteMapEntries({mapEntryMetas});

		dataOptimizers
			.forEach(dataOptimizer => dataOptimizer.doLogWarnings());
	}

	static _getSceneId (scene) {
		return scene._id || scene._stats?.exportSource?.uuid?.split(".")?.at(-1);
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
				.map(region => regionDataOptimizer.getOptimizedEntity({...region, _parent: scene}));
		}

		return {
			mapEntry,
		};
	}
}

FoundryDataConverter.run();
