function incorrectType(error, val) {
	throw new Error(error + " (" + typeof val + " provided)");
}

function getVariantName(str) {
	if (typeof str !== "string") incorrectType("argument must be a string!", str);
	const map = str.match("([0-9]+x[0-9]+[-._]([0-9]+ppi-)?)(.*)(.(webp)|(jpg)|(png)$)")[3];
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
		const path = background.slice(0, background.lastIndexOf("/"));
		let browseFiles;
		// Use global namespace for forge compatibility
		if (game.isForge) browseFiles = FilePicker.browse;
		// Use new namespace if forge is not used
		else browseFiles = foundry.applications.apps.FilePicker.browse;
		const filePickerResult = await browseFiles("data", path);
		const maps = filePickerResult.files.filter((map) => map.search(variantPrefix) > 0);
		const variants = new Map();

		for (const map of maps) variants.set(getVariantName(map), map);
		variants.delete(getVariantName(background));

		if (variants.size <= 0) throw new Error("No variants found");

		const variant = await selectVariant(variants);

		if (!variant && variant !== null) ui.notifications.error("No variants found");
		if (variant === null) return;

		changeSceneVariant(scene, variant);
		scene.update(await scene.createThumbnail());
	} catch (error) {
		ui.notifications.error(error);
	}
}
