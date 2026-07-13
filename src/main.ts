import { MODULE_NAME } from "./constants.ts";
import {
	activateVariant,
	addVariant,
	addVariantPopup,
	deleteVariant,
	pickVariant,
	updateActive,
} from "./variant_opts.ts";

Hooks.on("getSceneContextOptions", (_, menuItems) => {
	menuItems.push({
		callback: async (li) => {
			pickVariant(fromUuidSync("Scene." + li.dataset.entryId) as Scene);
		}, // Key deprecated since V14, use onClick instead
		icon: `<i class="fa-solid fa-swatchbook"></i>`,
		condition: (e) => {
			return game.user.isGM && (fromUuidSync("Scene." + e.dataset.entryId) as Scene).getFlag(MODULE_NAME, "enabled");
		}, // Key deprecated since V14, use visible instead
		name: "Change Scene Variant", // Key deprecated since V14, use label instead
	});
});

Hooks.on("renderSceneConfig", (app) => {
	app.options.actions.addVariant = async function () {
		await addVariantPopup(this.document);
	};
	app.options.actions.deleteVariant = async function (event) {
		// @ts-expect-error
		const variantName = event.target.closest("[data-variant-name]").dataset.variantName as string;
		if (await foundry.applications.api.DialogV2.confirm({ content: `Delete variant ${variantName}?` })) {
			await deleteVariant(this.document, variantName);
			if (Object.keys(this.document.getFlag(MODULE_NAME, "variants") ?? {}).length == 0) {
				this.document.setFlag(MODULE_NAME, "enabled", false);
			}
		}
	};
	app.options.actions.activateVariant = async function (event) {
		// @ts-expect-error
		const variantName = event.target.closest("[data-variant-name]").dataset.variantName as string;
		activateVariant(this.document, variantName);
	};
	app.options.actions.updateVariant = async function () {
		updateActive(this.document);
	};
	app.options.actions.toggleVariants = function () {
		const enabled = this.document.getFlag(MODULE_NAME, "enabled");
		this.document.setFlag(MODULE_NAME, "enabled", !enabled);
		if (!enabled) {
			addVariant(this.document, "Default");
		}
	};
});

Hooks.on("renderSceneNavigation", (_, e) => {
	const navEntries = e.querySelectorAll(`[data-action="viewScene"]`);
	navEntries.forEach((entry) => {
		// @ts-expect-error
		const scene = fromUuidSync("Scene." + entry.dataset.sceneId) as Scene;
		if (scene.getFlag(MODULE_NAME, "enabled")) {
			const activateVariant = scene.getFlag(MODULE_NAME, "active");
			const sceneEntry = entry.querySelector(".scene-name");
			if (activateVariant !== undefined) {
				sceneEntry.innerHTML += ` <span style="opacity: 0.5;">#${activateVariant}</span>`;
			}
		}
	});
});

Hooks.on("getSceneControlButtons", (controls) => {
	console.log(controls);
	controls.variants = {
		name: "variants",
		title: "Variants",
		icon: "fa-solid fa-swatchbook",
		order: Object.keys(controls).length,
		visible: game.user.isGM && !!canvas.scene?.flags[MODULE_NAME].enabled,
		activeTool: "",
		tools: {
			saveVariant: {
				name: "saveVariant",
				title: "Update Variant",
				icon: "fa-solid fa-floppy-disk",
				order: 0,
				button: true,
				visible: game.user.isGM,
				onChange: () => updateActive(canvas.scene),
			},
			changeVariant: {
				name: "changeVariant",
				title: "Change Variant",
				icon: "fa-duotone fa-swatchbook",
				order: 1,
				button: true,
				visible: game.user.isGM,
				onChange: () => pickVariant(canvas.scene),
			},
			addVariant: {
				name: "addVariant",
				title: "Change Variant",
				icon: "fa-regular fa-square-plus",
				order: 2,
				button: true,
				visible: game.user.isGM,
				onChange: () => addVariantPopup(canvas.scene),
			},
		},
	};
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

	foundry.applications.sheets.SceneConfig.PARTS.variants = {
		template: `modules/${MODULE_NAME}/templates/variants.hbs`,
	};
	foundry.applications.sheets.SceneConfig.TABS.sheet.tabs.push({
		id: "variants",
		icon: "fa-solid fa-shapes",
		label: "Variants",
	});

	Handlebars.registerHelper("objectLength", (obj: object) => Object.keys(obj ?? {}).length);

	// @ts-expect-error ForgeVTT exclusive variable
	game.isForge = !!(globalThis.ForgeVTT && ForgeVTT.usingTheForge);
});
