import doBuild from "plutonium-utils/lib/BuildTask.js";
import {Uf} from "5etools-utils";
import {DIST_SUBDIR_MODULE, MODULE_ID, MODULE_TITLE} from "./consts.js";

const packageJson = Uf.readJsonSync(`./package.json`);

export const buildTask = async () => {
	await doBuild({
		dir: DIST_SUBDIR_MODULE,
		moduleDir: null,

		isLevelsPacks: true,

		id: MODULE_ID,
		title: MODULE_TITLE,
		description: "Development helpers for the Plutonium Scenes project.",
		authors: [
			{
				name: "Giddy",
				url: "https://www.patreon.com/Giddy5e",
				discord: "giddy_",
			},
			{
				name: "Lyra",
				discord: "revilowaldow",
			},
		],
		readme: "README.md",
		license: "MIT",
		// Use "latest" as manifest URL, so that when updating the module the user always gets the latest version
		manifest: `https://github.com/TheGiddyLimit/${MODULE_ID}/releases/latest/download/module.json`,
		// Set "download" to this specific version, so that users manually entering the link will receive the version they expect
		download: `https://github.com/TheGiddyLimit/${MODULE_ID}/releases/download/v${packageJson.version}/${MODULE_ID}.zip`,
		compatibility: {
			minimum: "11",
			verified: "12",
		},
		url: "https://www.patreon.com/Giddy5e",
		bugs: "https://discord.gg/nGvRCDs",
	});
};
