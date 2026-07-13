import { MODULE_NAME } from "./constants.ts";
import { activateVariant, addVariant, deleteVariant, updateActive } from "./variant_opts.ts";

Hooks.on("getSceneContextOptions", (_, menuItems) => {
	menuItems.push({
		callback: async (li) => {
			const sceneUuid = "Scene." + li.dataset.entryId;
			const scene = fromUuidSync(sceneUuid) as Scene;
			const variants = scene.getFlag(MODULE_NAME, "variants");
			foundry.applications.api.DialogV2.wait({
				window: { title: "Select Variant" },
				buttons: (() => {
					const buttons: foundry.applications.api.DialogV2.Button<any>[] = [];
					for (const v of Object.values(variants)) {
						const variantName = v.name;
						buttons.push({
							label: variantName,
							action: variantName,
							callback: () => activateVariant(scene, variantName),
						});
					}
					return buttons;
				})(),
			});
		}, // Key deprecated since V14, use onClick instead
		icon: `<i class="fa-solid fa-swatchbook"></i>`,
		condition: game.user.isGM, // Key deprecated since V14, use visible instead
		name: "Change Scene Variant", // Key deprecated since V14, use label instead
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
	app.options.actions.updateVariant = async function () {
		updateActive(this.document);
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

	Handlebars.registerHelper("objectLength", (obj: object) => Object.keys(obj).length);

	// @ts-expect-error ForgeVTT exclusive variable
	game.isForge = !!(globalThis.ForgeVTT && ForgeVTT.usingTheForge);
});
