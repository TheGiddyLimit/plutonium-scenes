import {EntityDataOptimizerBase, EntityDataOptimizerSimpleBase} from "./EntityDataOptimizerBase.js";

class _RegionRootDataOptimizer extends EntityDataOptimizerSimpleBase {
	// See:
	// `CONFIG.Region.documentClass.schema.getInitialValue()`
	_defaultEntity = {
		"name": "",
		"color": "",
		"shapes": [],
		"elevation": {
			"bottom": null,
			"top": null,
		},
		"behaviors": [],
		"visibility": 0,
		"locked": false,
		"flags": {},
	};
}

class _RegionShapeDataOptimizer extends EntityDataOptimizerSimpleBase {
	_defaultEntity = {
		"rotation": 0,
		"hole": false,
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
			"destination": null,
			"choice": false,
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

		if (out.system?.destination) {
			const mDestination = /^Scene\.(?<sceneId>[^.]+)\.Region\.(?<regionId>[^.]+)$/i.exec(out.system.destination);
			if (!mDestination) throw new Error(`Unhandled "destination" format "${out.system.destination}"!`);
			const {sceneId, regionId} = mDestination.groups;
			out.system.destination = {
				foundryIdScene: this._sceneIdMapper.getMappedId({id: sceneId, name: entity._parent._parent.name}),
				foundryIdRegion: this._regionIdMapper.getMappedId({id: regionId, name: entity._parent.name}),
			};
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
