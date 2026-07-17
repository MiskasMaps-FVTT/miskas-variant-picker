import { MODULE_NAME } from "./constants";
import { getVariantObject, ObjectKeys, type ObjectTypes } from "./variant_opts";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class VariantConfig extends HandlebarsApplicationMixin(ApplicationV2) {
	static override DEFAULT_OPTIONS = {
		tag: "div",
		actions: {
			toggleCollapse: (event: Event) => {
				const target = event.target as HTMLButtonElement;
				const menu = target.parentElement.nextElementSibling as HTMLElement;
				if (menu.style.display === "block") {
					menu.style.display = "none";
				} else {
					menu.style.display = "block";
				}
			},
			activateEntry: (event: Event) => {
				console.log(event);
			},
			clear: async (event: Event) => {
				const target = event.target as HTMLButtonElement;
				const fieldset = target.closest("fieldset");
				const kind = fieldset.dataset.kind as keyof ObjectTypes;
				const type = fieldset.dataset.type as "create" | "delete";
				if (await foundry.applications.api.DialogV2.confirm({ content: `Clear ${type} ${kind}s?` })) {
					const variantName = target.form.dataset.variant;
					const scene = fromUuidSync(target.form.dataset.scene) as Scene;
					const variant = getVariantObject(scene, variantName);
					// @ts-expect-error
					variant.data[`${type}${kind.capitalize()}${type == "create" ? "Data" : "Ids"}`] = [];
					for (const child of fieldset.querySelector("ol").children) {
						console.log(child);
						child.remove();
					}
					variant.setFlag();
				}
			},
			delete: (event: Event) => {
				const target = event.target as HTMLButtonElement;
				const variantName = target.form.dataset.variant;
				const scene = fromUuidSync(target.form.dataset.scene) as Scene;
				const id = target.parentElement.dataset.entryId;
				const fieldset = target.closest("fieldset");
				const kind = fieldset.dataset.kind as keyof ObjectTypes;
				const type = fieldset.dataset.type as "create" | "delete";
				const variant = getVariantObject(scene, variantName);
				// @ts-expect-error
				const data = variant.data[`${type}${kind.capitalize()}${type == "create" ? "Data" : "Ids"}`] as any[];
				const remove = data.findIndex((v: { _id: string }) => v._id == id);
				data.splice(remove, 1);
				target.parentElement.remove();
				variant.setFlag();
			},
			reload: function () {
				this.render();
			},
		},
		position: {
			width: 300,
			height: 300,
		},
		window: {
			resizable: true,
			controls: [
				{
					action: "reload",
					icon: "fa-solid fa-arrow-rotate-right",
					label: "Reload",
				},
			],
		},
	};

	static override PARTS = {
		form: {
			template: `modules/${MODULE_NAME}/templates/variant_config.hbs`,
		},
	};

	override options: any;
	menus: Record<string, object>;

	constructor(options: any) {
		super(options);
		this.options.window.title = `Variant: ${options.variant.name}`;
		this.menus = {};
		const defaultVariant = this.options.variant.getBaseVariant();

		for (const kind of ObjectKeys) {
			this.menus[`create-${kind}`] = {
				id: `create-${kind}`,
				type: "create",
				kind: kind,
				label: `Added ${kind.capitalize()}s`,
				entries: this.options.variant.data[`create${kind.capitalize()}Data`],
			};
			this.menus[`delete-${kind}`] = {
				id: `delete-${kind}`,
				type: "delete",
				kind: kind,
				label: `Removed ${kind.capitalize()}s`,
				entries: defaultVariant.data[`create${kind.capitalize()}Data`].filter((x: any) => {
					return !!this.options.variant.data[`delete${kind.capitalize()}Ids`].includes(x._id);
				}),
			};
		}
	}

	// @ts-expect-error
	async _preparePartContext(_, context) {
		context.variant = this.options.variant;
		context.menus = this.menus;
		return context;
	}
}
