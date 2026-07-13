import { MODULE_NAME } from "./constants.ts";
import { setVariantOption } from "./variant_building.ts";
import { activateVariant, addVariant, deleteVariant } from "./variant_opts.ts";
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

Hooks.on("renderSceneConfig", (app) => {
	app.options.actions.addVariant = async function () {
		const { variantName } = await foundry.applications.api.DialogV2.input({
			window: { title: "Create Variant" },
			content: `
			<div class="form-group">
				<form>
					<label>Name</label>
					<div class="form-fields">
						<input type="text" name="variantName" placeholder="Variant">
					</div>
				</form>
			</div>
			`,
		});
		addVariant(this.document, variantName as string);
	};
	app.options.actions.deleteVariant = async function (event) {
		// @ts-expect-error
		const variantName = event.target.closest("[data-variant-name]").dataset.variantName as string;
		if (await foundry.applications.api.DialogV2.confirm({ content: `Delete variant ${variantName}?` })) {
			deleteVariant(this.document, variantName);
		}
	};
	app.options.actions.activateVariant = async function (event) {
		// @ts-expect-error
		const variantName = event.target.closest("[data-variant-name]").dataset.variantName as string;
		activateVariant(this.document, variantName);
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

	game.settings.register(MODULE_NAME, "buildingMode", {
		name: "Variant Building Mode",
		hint: "Enables extra actions in the context menu to help with building variants",
		scope: "user",
		config: true,
		type: Boolean,
		default: false,
	});

	foundry.applications.sheets.SceneConfig.PARTS.variants = {
		template: `modules/${MODULE_NAME}/templates/variants.hbs`,
	};
	foundry.applications.sheets.SceneConfig.TABS.sheet.tabs.push({
		id: "variants",
		icon: "fa-solid fa-shapes",
		label: "Variants",
	});

	Handlebars.registerHelper("objectLength", (obj: object) => Object.keys(obj).length);

	// @ts-expect-error ForgeVTT exclusive variable
	game.isForge = !!(globalThis.ForgeVTT && ForgeVTT.usingTheForge);
});
