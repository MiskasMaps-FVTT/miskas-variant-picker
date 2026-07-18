import { MODULE_NAME } from "./constants";
export function addVariant(scene: Scene, variantName: string) {
	if (scene.getFlag(MODULE_NAME, `variants.${variantName}`) === undefined) {
		const variant = variantName == "Default" ? new BaseVariant(scene) : new Variant(variantName, scene, {});
		variant.update();
		scene.setFlag(MODULE_NAME, `variants.${variantName}`, variant);
	}
}

export function activateVariant(scene: Scene, variantName: string) {
	getVariantObject(scene, variantName).activate();
}

export function setVariant(scene: Scene, variant: VariantFlag) {
	return scene.setFlag(MODULE_NAME, `variants.${variant.name}`, {
		name: variant.name,
		sceneUuid: variant.sceneUuid,
		data: variant.data,
	});
}

export function updateActive(scene: Scene) {
	const active = scene.getFlag("miskas-variant-picker", "active")
	ui.notifications.success(`Updated "${active}"`)
	return getVariantObject(scene, active)?.update();
}

export function deleteVariant(scene: Scene, variantName: string) {
	if (variantName == "Default" && Object.keys(scene.getFlag(MODULE_NAME, "variants")).length > 1) {
		ui.notifications.error("Can't delete the Default variant when there are other variants!");
		return Promise.reject();
	}
	if (variantName == scene.getFlag(MODULE_NAME, "active")) scene.setFlag(MODULE_NAME, "active", "Default");
	return scene.unsetFlag(MODULE_NAME, `variants.${variantName}`);
}

export function getVariant(scene: Scene, variantName: string) {
	return scene.getFlag(MODULE_NAME, `variants.${variantName}`);
}

export function getVariantObject(scene: Scene, variantName: string): Variant | BaseVariant {
	const variantFlags = scene.getFlag(MODULE_NAME, `variants.${variantName}`);
	if (variantFlags === undefined) return undefined;
	if (variantFlags?.name == "Default") {
		return new BaseVariant(variantFlags.sceneUuid, variantFlags.data as BaseVariantData);
	} else {
		return new Variant(variantFlags?.name, variantFlags.sceneUuid, variantFlags.data);
	}
}

export type ObjectTypes = {
	wall: WallDocument;
	light: AmbientLightDocument;
	region: RegionDocument;
	sound: AmbientSoundDocument;
	tile: TileDocument;
};
export const ObjectKeys: (keyof ObjectTypes)[] = ["wall", "light", "region", "sound"];
const EmbeddedKeys: Record<keyof ObjectTypes, keyof Scene.Metadata.Embedded> = {
	wall: "Wall",
	light: "AmbientLight",
	sound: "AmbientSound",
	region: "Region",
	tile: "Tile",
};

/**
 * Data stored in the variant
 */
type BaseVariantData = {
	background: string;
	foreground: string;
	levelsData: unknown[]; // Type not defined in League-of-Foundry-Developers/foundry-vtt-types yet
} & {
	[key in keyof ObjectTypes as `create${Capitalize<key>}Data`]?: ObjectTypes[key][];
};

/**
 * Data stored in the variant
 */
type VariantData = Partial<BaseVariantData> & {
	[key in keyof ObjectTypes as `delete${Capitalize<key>}Ids`]?: string[];
};

/**
 * All the data that exists in the base variant flag
 */
export interface VariantFlag {
	name: string;
	sceneUuid: string;
	data: VariantData;
	active?: boolean;
}

/**
 * Variant object to be used inside js
 */
export class BaseVariant implements VariantFlag {
	name: string = "Default";
	sceneUuid: string;
	data: VariantData;
	scene: Scene;

	constructor(scene: Scene, data?: BaseVariantData);
	constructor(sceneUuid: string, data?: BaseVariantData);
	constructor(sceneOrUuid: Scene | string, data?: BaseVariantData) {
		if (typeof sceneOrUuid == "string") {
			const parsed = foundry.utils.parseUuid(sceneOrUuid);
			if (parsed.type !== "Scene") throw new Error("Provided UUID is not a Scene UUID");
			this.sceneUuid = sceneOrUuid;
			this.scene = fromUuidSync(sceneOrUuid) as Scene;
		} else {
			this.scene = sceneOrUuid;
			this.sceneUuid = sceneOrUuid.uuid;
		}
		this.data = data ?? {};
	}

	getBaseVariant() {
		const baseVariant = getVariantObject(this.scene, "Default");
		if (baseVariant === undefined) {
			ui.notifications.error(`Scene ${this.sceneUuid} doesn't have a base variant`);
			throw new Error("no base variant");
		}
		return baseVariant;
	}

	setFlag() {
		setVariant(this.scene, this);
	}

	update() {
		if (foundry.utils.isNewerVersion(game.version, 14)) {
			// @ts-expect-error
			this.data.levelsData = this.scene.levels.values().toArray();
		} else {
			this.data.background = this.scene.background.src;
			this.data.foreground = this.scene.foreground;
		}

		for (const kind of ObjectKeys) {
			this.data[`create${kind.capitalize()}Data`] = this.scene[`${kind}s`].values().toArray() as any[];
			this.data[`delete${kind.capitalize()}Ids`] = [] as any[];
		}
		this.setFlag();
	}

	activate() {
		// @ts-expect-error
		return this.constructor.activateVariant(this);
	}

	static async activateVariant(variant: BaseVariant) {
		const scene = variant.scene;

		// Populate the scene with variant data
		const deletePromises = [] as Promise<any>[];
		const createPromises = [] as Promise<any>[];
		for (const kind of ObjectKeys) {
			deletePromises.push(scene.deleteEmbeddedDocuments(EmbeddedKeys[kind], [], { deleteAll: true }));
		}
		Promise.all(deletePromises).then(() => {
			for (const kind of ObjectKeys) {
				createPromises.push(
					scene.createEmbeddedDocuments(EmbeddedKeys[kind], variant.data[`create${kind.capitalize()}Data`] as any[], {
						keepId: true,
					}),
				);
			}
		});
		await Promise.all(createPromises);

		if (foundry.utils.isNewerVersion(game.version, 14)) {
			// @ts-expect-error
			scene.updateEmbeddedDocuments("Level", variant.data.levelsData);
		} else {
			scene.update({
				background: { src: variant.data.background },
				foreground: variant.data.foreground,
			});
		}

		scene.setFlag(MODULE_NAME, "active", variant.name);
	}
}

export class Variant extends BaseVariant {
	constructor(variantName: string, scene: Scene, data: VariantData);
	constructor(variantName: string, sceneUuid: string, data: VariantData);
	constructor(variantName: string, sceneOrUuid: Scene | string, data: VariantData) {
		if (typeof sceneOrUuid == "string") {
			super(sceneOrUuid);
		} else {
			super(sceneOrUuid);
		}
		this.name = variantName;
		this.data = data ?? {};
	}

	override update() {
		const baseVariant = this.getBaseVariant();
		if (this.name == "Default") {
			baseVariant.update();
			return
		}

		if (foundry.utils.isNewerVersion(game.version, 14)) {
			// @ts-expect-error
			this.data.levelsData = this.scene.levels.values().toArray();
		} else {
			this.data.background = this.scene.background.src;
			this.data.foreground = this.scene.foreground;
		}

		for (const kind of ObjectKeys) {
			const baseIds = baseVariant.data[`create${kind.capitalize()}Data`]?.map((x) => x._id) ?? [];
			const sceneIds = [...this.scene[`${kind}s`].keys()];
			const added = new Set<string>();
			const deleted = new Set<string>();
			for (const id of sceneIds) {
				if (!baseIds?.includes(id)) {
					added.add(id);
				}
			}
			for (const id of baseIds) {
				if (!sceneIds?.includes(id)) {
					deleted.add(id);
				}
			}
			this.data[`delete${kind.capitalize()}Ids`] = [...deleted];
			this.data[`create${kind.capitalize()}Data`] = this.scene[`${kind}s`]
				.values()
				// @ts-expect-error
				.filter((x) => added.has(x._id))
				.toArray();
		}
		this.setFlag();
	}

	static override async activateVariant(variant: Variant) {
		await variant.getBaseVariant().activate();

		const scene = variant.scene;

		if (foundry.utils.isNewerVersion(game.version, 14)) {
			// @ts-expect-error
			await scene.updateEmbeddedDocuments("Level", variant.data.levelsData);
		} else {
			scene.update({
				background: { src: variant.data.background },
				foreground: variant.data.foreground,
			});
		}

		if (variant.name != "Default") {
			const deletePromises = [] as Promise<any>[];
			const createPromises = [] as Promise<any>[];
			for (const kind of ObjectKeys) {
				await scene.deleteEmbeddedDocuments(EmbeddedKeys[kind], variant.data[`delete${kind.capitalize()}Ids`]);
			}
			Promise.all(deletePromises).then(() => {
				for (const kind of ObjectKeys) {
					createPromises.push(
						scene.createEmbeddedDocuments(EmbeddedKeys[kind], variant.data[`create${kind.capitalize()}Data`] as any[], {
							keepId: true,
						}),
					);
				}
			});
			await Promise.all(createPromises);
		}

		if (foundry.utils.isNewerVersion(game.version, 14)) {
			// @ts-expect-error
			scene.updateEmbeddedDocuments("Level", variant.data.levelsData);
		} else {
			scene.update({
				background: { src: variant.data.background },
				foreground: variant.data.foreground,
			});
		}

		scene.setFlag(MODULE_NAME, "active", variant.name);
	}
}
