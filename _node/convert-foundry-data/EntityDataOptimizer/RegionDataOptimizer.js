import {EntityDataOptimizerBase, EntityDataOptimizerSimpleBase} from "./EntityDataOptimizerBase.js";

class _RegionRootDataOptimizer extends EntityDataOptimizerSimpleBase {
	// See:
	// `CONFIG.Region.documentClass.schema.getInitialValue()`
	_defaultEntity = {
		"_id": null,
		"name": "",
		"color": "#cc5528",
		"shapes": [],
		"elevation": {
			"bottom": null,
			"top": null,
			"topInclusive": false
		},
		"levels": [],
		"restriction": {
			"enabled": false,
			"type": "move",
			"priority": 0
		},
		"attachment": {
			"token": null
		},
		"behaviors": [],
		"visibility": 4,
		"highlightMode": "shapes",
		"displayMeasurements": false,
		"hidden": false,
		"locked": false,
		"ownership": {
			"default": 0
		},
		"flags": {},
		"_shapeConstraints": null
	};
}

class _RegionShapeDataOptimizer extends EntityDataOptimizerSimpleBase {
	// See:
	// `Object.values(foundry.data.BaseShapeData.TYPES).reduce((accum, Model) => Object.assign(accum, Model.schema.getInitialValue()), {})`
	_defaultEntity = {
		"type": "grid",
		"hole": false,
		"anchorX": 0,
		"anchorY": 0,
		"rotation": 0,
		"gridBased": false,
		"curvature": "round",
		"points": [],
		"origin": null,
		"offsets": []
	};

	_requiredKeyPaths = [
		"type",
		"x",
		"y",
		"radiusX",
		"radiusY",
		"width",
		"height",
		"points",
	];
}

class _RegionBehaviorDataOptimizer extends EntityDataOptimizerSimpleBase {
	// See:
	// `CONFIG.RegionBehavior.documentClass.schema.getInitialValue()`
	_defaultEntity = {
		"name": "",
		"type": null,
		"system": {
			// region `CONFIG.RegionBehavior.dataModels.teleportToken.schema.getInitialValue()`
			"destinations": [],
			"placement": "random",
			"snap": true,
			"choice": false,
			"revealed": false,
			"dialog": {
				"revealed": null,
				"unrevealed": null
			},
			"transition": {
				"type": null,
				"duration": 1500
			},
			// endregion
		},
		"disabled": false,
		"flags": {},
	};

	constructor ({sceneIdMapper, regionIdMapper}) {
		super();
		this._sceneIdMapper = sceneIdMapper;
		this._regionIdMapper = regionIdMapper;
	}

	getOptimizedEntity (entity) {
		const out = super.getOptimizedEntity(entity);
		if (!out) return out;

		if (out.system?.destinations?.length) {
			out.system.destinations = out.system.destinations
				.map(destination => {
					const mDestination = /^Scene\.(?<sceneId>[^.]+)\.Region\.(?<regionId>[^.]+)$/i.exec(destination);
					if (!mDestination) throw new Error(`Unhandled "destination" format "${destination}"!`);
					const {sceneId, regionId} = mDestination.groups;
					return {
						foundryIdScene: this._sceneIdMapper.getMappedId({id: sceneId, name: entity._parent._parent.name}),
						foundryIdRegion: this._regionIdMapper.getMappedId({id: regionId, name: entity._parent.name}),
					};
				});
		}

		return out;
	}
}

export class RegionDataOptimizer extends EntityDataOptimizerBase {
	constructor ({sceneIdMapper, regionIdMapper}) {
		super();
		this._sceneIdMapper = sceneIdMapper;
		this._regionIdMapper = regionIdMapper;

		this._optimizerRoot = new _RegionRootDataOptimizer();
		this._optimizerShape = new _RegionShapeDataOptimizer();
		this._optimizerBehavior = new _RegionBehaviorDataOptimizer({sceneIdMapper, regionIdMapper});

		this._optimizers = [
			this._optimizerRoot,
			this._optimizerShape,
			this._optimizerBehavior,
		];
	}

	getOptimizedEntity (entity) {
		const out = this._optimizerRoot.getOptimizedEntity(entity);
		if (!out) return out;

		if (out.shapes?.length) {
			out.shapes = out.shapes
				.map(entSub => this._optimizerShape.getOptimizedEntity(entSub))
				.filter(Boolean);
		} else delete out.shapes;

		if (out.behaviors?.length) {
			out.behaviors = out.behaviors
				.map(entSub => {
					return this._optimizerBehavior.getOptimizedEntity({...entSub, _parent: entity});
				})
				.filter(Boolean);
		} else delete out.behaviors;

		if (!out.shapes && !out.behaviors) return null;

		return out;
	}

	doLogWarnings () {
		this._optimizers
			.forEach(it => it.doLogWarnings());
	}
}
