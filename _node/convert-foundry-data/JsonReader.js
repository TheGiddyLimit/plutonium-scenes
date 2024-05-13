import {readJsonSync} from "5etools-utils/lib/UtilFs.js";
import fs from "fs";
import path from "path";

export class JsonReader {
	static _isJsonFile (fname) {
		return fname.toLowerCase().endsWith(".json");
	}

	static getJsons ({file, dir, isRecursive}) {
		if (file) return [readJsonSync(file)];

		const dirList = fs.readdirSync(dir);

		const jsons = dirList
			.filter(this._isJsonFile.bind(this))
			.map(fname => readJsonSync(path.join(dir, fname)));

		if (!isRecursive) return jsons;

		return [
			...jsons,
			...dirList
				.filter(fname => fs.statSync(path.join(dir, fname)).isDirectory())
				.flatMap(dirSub => this.getJsons({dir: path.join(dir, dirSub), isRecursive: true})),
		];
	}
}
