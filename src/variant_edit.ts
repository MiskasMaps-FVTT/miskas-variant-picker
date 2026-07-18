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
			clear: async function (event: Event) {
				const target = event.target as HTMLButtonElement;
				const fieldset = target.closest("fieldset");
				const kind = fieldset.dataset.kind as keyof ObjectTypes;
				const type = fieldset.dataset.type as "create" | "delete";
				if (await foundry.applications.api.DialogV2.confirm({ content: `Clear ${type} ${kind}s?` })) {
					const variant = this.options.variant;
					variant.data[`${type}${kind.capitalize()}${type == "create" ? "Data" : "Ids"}`].length = 0;
					const ol = fieldset.querySelector("ol");
					while (ol.firstChild) {
						ol.removeChild(ol.lastChild);
					}
					variant.setFlag();
				}
			},
			delete: function (event: Event) {
				const target = event.target as HTMLButtonElement;
				const id = target.parentElement.dataset.entryId;
				const fieldset = target.closest("fieldset");
				const kind = fieldset.dataset.kind as keyof ObjectTypes;
				const type = fieldset.dataset.type as "create" | "delete";
				const variant = this.options.variant;
				const data = variant.data[`${type}${kind.capitalize()}${type == "create" ? "Data" : "Ids"}`];
				const remove = data.findIndex((v: { _id: string }) => v._id == id);
				data.splice(remove, 1);
				target.parentElement.remove();
				variant.setFlag();
			},
			reload: function () {
				const newVariant = getVariantObject(this.options.variant.scene, this.options.variant.name);
				this.options.variant.data = newVariant.data;
				this.updateMenus()
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

	updateMenus() {
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

	constructor(options: any) {
		super(options);
		this.options.window.title = `Variant: ${options.variant.name}`;
	}

	// @ts-expect-error
	async _preparePartContext(_, context) {
		context.variant = this.options.variant;
		this.updateMenus();
		context.menus = this.menus;
		return context;
	}
}
