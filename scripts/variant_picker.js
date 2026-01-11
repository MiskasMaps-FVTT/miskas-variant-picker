function capitalizeFirstLetter(str) {
	if (typeof str !== "string") throw new Error("argument must be string");
	return str[0].toUpperCase() + str.slice(1);
}

function changeSceneVariant(scene, backgroundURL) {
	// Input validation checks
	if (!(scene instanceof Scene)) throw new Error("Provided scene is not a scene")
	if (typeof backgroundURL !== "string") throw new Error("Background is not a string")

	scene.update({
		background: { src: backgroundURL }
	});
}

function generateButtons(variants) {
	const buttons = new Array;

	variants.forEach((value, key) => {
		buttons.push({
			label: key,
			action: key,
			callback: () => {
				return value;
			}
		});
	});
	return buttons;
}

async function selectVariant(variants) {
	if (!(variants instanceof Map)) throw new Error("variants must be a map")

	return await foundry.applications.api.DialogV2.wait({
		window: { title: "Select variant" },
		buttons: generateButtons(variants)
	});

}

export async function variantPicker(li) {
	const sceneId = "Scene." + li.dataset.entryId;
	const scene = fromUuidSync(sceneId);
	const background = scene.background.src;
	const backgroundPath = background.slice(0, background.lastIndexOf("/"));
	const filePickerResult = await foundry.applications.apps.FilePicker.browse("data", backgroundPath);
	const maps = filePickerResult.files;
	const mapVariants = new Map;

	for (const map of maps) {
		const variant = map.split("/");
		mapVariants.set(capitalizeFirstLetter(variant.pop().match("(?<=[0-9]+x[0-9]+[-\.]).*(?=\.webp)")[0]), map);
	}

	changeSceneVariant(scene, await selectVariant(mapVariants));
}
