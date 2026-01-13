function incorrectType(error, val) {
	throw new Error(error + " (" + typeof val + " provided)");
}

function getVariantName(str) {
	if (typeof str !== "string") incorrectType("argument must be a string!", str);
	const map = str.match("([0-9]+x[0-9]+[-.]([0-9]+ppi-)?)(.*)(.(webp)|(jpg)|(png)$)")[3];
	const parts = map.split("_");
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		parts[i] = part[0].toUpperCase() + part.slice(1);
	}

	return parts.join(" ");
}

function changeSceneVariant(scene, backgroundURL) {
	if (!(scene instanceof Scene)) incorrectType("Provided scene is not a scene!", scene);
	if (typeof backgroundURL !== "string") incorrectType("Background is not a string", backgroundURL);

	scene.update({
		background: { src: backgroundURL },
	});
	if (game.settings.get("miskas-variant-picker", "showSuccess"))
		ui.notifications.success(`Changed ${scene.name} background src to ${backgroundURL}`);
}

function generateButtons(variants) {
	const buttons = [];

	variants.forEach((value, key) => {
		buttons.push({
			label: key,
			action: key,
			callback: () => {
				return value;
			},
		});
	});
	return buttons;
}

async function selectVariant(variants) {
	if (!(variants instanceof Map)) incorrectType("variants must be a map!", variants);

	return await foundry.applications.api.DialogV2.wait({
		window: { title: "Select variant" },
		buttons: generateButtons(variants),
	});
}

export async function variantPicker(li) {
	try {
		const sceneId = "Scene." + li.dataset.entryId;
		const scene = fromUuidSync(sceneId);
		const background = scene.background.src;
		const variantPrefix = background.slice(background.lastIndexOf("/") + 1).match("(.*?)(-[0-9]+x[0-9]+)")[1];
		let path;
		let browseFiles;
		if (game.isForge && background.startsWith("https://assets.forge-vtt.com/")) {
			browseFiles = FilePicker.browse;
			path = background.slice(background.indexOf("modules/"), background.lastIndexOf("/"));
			const pathParts = path.split("/");
			const moduleName = pathParts[1];
			const cutName = moduleName.slice(0, moduleName.lastIndexOf("-"));
			const closeMatches = new Set((await browseFiles("data", `modules/${cutName}*`, { wildcard: true })).dirs);

			if (closeMatches.has(`modules/${moduleName}`)) {
				// path already correct
			} else if (closeMatches.has(`modules/${cutName}`)) {
				path = pathParts.pop() + "-" + cutName + "-" + pathParts.slice(1).join("/");
			} else {
				throw new Error(`No module ${moduleName} found`);
			}
		} else {
			browseFiles = foundry.applications.apps.FilePicker.browse;
			path = background.slice(0, background.lastIndexOf("/"));
		}
		const filePickerResult = await browseFiles("data", path);
		const maps = filePickerResult.files.filter((word) => word.search(variantPrefix) > 0);
		const variants = new Map();

		for (const map of maps) {
			variants.set(getVariantName(map), map);
		}
		variants.delete(getVariantName(background));

		if (!variants.size) throw new Error("No variants found");

		const variant = await selectVariant(variants);
		if (!variant && variant !== undefined) {
			ui.notifications.warn("No variants found");
			return;
		} else if (variant === undefined) {
			// Prompt was closed
			return;
		}
		changeSceneVariant(scene, variant);
	} catch (error) {
		ui.notifications.error(error);
	}
}
