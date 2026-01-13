import { variantPicker } from "./variant_picker.js";

Hooks.on("getSceneContextOptions", (_, menuItems) => {
	menuItems.push({
		callback: variantPicker,
		icon: `<i class="fa-solid fa-swatchbook"></i>`,
		condition: (li) => {
			if (!game.user.isGM) return false;
			if (game.settings.get("miskas-variant-picker", "globalEnable")) return true;
			const src = fromUuidSync(`Scene.${li.dataset.entryId}`).background.src;
			if (src.search("/miskasmaps-") >= 0) return true;
			return false;
		},
		name: "Change Scene Variant",
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
		hint: "Wheter to show a success message when variant is changed",
		scope: "user",
		config: true,
		type: Boolean,
		default: true,
	});

	game.isForge = !!(globalThis.ForgeVTT && ForgeVTT.usingTheForge);
});
