import { MODULE_NAME } from "./constants";
import { type BaseVariant, getVariantObject, ObjectKeys, type ObjectTypes } from "./variant_opts";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class VariantConfig extends HandlebarsApplicationMixin(ApplicationV2) {
	static override DEFAULT_OPTIONS = {
		tag: "form",
		actions: {
			toggleCollapse: (event: Event) => {
				const target = event.target as HTMLButtonElement;
				const menu = target.form.querySelector(`#${target.id}-menu`) as HTMLElement;
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
				const type = fieldset.dataset.type as "create" | "delete" | "update";
				const variant = this.options.variant;
				const data = variant.data[`${type}${kind.capitalize()}${type == "delete" ? "Ids" : "Data"}`];
				const remove = data.findIndex((v: { _id: string }) => v._id == id);
				data.splice(remove, 1);
				target.parentElement.remove();
				variant.setFlag();

				if (type == "delete") {
					this.options.variant.scene.createEmbeddedDocuments(
						kind.capitalize(),
						[
							(this.options.variant.getBaseVariant().data[`create${kind.capitalize()}Data`] as any[]).find(
								(x: any) => x._id == id,
							),
						],
						{ keepId: true },
					);
				} else if (type == "create") {
					this.options.variant.scene.deleteEmbeddedDocuments(kind.capitalize(), [id]);
				} else if (type == "update") {
					this.options.variant.scene.updateEmbeddedDocuments(kind.capitalize(), [
						(this.options.variant.getBaseVariant().data[`create${kind.capitalize()}Data`] as any[]).find(
							(x: any) => x._id == id,
						),
					]);
				}
			},
			reload: function () {
				const newVariant = getVariantObject(this.options.variant.scene, this.options.variant.name);
				this.options.variant.data = newVariant.data;
				this.updateMenus();
				this.render();
			},
			updateLabel: function (event: Event) {
				const target = event.target as HTMLButtonElement;
				this.options.variant.scene.setFlag(
					"miskas-variant-picker",
					`variants.${this.options.variant.name}.label`,
					(target.previousElementSibling as HTMLInputElement).value,
				);
			},
		},
		position: {
			width: 400,
			height: 500,
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
		const defaultVariant = this.options.variant.getBaseVariant() as BaseVariant;

		for (const kind of ObjectKeys) {
			const capitalKind = kind.capitalize();
			this.menus[kind] = {
				id: kind,
				label: `${capitalKind}s`,
				entries: [
					{
						id: `create-${kind}`,
						type: "create",
						kind: kind,
						label: "Added",
						entries: this.options.variant.data[`create${capitalKind}Data`],
					},
					{
						id: `delete-${kind}`,
						type: "delete",
						kind: kind,
						label: "Removed",
						entries: defaultVariant.data[`create${capitalKind}Data`].filter((x) => {
							return !!this.options.variant.data[`delete${capitalKind}Ids`].includes(x._id);
						}),
					},
					{
						id: `update-${kind}`,
						type: "update",
						kind: kind,
						label: "Updated",
						entries: this.options.variant.data[`update${capitalKind}Data`],
					},
				],
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
