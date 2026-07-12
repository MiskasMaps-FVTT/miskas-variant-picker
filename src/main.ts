import { MODULE_NAME } from "./constants.ts";
import { setVariantOption } from "./variant_building.ts";
import * as VP from "./variant_opts.ts";
import { variantPicker } from "./variant_picker.ts";

Hooks.on("getSceneContextOptions", (_, menuItems) => {
	menuItems.push({
		callback: variantPicker,
		icon: `<i class="fa-solid fa-swatchbook"></i>`,
		condition: (li) => {
			if (!game.user.isGM) return false;
			const scene = game.scenes?.get(li.dataset.entryId ?? "");
			if (scene === undefined) return false;
			const src = scene?.background?.src;
			if (src?.search(scene.flags[MODULE_NAME]?.prefix ?? "/miskasmaps-") >= 0) return true;
			return false;
		},
		name: "Change Scene Variant",
	});
	menuItems.push({
		callback: setVariantOption,
		icon: `<i class="fa-solid fa-gears"></i>`,
		condition: () => {
			if (!game.user.isGM) return false;
			if (game.settings.get(MODULE_NAME, "buildingMode")) return true;
			return false;
		},
		name: "Modify Scene Variant",
	});
});

Hooks.once("init", () => {
	game.settings.register(MODULE_NAME, "showSuccess", {
		name: "Show Success Message",
		hint: "Whether to show a success message when variant is changed",
		scope: "user",
		config: true,
		type: Boolean,
		default: true,
	});

	game.settings.register(MODULE_NAME, "buildingMode", {
		name: "Variant Building Mode",
		hint: "Enables extra actions in the context menu to help with building variants",
		scope: "user",
		config: true,
		type: Boolean,
		default: false,
	});

	// @ts-expect-error
	CONFIG.mvptest = VP;
	// @ts-expect-error ForgeVTT exclusive variable
	game.isForge = !!(globalThis.ForgeVTT && ForgeVTT.usingTheForge);
});
