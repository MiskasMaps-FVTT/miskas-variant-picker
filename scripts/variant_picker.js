function getVariantName(str) {
	if (typeof str !== "string") throw new Error("argument must be string");
	const map = str.match("([0-9]+x[0-9]+[-\.]([0-9]+ppi-)?)(.*)(\.(webp)|(jpg)|(png)$)")[3]
	const parts = map.split("-");
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		parts[i] = part[0].toUpperCase() + part.slice(1);
	}

	return parts.join(" ");
}

function changeSceneVariant(scene, backgroundURL) {
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
	const variantPrefix = background.slice(background.lastIndexOf("/") + 1).match('(.*?)(-[0-9]+x[0-9]+)')[1];
	const filePickerResult = await foundry.applications.apps.FilePicker.browse("data", background);
	const maps = filePickerResult.files.filter((word) => word.search(variantPrefix) > 0);
	const variants = new Map;

	for (const map of maps) {
		variants.set(getVariantName(map), map);
	}
	variants.delete(getVariantName(background))

	if (!variants.size) throw new Error("No variants found");

	const variant = await selectVariant(variants);
	if (!variant) return
	changeSceneVariant(scene, variant);
}
