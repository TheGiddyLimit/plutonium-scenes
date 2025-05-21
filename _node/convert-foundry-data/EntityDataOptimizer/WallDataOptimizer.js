import {EntityDataOptimizer} from "./EntityDataOptimizer.js";

export class WallDataOptimizer extends EntityDataOptimizer {
	// See:
	// `CONFIG.Wall.documentClass.schema.getInitialValue()`
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
		"flags.elevatedvision",
		"flags.LocknKey",
		"flags.monks-active-tiles",
		"flags.smartdoors",
		"flags.wall-height",
		"flags.wallHeight",

		// region https://foundryvtt.com/packages/perceptive
		"flags.perceptive",

		"flags.canbeLockpeekedFlag",
		"flags.DoorHingePositionFlag",
		"flags.DoorMovementFlag",
		"flags.DoormovingWallIDFlag",
		"flags.DoorSwingRangeFlag",
		"flags.DoorSlideSpeedFlag",
		"flags.DoorSlideStateFlag",
		"flags.DoorSwingSpeedFlag",
		"flags.DoorSwingStateFlag",
		"flags.LockpeekedbyFlag",
		"flags.LockPeekingWallIDsFlag",
		"flags.LockPeekPositionFlag",
		"flags.LockPeekSizeFlag",
		"flags.PeekingDCFlag",
		"flags.PreventNormalOpenFlag",
		// endregion
	];
}
