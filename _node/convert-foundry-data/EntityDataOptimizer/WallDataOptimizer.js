import {EntityDataOptimizer} from "./EntityDataOptimizer.js";

export class WallDataOptimizer extends EntityDataOptimizer {
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
