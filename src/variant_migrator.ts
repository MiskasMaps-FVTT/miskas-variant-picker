import { MODULE_NAME } from "./constants.ts";
import type { VariantFilter, Variants } from "./types.ts";
import { addVariant, BaseVariant, getVariant, getVariantObject, Variant } from "./variant_opts.ts";

function getVariantName(str: string, regex: RegExp) {
	regex = regex || /[0-9]+x[0-9]+[-._](?:[0-9]+ppi-)?(.+)\.(?:webp|jpg|png)$/;
	const map = str.slice(str.lastIndexOf("/")).match(regex)[1];
	const parts = map.split("_");
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		parts[i] = part[0].toUpperCase() + part.slice(1);
	}

	return parts.join(" ");
}

function filterVariants(variants: Variants, filter: VariantFilter): void | false {
	if (Object.keys(filter).length === 0) return false;
	variants.entries().forEach((variant) => {
		if (!variant[1].includes(filter?.contains || "")) variants.delete(variant[0]);
		else if (filter.remove) {
			variants.set(
				variant[0],
				variant[1]
					.split(" ")
					.filter((x: string) => x != filter.contains)
					.join(" "),
			);
		}
	});
}

export async function migrateVariants(scene: Scene) {
	try {
		const default_variant = getVariantObject(scene, "Default");
		// @ts-expect-error V14
		const background = game.release.generation >= 14 ? scene.firstLevel.background.src : scene.background.src;
		const regex = scene.getFlag(MODULE_NAME, "regex.scene") ?? /.*-([0-9]+x[0-9]+)?/;
		const filter = scene.getFlag(MODULE_NAME, "filter");
		const lastIndex = background.lastIndexOf("/") + 1;
		let prefix;
		try {
			prefix = scene.getFlag(MODULE_NAME, "prefix") ?? background.slice(lastIndex).match(regex)[0];
		} catch {
			ui.notifications.error("The variant prefix couldn't be defined");
			return;
		}
		const path = background.slice(0, lastIndex);
		// @ts-expect-error Use global namespace for forge compatibility or new namespace if forge is not used
		const browse = game.isForge ? FilePicker.browse : foundry.applications.apps.FilePicker.browse;
		const filePickerResult = await browse("data", path);
		const maps = filePickerResult.files.filter((map) => map.search(prefix) > 0);
		const variants: Map<string, string> = new Map();

		for (const map of maps) {
			variants.set(map, getVariantName(map, scene.getFlag(MODULE_NAME, "regex.variant")));
		}

		if (filter) filterVariants(variants, filter);

		if (default_variant === undefined) {
			const buttons: foundry.applications.api.DialogV2.Button[] = [];
			variants.forEach((variant_name, bg) => {
				buttons.push({
					action: variant_name,
					label: variant_name,
					callback: () => {
						return bg;
					},
				});
			});
			await foundry.applications.api.DialogV2.wait({
				window: { title: "Select Default Variant" },
				content: "<p>Please select the default variant</p>",
				modal: true,
				rejectClose: true,
				buttons: buttons,
				submit: async (bg: string) => {
					const dv = await addVariant(scene, "Default");
					dv.data.levelsData[0].background.src = bg;
					dv.setFlag();
					variants.delete(bg);
				},
			}).catch(() => {
				throw new Error("Dialog closed");
			});
		}

		variants.forEach((variant_name, map) => {
			const v = new Variant(variant_name, scene, {});
			v.update();
			v.data.levelsData[0].background.src = map;
			console.log(v.data.levelsData[0]);
			v.setFlag();
		});
		// Delete the old flags
		scene.unsetFlag(MODULE_NAME, "filter");
		scene.unsetFlag(MODULE_NAME, "regex");
		scene.unsetFlag(MODULE_NAME, "prefix");
		scene.setFlag(MODULE_NAME, "migrated", true);

		ui.notifications.success(`Successfully migrated variants of scene ${scene.name}`);
	} catch (err) {
		ui.notifications.error(`Failed to migrate variants of scene ${scene.name}: ${err}`);
	}
}
