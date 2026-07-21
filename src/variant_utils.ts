import { MODULE_NAME } from "./constants";
import { activateVariant, addVariant } from "./variant_opts";

export async function addVariantPopup(scene: Scene) {
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
	addVariant(scene, variantName as string);
}

export function pickVariant(scene: Scene) {
	const variants = scene.getFlag(MODULE_NAME, "variants");
	const active = scene.getFlag(MODULE_NAME, "active");
	const buttons: foundry.applications.api.DialogV2.Button<any>[] = [];
	for (const v of Object.values(variants)) {
		const variantName = v.name;
		buttons.push({
			label: variantName,
			action: variantName,
			default: active == variantName,
			callback: () => {
				activateVariant(scene, variantName);
			},
		});
	}
	new foundry.applications.api.DialogV2({
		window: { title: "Select Variant" },
		buttons: buttons,
	}).render({ force: true });
}
