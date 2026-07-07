function isValidRegex(pattern: RegExp | string): boolean {
	try {
		new RegExp(pattern);
		return true;
	} catch (e) {
		return false;
	}
}

function hasCaptureGroup(regex: RegExp | string) {
	const captureGroupPattern = /(?:^|[^\\])\((?!\?[:=!<])/;
	return captureGroupPattern.test(new RegExp(regex).source);
}

function openDialog(scene: Scene) {
	// @ts-expect-error Type error due to overtly strict types
	const flags = scene.flags["miskas-variant-picker"];
	new foundry.applications.api.DialogV2({
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
				callback: (_, button: any, dialog): void | false => {
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

					// @ts-expect-error Type error due to overtly strict types
					if (variantRegex) scene.setFlag("miskas-variant-picker", "regex.variant", variantRegex);
					// @ts-expect-error Type error due to overtly strict types
					else scene.unsetFlag("miskas-variant-picker", "regex.variant");

					// @ts-expect-error Type error due to overtly strict types
					if (sceneRegex) scene.setFlag("miskas-variant-picker", "regex.scene", sceneRegex);
					// @ts-expect-error Type error due to overtly strict types
					else scene.unsetFlag("miskas-variant-picker", "regex.scene");

					// @ts-expect-error Type error due to overtly strict types
					if (prefix) scene.setFlag("miskas-variant-picker", "prefix", prefix);
					// @ts-expect-error Type error due to overtly strict types
					else scene.unsetFlag("miskas-variant-picker", "prefix");

					// @ts-expect-error Type error due to overtly strict types
					if (contains) scene.setFlag("miskas-variant-picker", "filter.contains", contains);
					// @ts-expect-error Type error due to overtly strict types
					else scene.unsetFlag("miskas-variant-picker", "filter.contains");

					dialog.close();
				},
			},
		],
	}).render({ force: true });
}

export function setVariantOption(li: HTMLElement) {
	const sceneId = "Scene." + li.dataset.entryId;
	const scene = fromUuidSync(sceneId) as Scene;
	openDialog(scene);
}
