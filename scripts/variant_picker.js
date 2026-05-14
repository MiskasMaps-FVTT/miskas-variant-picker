function incorrectType(error, val) {
	throw new Error(error + " (" + typeof val + " provided)");
}

function getVariantName(str, regex) {
	if (typeof str !== "string") incorrectType("argument must be a string!", str);
	regex = regex || /[0-9]+x[0-9]+[-._](?:[0-9]+ppi-)?(.+)\.(?:webp|jpg|png)$/;
	const map = str.slice(str.lastIndexOf("/")).match(regex)[1];
	const parts = map.split("_");
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		parts[i] = part[0].toUpperCase() + part.slice(1);
	}

	return parts.join(" ");
}

async function changeSceneVariant(scene, backgroundURL) {
	if (!(scene instanceof Scene)) incorrectType("Provided scene is not a scene!", scene);
	if (typeof backgroundURL !== "string") incorrectType("Background is not a string", backgroundURL);

	const { thumb } = await scene.createThumbnail({ img: backgroundURL });
	const level_idx = scene.firstLevel._id;

	if (game.release.generation >= 14) {
		scene.updateEmbeddedDocuments("Level", [
			{
				_id: level_idx,
				background: { src: backgroundURL },
			},
		]);
		scene.update({
			thumb: thumb,
		});
	} else {
		scene.update({
			background: { src: backgroundURL },
			thumb: thumb,
		});
	}

	if (game.settings.get("miskas-variant-picker", "showSuccess"))
		ui.notifications.success(`Changed ${scene.name} background src to ${backgroundURL}`);
}

function generateButtons(variants) {
	const buttons = [];

	variants.forEach((value, key) => {
		buttons.push({
			label: value,
			action: value,
			callback: () => {
				return key;
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

function filterVariants(variants, filter) {
	if (Object.keus(filter).length === 0) return false;
	variants.entries().forEach((variant) => {
		if (!variant[1].includes(filter?.contains || "")) variants.delete(variant[0]);
		else if (filter.remove) {
			variants.set(
				variant[0],
				variant[1]
					.split(" ")
					.filter((x) => x != filter.contains)
					.join(" "),
			);
		}
	});
}

export async function variantPicker(li) {
	try {
		const sceneId = "Scene." + li.dataset.entryId;
		const scene = fromUuidSync(sceneId);
		const background = game.release.generation >= 14 ? scene.firstLevel.background.src : scene.background.src;
		const flags = scene.flags["miskas-variant-picker"];
		const regex = flags?.regex?.scene ?? /.*-([0-9]+x[0-9]+)?/;
		const lastIndex = background.lastIndexOf("/") + 1;
		const variantPrefix = flags?.prefix ?? background.slice(lastIndex).match(regex)[0];
		const path = background.slice(0, lastIndex);
		// Use global namespace for forge compatibility or new namespace if forge is not used
		const browseFiles = game.isForge ? FilePicker.browse : foundry.applications.apps.FilePicker.browse;
		const filePickerResult = await browseFiles("data", path);
		const maps = filePickerResult.files.filter((map) => map.search(variantPrefix) > 0);
		const variants = new Map();

		for (const map of maps) {
			variants.set(map, getVariantName(map, flags?.regex?.variant));
			console.log(variants.get(map));
		}

		variants.delete(background);

		if (variants.size <= 0) throw new Error("No variants found");

		if (flags?.filter) filterVariants(variants, scene.flags["miskas-variant-picker"].filter);

		const variant = await selectVariant(variants);

		if (!variant && variant !== null) ui.notifications.error("No variants found");
		if (variant === null) return;

		changeSceneVariant(scene, variant);
	} catch (error) {
		ui.notifications.error(error);
	}
}
