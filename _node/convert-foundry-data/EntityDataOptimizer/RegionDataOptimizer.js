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
		"system": {},
		"disabled": false,
		"flags": {},
	};
}

export class RegionDataOptimizer extends EntityDataOptimizerBase {
	constructor () {
		super();
		this._optimizerRoot = new _RegionRootDataOptimizer();
		this._optimizerShape = new _RegionShapeDataOptimizer();
		this._optimizerBehavior = new _RegionBehaviorDataOptimizer();

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

		if (out.behavior?.length) {
			out.behaviors = out.behaviors
				.map(entSub => this._optimizerBehavior.getOptimizedEntity(entSub))
				.filter(Boolean);
		} else delete out.behaviors;

		if (!out.shapes && !out.behavior) return null;

		return out;
	}

	doLogWarnings () {
		this._optimizers
			.forEach(it => it.doLogWarnings());
	}
}
