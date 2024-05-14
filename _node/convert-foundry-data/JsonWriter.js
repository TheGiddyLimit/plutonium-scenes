import {readJsonSync, writeJsonSync} from "5etools-utils/lib/UtilFs.js";
import fs from "fs";
import {Um} from "5etools-utils";

export class JsonWriter {
	static _LOG_TAG_WRITE = "WRITE";

	static _getSortedMapEntries (mapEntries) {
		return mapEntries
			.sort((a, b) => a.name.localeCompare(b.name, {sensitivity: "base"}));
	}

	static _getMapEntryIdentifier (mapEntry) {
		return [mapEntry.name.toLowerCase(), mapEntry.source.toLowerCase()].join("_");
	}

	static doWriteMapEntries ({mapEntryMetas}) {
		let isIndexUpdate = false;
		const fpathIndex = `data/foundry-index.json`;
		const indexJson = readJsonSync(fpathIndex);

		Object.entries(
			mapEntryMetas
				.reduce(
					(all, mapEntryMeta) => {
						(all[`${mapEntryMeta.mapEntry.source}__${mapEntryMeta.adventureBookType}`] ||= []).push(mapEntryMeta);
						return all;
					},
					{},
				),
		)
			.forEach(([, mapEntryMetasGrouped]) => {
				const [{mapEntry: {source}, adventureBookType}] = mapEntryMetasGrouped;
				const mapEntriesGrouped = mapEntryMetasGrouped.map(({mapEntry}) => mapEntry);

				const fname = `foundry-${adventureBookType}-${source.toLowerCase()}.json`;
				const fpath = `data/${fname}`;

				if (!fs.existsSync(fpath)) {
					writeJsonSync(fpath, {map: this._getSortedMapEntries(mapEntriesGrouped)});
					Um.info(this._LOG_TAG_WRITE, `Wrote ${source} map entries to "${fpath}" (${mapEntriesGrouped.length} new; 0 updates)`);
					isIndexUpdate = true;
					indexJson[source] = fname;
					return;
				}

				const json = readJsonSync(fpath);
				const mapEntryIds = new Set(mapEntriesGrouped.map(map => this._getMapEntryIdentifier(map)));

				let cntUpdated = 0;
				json.map = this._getSortedMapEntries(
					[
						...json.map
							.filter(map => {
								if (!mapEntryIds.has(this._getMapEntryIdentifier(map))) return true;
								cntUpdated++;
							}),
						...mapEntriesGrouped,
					],
				);

				writeJsonSync(fpath, json, {isClean: true});

				Um.info(this._LOG_TAG_WRITE, `Wrote ${source} map entries to "${fpath}" (${mapEntriesGrouped.length - cntUpdated} new; ${cntUpdated} update${cntUpdated === 1 ? "" : "s"})`);

				if (indexJson[source]) return;

				isIndexUpdate = true;
				indexJson[source] = fname;
			});

		if (!isIndexUpdate) return;

		const indexJsonOut = {};
		Object.entries(indexJson)
			.sort(([a], [b]) => a.localeCompare(b, {sensitivity: "base"}))
			.forEach(([source, fname]) => indexJsonOut[source] = fname);
		writeJsonSync(fpathIndex, indexJsonOut, {isClean: true});
		Um.info(this._LOG_TAG_WRITE, `Updated index`);
	}
}
