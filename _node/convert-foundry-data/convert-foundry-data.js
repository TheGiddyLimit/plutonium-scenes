import {WallDataOptimizer} from "./EntityDataOptimizer/WallDataOptimizer.js";
import {LightDataOptimizer} from "./EntityDataOptimizer/LightDataOptimizer.js";
import {Cli} from "./Cli.js";
import {JsonReader} from "./JsonReader.js";
import {JsonWriter} from "./JsonWriter.js";

class FoundryDataConverter {
	static run () {
		const params = Cli.getParams();

		const wallDataOptimizer = new WallDataOptimizer();
		const lightDataOptimizer = new LightDataOptimizer();

		const dataOptimizers = [
			wallDataOptimizer,
			lightDataOptimizer,
		];

		const jsons = JsonReader.getJsons({
			file: params.file,
			dir: params.dir,
			isRecursive: !!params.isRecursive,
		});

		const mapEntries = jsons
			.map(json => this._getMapEntry({
				wallDataOptimizer,
				lightDataOptimizer,
				scene: json,
				source: params.source,
				isLights: params.isLights,
			}));

		JsonWriter.doWriteMapEntries({mapEntries: mapEntries, type: params.type});

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
}

FoundryDataConverter.run();
