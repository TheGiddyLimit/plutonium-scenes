/**
 * This macro allows basic wall-rescaling for an entire scene.
 *
 * Usage:
 * - Activate scene containing walls to be scaled
 * - Run macro
 */
(async () => {
	const scaleFactor = await InputUiUtil.pGetUserNumber({title: "Enter Scale Factor"});

	await canvas.scene.updateEmbeddedDocuments(
		"Wall",
		canvas.scene.walls
			.map(wall => ({
				_id: wall.id,
				c: wall.c
					.map(point => point * scaleFactor),
			})),
	);
})();
