import {EntityDataOptimizer} from "./EntityDataOptimizer.js";

export class LightDataOptimizer extends EntityDataOptimizer {
	// See:
	// `CONFIG.AmbientLight.documentClass.schema.getInitialValue()`
	_defaultEntity = {
		"elevation": 0,
		"rotation": 0,
		"walls": true,
		"vision": false,
		"config": {
			"negative": false,
			"priority": 0,
			"alpha": 0.5,
			"angle": 360,
			"color": null,
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
