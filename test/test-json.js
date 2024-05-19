import * as fs from "fs";

import {Um, JsonTester} from "5etools-utils";

function main () {
	const tester = new JsonTester(
		{
			dirSchema: "test/schema",
			fnGetSchemaId: path => {
				if (path.endsWith("foundry-index.json")) return "foundry-index.json";
				if (path.includes("foundry-maps-")) return "foundry-maps-star.json";
				throw new Error("Unimplemented!");
			},
		},
	);

	const {errors, errorsFull} = tester.getErrors("data");

	if (errors.length) {
		if (!process.env.CI) fs.writeFileSync(`test/test-json.error.log`, errorsFull.join("\n\n=====\n\n"));
		console.error(`Schema test failed (${errors.length} failure${errors.length === 1 ? "" : "s"}).`);
		process.exit(1);
	}

	if (!errors.length) Um.info("JSON", `Schema test passed.`);
}

main();
