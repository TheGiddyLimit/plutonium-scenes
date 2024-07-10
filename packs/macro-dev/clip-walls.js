/**
 * Clip walls to the current scene boundary.
 *
 * Usage: have some walls with points outside the scene; run.
 */
(async () => {
	const {width, height} = canvas.scene.dimensions;

	const scene0 = {x: 0, y: 0};
	const scene1 = {x: width, y: 0};
	const scene2 = {x: width, y: height};
	const scene3 = {x: 0, y: height};

	const ccw = (A, B, C) => {
		return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
	};

	const isIntersecting = (line1Start, line1End, line2Start, line2End) => {
		return (ccw(line1Start, line2Start, line2End) !== ccw(line1End, line2Start, line2End))
			&& (ccw(line1Start, line1End, line2Start) !== ccw(line1Start, line1End, line2End));
	};

	const toDelete = [];
	const toUpdate = [];

	[...canvas.scene.walls]
		.forEach(wall => {
			const [x0, y0, x1, y1] = wall.c;

			const wall0 = {x: x0, y: y0};
			const wall1 = {x: x1, y: y1};

			if (
				x0 >= 0 && x0 <= width
				&& x1 >= 0 && x1 <= width
				&& y0 >= 0 && y0 <= height
				&& y1 >= 0 && y1 <= height
			) {
				// Wall fully inside bounds; ignore
				return;
			}

			// Wall breaking bounds; clip
			if (isIntersecting(wall0, wall1, scene0, scene1)) return toUpdate.push(wall);
			if (isIntersecting(wall0, wall1, scene1, scene2)) return toUpdate.push(wall);
			if (isIntersecting(wall0, wall1, scene2, scene3)) return toUpdate.push(wall);
			if (isIntersecting(wall0, wall1, scene3, scene0)) return toUpdate.push(wall);

			// Wall fully outside bounds; delete
			toDelete.push(wall);
		});

	if (toDelete.length) await canvas.scene.deleteEmbeddedDocuments("Wall", toDelete.map(wall => wall.id));

	if (!toUpdate.length) return;

	await canvas.scene.updateEmbeddedDocuments(
		"Wall",
		toUpdate.map(wall => {
			const [x0, y0, x1, y1] = wall.c;
			return {
				_id: wall.id,
				c: [
					Math.clamp(x0, 0, width),
					Math.clamp(y0, 0, height),
					Math.clamp(x1, 0, width),
					Math.clamp(y1, 0, height),
				],
			};
		}),
	);
})();
