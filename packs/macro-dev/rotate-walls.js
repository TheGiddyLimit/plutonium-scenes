/**
 * Rotate selected walls 90 degrees.
 *
 * Usage: select some walls; run.
 *
 * Based on a macro by `@freeze2689` https://discord.com/channels/170995199584108546/699750150674972743/1153310497765081180
 */
(async () => {
	if (!canvas.walls.controlled.length) return ui.notifications.warn("Please select some walls first!");

	const centerPoint = canvas.walls.controlled
		.reduce((accum, wall) => {
			const [x0, y0, x1, y1] = wall.document.c;
			accum.x += x0 + ((x1 - x0) / 2);
			accum.y += y0 + ((y1 - y0) / 2);
			return accum;
		}, {x: 0, y: 0});
	centerPoint.x /= canvas.walls.controlled.length;
	centerPoint.y /= canvas.walls.controlled.length;

	const walls = canvas.walls.controlled
		.map(wall => {
			const cpy = foundry.utils.duplicate(wall.document);
			const midOffset0 = cpy.c[0] - centerPoint.x;
			const midOffset1 = cpy.c[1] - centerPoint.y;
			const midOffset2 = cpy.c[2] - centerPoint.x;
			const midOffset3 = cpy.c[3] - centerPoint.y;
			cpy.c[0] = centerPoint.x - midOffset1;
			cpy.c[1] = centerPoint.y + midOffset0;
			cpy.c[2] = centerPoint.x - midOffset3;
			cpy.c[3] = centerPoint.y + midOffset2;
			return {_id: cpy._id, c: cpy.c};
		});
	canvas.scene.updateEmbeddedDocuments("Wall", walls);
})();
