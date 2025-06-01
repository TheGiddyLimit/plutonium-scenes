import {Command} from "commander";

export class Cli {
	static _Params = class {
		file;
		dir;
		isRecursive;
		source;
		isLights;
		isRegions;

		constructor (
			params,
		) {
			this.file = params.file;
			this.dir = params.dir;
			this.isRecursive = params.recurse;
			this.source = params.source;
			this.isLights = params.lights;
			this.isRegions = params.regions;
		}

		isRequireWalls () { return !this.isLights && !this.isRegions; }
	};

	static getParams () {
		const program = new Command()
			.option("--file <file>", `Path to exported Foundry "fvtt-Scene-*.json" file.`)
			.option("--dir <dir>", `Path to a directory containing exported Foundry "fvtt-Scene-*.json" file.`)
			.option("-R, --recurse", `If the directories should be recursively searched.`)
			.option("--source <file>", `5etools source (e.g. "LMoP"). This may be omitted when using a Plutonium-imported scene.`)
			.option("--lights", `Additionally convert lights data.`)
			.option("--regions", `Additionally convert scene region data.`)
		;

		program.parse(process.argv);

		const params = program.opts();

		const cntInputs = [params.file, params.dir].filter(Boolean).length;
		if (cntInputs !== 1) program.error(`Exactly one of "file" and "dir" must be specified!`);

		return new this._Params(params);
	}
}
