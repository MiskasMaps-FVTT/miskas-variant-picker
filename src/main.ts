import { MODULE_NAME } from "./constants.ts";
import { migrateVariants } from "./variant_migrator.ts";
import { activateVariant, addVariant, deleteVariant, updateActive } from "./variant_opts.ts";
import { addVariantPopup, pickVariant } from "./variant_utils.ts";

function updateParent(doc: foundry.canvas.placeables.PlaceableObject) {
	updateActive(doc.scene);
}

function registerUpdateHooks(value: boolean) {
	if (value) {
		Object.values(foundry.canvas.placeables)
			.filter((x) => typeof x == "function")
			.forEach((x) => {
				// @ts-expect-error
				Hooks.on(`draw${x.name}`, updateParent);
				// @ts-expect-error
				Hooks.on(`destroy${x.name}`, updateParent);
			});
	} else {
		Object.values(foundry.canvas.placeables)
			.filter((x) => typeof x == "function")
			.forEach((x) => {
				// @ts-expect-error
				Hooks.off(`draw${x.name}`, updateParent);
				// @ts-expect-error
				Hooks.off(`destroy${x.name}`, updateParent);
			});
	}
}

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
	menuItems.push({
		callback: async (li) => {
			pickVariant(fromUuidSync("Scene." + li.dataset.entryId) as Scene);
		}, // Key deprecated since V14, use onClick instead
		icon: `<i class="fa-solid fa-swatchbook"></i>`,
		condition: () => {
			return game.user.isGM && !game.settings.get(MODULE_NAME, "hideVariantMigrationOption");
		}, // Key deprecated since V14, use visible instead
		name: "Change Scene Variant", // Key deprecated since V14, use label instead
	});
});

Hooks.on("renderSceneConfig", (app) => {
	(app.position.width as number) += 85;
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
	controls.variants = {
		name: "variants",
		title: "Variants",
		icon: "fa-solid fa-swatchbook",
		order: Object.keys(controls).length,
		visible: game.user.isGM,
		activeTool: "empty",
		tools: {
			empty: {
				name: "empty",
				title: "empty",
				icon: "",
				order: -1,
				visible: false,
			},
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
			constantUpdate: {
				name: "constantUpdate",
				title: "Toggle Continuous Update",
				icon: "fa-solid fa-repeat",
				order: 3,
				toggle: true,
				visible: game.user.isGM,
				onChange: (_, value) => registerUpdateHooks(value),
			},
		},
	};
});

Hooks.once("init", () => {
	foundry.applications.sheets.SceneConfig.PARTS.variants = {
		template: `modules/${MODULE_NAME}/templates/variants.hbs`,
	};

	Object.assign(foundry.applications.sheets.SceneConfig.DEFAULT_OPTIONS, {
		addVariant: async function () {
			await addVariantPopup(this.document);
		},
		deleteVariant: async function (event: Event) {
			// @ts-expect-error
			const variantName = event.target.closest("[data-variant-name]").dataset.variantName as string;
			if (await foundry.applications.api.DialogV2.confirm({ content: `Delete variant ${variantName}?` })) {
				await deleteVariant(this.document, variantName);
				if (Object.keys(this.document.getFlag(MODULE_NAME, "variants") ?? {}).length == 0) {
					this.document.setFlag(MODULE_NAME, "enabled", false);
				}
			}
		},
		activateVariant: async function (event: Event) {
			// @ts-expect-error
			const variantName = event.target.closest("[data-variant-name]").dataset.variantName as string;
			activateVariant(this.document, variantName);
		},
		updateVariant: async function () {
			updateActive(this.document);
		},
		toggleVariants: function () {
			const enabled = this.document.getFlag(MODULE_NAME, "enabled");
			this.document.setFlag(MODULE_NAME, "enabled", !enabled);
			if (!enabled) {
				addVariant(this.document, "Default");
			}
		},
	});

	foundry.applications.sheets.SceneConfig.TABS.sheet.tabs.push({
		id: "variants",
		icon: "fa-solid fa-shapes",
		label: "Variants",
	});

	game.settings.register(MODULE_NAME, "hideVariantMigrationOption", {
		name: "Hide Variant Migration Option",
		hint: "Hide Variants 2 migration option from scene context menu",
		config: true,
		default: false,
		type: Boolean,
	});

	Handlebars.registerHelper("objectLength", (obj: object) => Object.keys(obj ?? {}).length);

	// @ts-expect-error ForgeVTT exclusive variable
	game.isForge = !!(globalThis.ForgeVTT && ForgeVTT.usingTheForge);
});
