import { variantPicker } from "./variant_picker.js";

Hooks.on("getSceneContextOptions", (_, menuItems) => {
	menuItems.push({
		callback: variantPicker,
		icon: `<i class="fa-solid fa-swatchbook"></i>`,
		condition: () => {
			if (game.user.isGM) return true;
		},
		name: "Change scene variant",
	});
});
