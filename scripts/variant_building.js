function isValidRegex(pattern) {
	try {
		new RegExp(pattern);
		return true;
	} catch (e) {
		return false;
	}
}

function hasCaptureGroup(regex) {
	const captureGroupPattern = /(?:^|[^\\])\((?!\?[:=!<])/;

	return captureGroupPattern.test(new RegExp(regex).source);
}

function openDialog(scene) {
	const flags = scene.flags["miskas-variant-picker"];
	const dialog = new foundry.applications.api.DialogV2({
		form: { closeOnSubmit: false },
		window: { title: "Enter variant options" },
		content: `
		<form>
			<label>Scene RegEx<input name="name_regex" type="text" value="${flags?.regex?.name ?? ""}"></label>
			<label>Variant RegEx<input name="variant_regex" type="text" value="${flags?.regex?.variant ?? ""}"></label>
			<label>Prefix<input name="prefix" type="text" value="${flags?.prefix ?? ""}"></label>
			<label>Contains<input name="contains" type="text" value="${flags?.filter?.contains ?? ""}"></label>
		</form>
		`,
		buttons: [
			{
				action: "ok",
				label: "Confirm",
				callback: (event, button, dialog) => {
					const elements = button.form.elements;
					const sceneRegex = elements.name_regex.value;
					const variantRegex = elements.variant_regex.value;
					const prefix = elements.prefix.value;
					const contains = elements.contains.value;

					if (!isValidRegex(sceneRegex)) {
						ui.notifications.error(sceneRegex + " is not a valid RegEx");
						return false;
					}

					if (!isValidRegex(variantRegex)) {
						ui.notifications.error(variantRegex + " is not a valid RegEx");
						return false;
					} else if (variantRegex && !hasCaptureGroup(variantRegex)) {
						ui.notifications.error("Variant name RegEx must have at least one capture group");
						return false;
					}

					if (variantRegex) scene.setFlag("miskas-variant-picker", "regex.variant", variantRegex);
					else scene.unsetFlag("miskas-variant-picker", "regex.variant");

					if (sceneRegex) scene.setFlag("miskas-variant-picker", "regex.scene", sceneRegex);
					else scene.unsetFlag("miskas-variant-picker", "regex.scene");

					if (prefix) scene.setFlag("miskas-variant-picker", "prefix", prefix);
					else scene.unsetFlag("miskas-variant-picker", "prefix");

					if (contains) scene.setFlag("miskas-variant-picker", "filter.contains", contains);
					else scene.unsetFlag("miskas-variant-picker", "filter.contains");

					dialog.close();
				},
			},
		],
	}).render({ force: true });
}

export function setVariantOption(li) {
	const sceneId = "Scene." + li.dataset.entryId;
	const scene = fromUuidSync(sceneId);
	openDialog(scene);
}
