import {Command, Option} from "commander";

export class Cli {
	static _Params = class {
		file;
		dir;
		isRecursive;
		source;
		isLights;
		type;

		constructor (
			params,
		) {
			this.file = params.file;
			this.dir = params.dir;
			this.isRecursive = params.recurse;
			this.source = params.source;
			this.isLights = params.lights;
			this.type = params.type;
		}
	};

	static getParams () {
		const program = new Command()
			.option("--file <file>", `Path to exported Foundry "fvtt-Scene-*.json" file.`)
			.option("--dir <dir>", `Path to a directory containing exported Foundry "fvtt-Scene-*.json" file.`)
			.option("-R, --recurse", `If the directories should be recursively searched.`)
			.addOption(
				new Option("--type <type>")
					.choices(["adventure", "book"])
					.makeOptionMandatory(),
			)
			.option("--source <file>", `5etools source (e.g. "LMoP"). This may be omitted when using a Plutonium-imported scene.`)
			.option("--lights", `Additionally convert lights data.`)
		;

		program.parse(process.argv);

		const params = program.opts();

		const cntInputs = [params.file, params.dir].filter(Boolean).length;
		if (cntInputs !== 1) program.error(`Exactly one of "file" and "dir" must be specified!`);

		return new this._Params(params);
	}
}
