/**
 * Usage:
 * - Activate target scene
 * - Run
 * - Go through UI in order :^)
 * - CTRL+A and move walls into place
 *
 * See also:
 * - https://docs.ddb.mrprimate.co.uk/status.html
 * - https://github.com/MrPrimate/ddb-meta-data/tree/main/content/scene_info
 *
 * TODO: better method for GM vs player image sizing (see e.g. `rescale-walls-linked-scene.js`)
 */
(async () => {
	if (!canvas.scene) return ui.notifications.warning(`Please activate a scene first!`);

	// TODO(Future) guess a distance, e.g.
	//   - get bounding box of original walls
	//   - scale dist between bb and scene edge
	const EDGE_PAD_PX = 50;

	const comp = BaseComponent.fromObject({
		githubPat: null,
		ddbiDirs: [],
		ixDdbiDir: null,
		ddbiScenes: [],
		ixDdbiScene: null,
		scalingMethod: "imageSize",
		scalingManual: 1,

		...MiscUtil.copyFast(window._DDB_SCENE_CONVERTER_STATE || {}),
	}, "*");

	comp._addHookAllBase(() => window._DDB_SCENE_CONVERTER_STATE = MiscUtil.copyFast(comp.__state));

	const getHeaders = () => {
		if (!comp.githubPat) return {};

		return {
			Authorization: `token ${comp.githubPat}`,
		};
	};

	const pFetchGhJson = async (url) => {
		return (await fetch(
			url,
			{
				headers: getHeaders(),
			},
		))
			.json();
	};

	const pGetImageDimensions = async (url) => {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				resolve({
					width: img.naturalWidth,
					height: img.naturalHeight,
				});
			};
			img.onerror = reject;
			img.src = url;
		});
	};

	const getSceneName = ghMeta => {
		return `${ghMeta._json.name} \u2014 ${ghMeta._json.walls?.length || 0} wall(s) \u2014 ${ghMeta.name}`;
	};

	const iptGithubPat = ComponentUiUtil.getIptStr(comp, "githubPat");
	comp._addHookBase("githubPat", () => {
		// Clear on navigation, as this is sensitive
		window._SESSION_GITHUB_PAT = comp._state.githubPat;
	})();

	const {eleModalInner, doClose, pGetResolved, doAutoResize} = await UiUtil.pGetShowModal({
		isHeaderBorder: true,
		title: "Convert DDBI Scene Info",
		isMinHeight0: true,
	});

	const {
		setValues: setValuesDdbiDir,
		sel: selDdbiDir,
	} = ComponentUiUtil.getSelEnum(
		comp,
		"ixDdbiDir",
		{
			isAllowNull: true,
			asMeta: true,
			fnDisplay: ghMeta => ghMeta.name,
			values: comp._state.ddbiDirs,
			isSetIndexes: true,
		},
	);

	const btnFetchDirs = veT`<button class="ve-btn ve-btn-xs ve-mr-2">Fetch</button>`
		.vee.onn("click", async () => {
			comp._state.ddbiDirs = await pFetchGhJson(`https://api.github.com/repos/MrPrimate/ddb-meta-data/contents/content/scene_info?ref=main`);
		});
	comp._addHookBase("ddbiDirs", () => setValuesDdbiDir(comp._state.ddbiDirs));

	const {
		setValues: setValuesDdbiScenes,
		sel: selDdbiScene,
	} = ComponentUiUtil.getSelEnum(
		comp,
		"ixDdbiScene",
		{
			isAllowNull: true,
			asMeta: true,
			fnDisplay: ghMeta => getSceneName(ghMeta),
			values: comp._state.ddbiScenes,
			isSetIndexes: true,
		},
	);

	const btnFetchScenes = veT`<button class="ve-btn ve-btn-xs ve-mr-2">Fetch</button>`
		.vee.onn("click", async () => {
			if (comp._state.ixDdbiDir == null) {
				ui.notifications.warning(`Please select a dir first!`);
				return;
			}

			try {
				btnFetchScenes.vee.prop("disabled", true);
				selDdbiScene.vee.prop("disabled", true);
				btnAutoMatchScene.vee.prop("disabled", true);

				const ddbiDir = comp._state.ddbiDirs[comp._state.ixDdbiDir];
				const ddbiScenes = await pFetchGhJson(ddbiDir.url);
				await ddbiScenes.pMap(async ddbiScene => {
					ddbiScene._json ||= await DataUtil.loadRawJSON(ddbiScene.download_url);
				});
				comp._state.ddbiScenes = ddbiScenes;
			} finally {
				btnFetchScenes.vee.prop("disabled", false);
				selDdbiScene.vee.prop("disabled", false);
				btnAutoMatchScene.vee.prop("disabled", false);
			}
		});
	comp._addHookBase("ddbiScenes", () => setValuesDdbiScenes(comp._state.ddbiScenes));

	const getSearchFilename = url => {
		return url.split("/")
			.at(-1)
			.split(".")[0]
			.replace(/^\d+-/, "")
			.toLowerCase()
			.replace(/[^a-z0-9]/g, "");
	};

	const getAutoMatched_originalLink = async () => {
		if (!comp._state.ddbiScenes.every(scene => scene._json)) return null;

		const searchSrc = getSearchFilename(canvas.scene.background.src);

		const ddbiScenesFilt = comp._state.ddbiScenes
			.filter(scene => {
				const originalLink = MiscUtil.get(scene, "_json", "flags", "ddb", "originalLink");
				if (!originalLink?.trim()) return false;

				const searchLnk = getSearchFilename(originalLink.replace(/-player\./, "."));
				return searchSrc === searchLnk;
			});

		if (!ddbiScenesFilt.length) return null;

		if (ddbiScenesFilt.length === 1) return comp._state.ddbiScenes.indexOf(ddbiScenesFilt[0]);

		const choice = await InputUiUtil.pGetUserEnum({
			title: `${ddbiScenesFilt.length} Candidate Scenes`,
			placeholder: "Select a Scene...",
			values: ddbiScenesFilt,
			fnDisplay: ghMeta => getSceneName(ghMeta),
			isResolveItem: true,
		});
		if (choice == null) return null;

		return comp._state.ddbiScenes.indexOf(choice);
	};

	const btnAutoMatchScene = veT`<button class="ve-btn ve-btn-xs">Auto Match</button>`
		.vee.onn("click", async () => {
			if (!comp._state.ddbiScenes.length) return ui.notifications.warning(`Please fetch some scenes first!`);

			const matched = (await getAutoMatched_originalLink()) ??
				// TODO(Future) add more matching methods?
				null;

			if (matched == null) return ui.notifications.warning(`Could not find matching scene!`);
			comp._state.ixDdbiScene = matched;
		});

	const SCALING_METHODS = {
		"manual": "Manual",
		"imageSize": "Image Size",
		"grid": "Grid",
	};

	const selScalingMethod = ComponentUiUtil.getSelEnum(
		comp,
		"scalingMethod",
		{
			values: Object.keys(SCALING_METHODS),
			fnDisplay: method => SCALING_METHODS[method],
		},
	);

	const iptScalingManual = ComponentUiUtil.getIptNumber(comp, "scalingManual", 1, {fallbackOnNaN: 1})
		.vee.tooltip("Manual Scaling")
		.vee.addClass("ve-ml-2")
		.vee.addClass("ve-w-80p")
		.vee.addClass("ve-no-shrink");
	comp._addHookBase("scalingMethod", () => {
		iptScalingManual.vee.toggle(comp._state.scalingMethod === "manual");
	})();

	const btnSubmit = veT`<button class="ve-btn ve-btn-sm ve-btn-primary" title="SHIFT to Submit and Close">Submit</button>`
		.vee.onn("click", async evt => {
			if (comp._state.ixDdbiScene == null) return ui.notifications.warning(`Please select a scene first!`);

			const ddbiScene = comp._state.ddbiScenes[comp._state.ixDdbiScene];

			if (!ddbiScene._json.walls?.length) return ui.notifications.warning(`Scene has no walls!`);

			let scale = 1;

			switch (comp._state.scalingMethod) {
				case "manual": {
					scale = comp._state.scalingManual;
					break;
				}
				case "imageSize": {
					// (Assume same aspect ratio; ignore height component)
					const {width: widthTarget, height: heightTarget} = await pGetImageDimensions(canvas.scene.background.src);
					const {width: widthSource, height: heightSource} = ddbiScene._json;

					const currentBgScale = canvas.scene.width / widthTarget;

					scale = currentBgScale * widthTarget / widthSource;

					break;
				}
				case "grid": {
					// (Assume same aspect ratio; ignore height component)
					const {width: widthTarget, height: heightTarget} = await pGetImageDimensions(canvas.scene.background.src);

					const currentBgScale = canvas.scene.width / widthTarget;

					const gridTarget = canvas.scene.grid.size;
					const gridDistanceTarget = canvas.scene.grid.distance;

					const {grid: gridSource, gridDistance: gridDistanceSource} = ddbiScene._json;

					scale = currentBgScale * gridTarget / gridSource * gridDistanceTarget / gridDistanceSource;

					break;
				}

				default: throw new Error(`Unhandled scaling method "${comp._state.scalingMethod}"!`);
			}

			const walls = ddbiScene._json.walls
				.map(wall => {
					wall = MiscUtil.copyFast(wall);
					wall.c = wall.c
						.map(pt => Math.round(pt * scale));
					return wall;
				});

			const minX = Math.min(...walls.flatMap(wall => [wall.c[0], wall.c[2]]));
			const minY = Math.min(...walls.flatMap(wall => [wall.c[1], wall.c[3]]));

			if (minX < -100 || minY < -100) {
				console.warn(`Adjusting output location...`);
				walls.forEach(wall => {
					wall.c[0] = (wall.c[0] - minX) + EDGE_PAD_PX;
					wall.c[1] = (wall.c[1] - minY) + EDGE_PAD_PX;
					wall.c[2] = (wall.c[2] - minX) + EDGE_PAD_PX;
					wall.c[3] = (wall.c[3] - minY) + EDGE_PAD_PX;
				});
			}

			await canvas.scene.createEmbeddedDocuments("Wall", walls);
			ui.notifications.info(`Created ${walls.length} wall(s) with scaling factor of ${scale}!`);

			if (evt.shiftKey) doClose().then(null);
		});

	veT(eleModalInner)`
		<label class="ve-mb-2 ve-flex-v-center">
			<span class="ve-mr-2 ve-no-shrink ve-w-100p ve-text-right ve-muted" title="If you hit the GitHub API rate limit, create a Personal Access Token and enter it here.">Github PAT</span>
			${iptGithubPat}
		</label>
		<div class="ve-mb-2 ve-flex-v-center">
			<span class="ve-mr-2 ve-no-shrink ve-w-100p ve-text-right">Source Dir</span>
			${btnFetchDirs}
			${selDdbiDir}
		</div>
		<div class="ve-mb-2 ve-flex-v-center">
			<span class="ve-mr-2 ve-no-shrink ve-w-100p ve-text-right">Scene</span>
			${btnFetchScenes}
			${selDdbiScene.vee.addClass("ve-mr-2")}
			${btnAutoMatchScene}
		</div>
			<label class="ve-mb-2 ve-flex-v-center">
			<span class="ve-mr-2 ve-no-shrink ve-w-100p ve-text-right">Scaling Method</span>
			${selScalingMethod}
			${iptScalingManual}
		</label>
		<div class="ve-mb-2 ve-flex-h-right ve-pr-3">${btnSubmit}</div>
	`;

	doAutoResize();
})();
