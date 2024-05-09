/**
 * This macro provides a workflow for scaling and copying walls from one scene to another.
 *
 * Usage:
 * - have only 2 scenes, the "source" scene and the "target" scene, in navigation
 * - run the macro
 * - manually determine a scaling factor. For example:
 *   - open the downloaded images in e.g. GIMP
 *   - find an easily-recognizable feature, shared by both images, which you can measure for size, e.g. the opposite walls of a large room
 *     Note that the feature should be as large as possible to provide the most accurate results
 *   - measure the size of the feature in both images
 *   - your scaling factor is: sizeTarget / sizeSource
 * - enter scaling factor
 * - CTRL+A the resulting walls and manually move them into place (using SHIFT to avoid grid snaps if required)
 *
 * Note:
 * - A scene in the navigation bar with Plutonium flags will automatically be chosen as the "target."
 *   A scene in the navigation bar without Plutonium flags will automatically be chosen as the "source."
 *   The easiest way to use the macro is to *only* have two scenes in navigation; a Plutonium scene and a non-Plutonium scene.
 */
(async () => {
	const IGNORED_SCENE_NAMES = new Set([
		"Test",
	]);

	// TODO(Future) guess a distance, e.g.
	//   - get bounding box of original walls
	//   - scale dist between bb and scene edge
	const EDGE_PAD_PX = 50;

	const pGetScenes = async () => {
		const [scenesNav, scenesDir] = [...game.scenes]
			.segregate(scene => scene.navigation && !IGNORED_SCENE_NAMES.has(scene.name));

		const [scenesNavPlut, scenesNavOther] = scenesNav
			.segregate(scene => !!scene.flags?.["plutonium"]);

		if (scenesNavPlut.length === 1 && scenesNavOther.length === 1) return {sceneSource: scenesNavOther[0], sceneTarget: scenesNavPlut[0]};

		const {$modalInner, doClose, pGetResolved, doAutoResize} = await UiUtil.pGetShowModal({
			isHeaderBorder: true,
			title: "Select Scenes",
			isMinHeight0: true,
		});

		const comp = BaseComponent.fromObject({
			idSceneSource: scenesNavOther[0]?.id,
			idSceneTarget: scenesNavPlut[0]?.id,
		});

		const selOpts = {
			values: [
				...scenesNav.map(scene => scene.id),
				null,
				...scenesDir.map(scene => scene.id),
			],
			isAllowNull: true,
			fnDisplay: sceneId => {
				if (sceneId == null) return "\u2014";
				return game.scenes.get(sceneId)?.name || "(Missing Scene)";
			},
			displayNullAs: "Select Scene",
		};

		const $selSceneSource = ComponentUiUtil.$getSelEnum(comp, "idSceneSource", selOpts);

		const $selSceneTarget = ComponentUiUtil.$getSelEnum(comp, "idSceneTarget", selOpts);

		const $btnSwap = $(`<button class="btn btn-xs" title="Swap"><i class="fa-solid fa-rotate"></i></button>`)
			.on("click", () => {
				const {idSceneSource, idSceneTarget} = comp._state;
				comp._state.idSceneSource = idSceneTarget;
				comp._state.idSceneTarget = idSceneSource;
			});

		const $btnSubmit = $(`<button class="btn btn-primary btn-sm">Submit</button>`)
			.on("click", async () => {
				if (comp._state.idSceneSource == null || comp._state.idSceneTarget == null) {
					ui.notifications.warning(`Please select two scenes!`);
					return;
				}

				if (comp._state.idSceneSource === comp._state.idSceneTarget) {
					ui.notifications.warning(`Source and target were the same scene!`);
					return;
				}

				await doClose(true, {sceneSource: game.scenes.get(comp._state.idSceneSource), sceneTarget: game.scenes.get(comp._state.idSceneTarget)});
			});

		$$($modalInner)`
		<div class="ve-flex-v-center w-100">
			<div class="ve-flex-col mr-1 w-100 min-w-0">
				<label class="ve-flex-v-center mb-2"><span class="mr-2 w-80p text-right bold">Source:</span>${$selSceneSource}</label>
				<label class="ve-flex-v-center"><span class="mr-2 w-80p text-right bold">Target:</span>${$selSceneTarget}</label>
			</div>
			
			<div class="ve-flex-v-center mr-2">
				${$btnSwap}
			</div>
			
			<div>
				${$btnSubmit}
			</div>
		</div>`;

		doAutoResize();

		const [isDataEntered, {sceneSource, sceneTarget} = {}] = await pGetResolved();
		if (!isDataEntered) return null;

		return {sceneSource, sceneTarget};
	};

	const scenes = await pGetScenes();
	if (scenes == null) return;

	const {sceneSource, sceneTarget} = scenes;

	const pDownloadImage = async (scene, filenamePart) => {
		if (scene.background.src == null) return;

		const url = new URL(scene.background.src, window.location.origin);
		const filenameOriginal = url.pathname.split("/").at(-1);
		const filename = `${filenamePart}.${filenameOriginal.split(".").at(-1)}`;
		const blob = await (await fetch(url)).blob();
		const dataUrl = window.URL.createObjectURL(blob);
		DataUtil.userDownloadDataUrl(filename, dataUrl);
		setTimeout(() => window.URL.revokeObjectURL(dataUrl), 100);
	};
	await pDownloadImage(sceneTarget, "target");
	await pDownloadImage(sceneSource, "source");

	const pGetScale = async (scene) => {
		if (scene.background.src == null) return 1;

		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				resolve(Math.round((scene.height / img.naturalHeight) * 100) / 100);
			};
			img.onerror = reject;
			img.src = scene.background.src;
		});
	};
	const scaleScenePlut = await pGetScale(sceneTarget);
	const scaleSceneOther = await pGetScale(sceneSource);

	const scaleFactorUser = await InputUiUtil.pGetUserNumber({title: "Enter Scale Factor"});

	const scaleFactor = scaleFactorUser * scaleScenePlut / scaleSceneOther;

	const walls = sceneSource.walls
		.map(wall => {
			wall = MiscUtil.copyFast(wall._source);
			delete wall._id;
			wall.c = wall.c
				.map(pt => Math.round(pt * scaleFactor));
			return wall;
		});

	const minX = Math.min(...walls.flatMap(wall => [wall.c[0], wall.c[2]]));
	const minY = Math.min(...walls.flatMap(wall => [wall.c[1], wall.c[3]]));

	walls.forEach(wall => {
		wall.c[0] -= minX + EDGE_PAD_PX;
		wall.c[1] -= minY + EDGE_PAD_PX;
		wall.c[2] -= minX + EDGE_PAD_PX;
		wall.c[3] -= minY + EDGE_PAD_PX;
	});

	await sceneTarget.createEmbeddedDocuments("Wall", walls);

	if (canvas.scene.id !== sceneTarget.id) sceneTarget.activate();
})();
