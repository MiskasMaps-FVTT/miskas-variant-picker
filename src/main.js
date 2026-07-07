import { setVariantOption } from "./variant_building.js";
import { variantPicker } from "./variant_picker.js";

Hooks.on("getSceneContextOptions", (_, menuItems) => {
	menuItems.push({
		callback: variantPicker,
		icon: `<i class="fa-solid fa-swatchbook"></i>`,
		condition: (li) => {
			if (!game.user.isGM) return false;
			const scene = game.scenes.get(li.dataset.entryId);
			const src = scene?.background?.src;
			if (src?.search(scene.flags["miskas-variant-picker"]?.prefix || "/miskasmaps-") >= 0) return true;
			if (game.settings.get("miskas-variant-picker", "globalEnable")) return true;
			return false;
		},
		name: "Change Scene Variant",
	});
	menuItems.push({
		callback: setVariantOption,
		icon: `<i class="fa-solid fa-gears"></i>`,
		condition: (li) => {
			if (!game.user.isGM) return false;
			if (game.settings.get("miskas-variant-picker", "buildingMode")) return true;
			return false;
		},
		name: "Modify Scene Variant",
	});
});

Hooks.once("init", () => {
	game.settings.register("miskas-variant-picker", "globalEnable", {
		name: "Enable Globally",
		hint: "Enable the variant picker on modules other than Miska's Maps scenes",
		scope: "user",
		config: true,
		type: Boolean,
		default: false,
	});

	game.settings.register("miskas-variant-picker", "showSuccess", {
		name: "Show Success Message",
		hint: "Whether to show a success message when variant is changed",
		scope: "user",
		config: true,
		type: Boolean,
		default: true,
	});

	game.settings.register("miskas-variant-picker", "buildingMode", {
		name: "Variant Building Mode",
		hint: "Enables extra actions in the context menu to help with building variants",
		scope: "user",
		config: true,
		type: Boolean,
		default: false,
	});

	game.isForge = !!(globalThis.ForgeVTT && ForgeVTT.usingTheForge);
});
