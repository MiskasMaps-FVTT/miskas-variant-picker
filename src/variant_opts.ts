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
		label: variant.label,
		name: variant.name,
		sceneUuid: variant.sceneUuid,
		data: variant.data,
	});
}

export function updateActive(scene: Scene) {
	const active = scene.getFlag("miskas-variant-picker", "active");
	ui.notifications.success(`Updated "${active}"`);
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
} & {
	[key in keyof ObjectTypes as `update${Capitalize<key>}Data`]?: ObjectTypes[key][];
};

/**
 * All the data that exists in the base variant flag
 */
export interface VariantFlag {
	name: string;
	label?: string;
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
			this.data[`update${kind.capitalize()}Data`] = [] as any[];
		}

		this.setFlag();
	}

	async activate(): Promise<any> {
		// @ts-expect-error
		return this.constructor.activateVariant(this);
	}

	static async activateVariant(variant: BaseVariant): Promise<any> {
		const scene = variant.scene;

		// Populate the scene with variant data
		const deletePromises = [] as Promise<any>[];
		const createPromises = [] as Promise<any>[];
		for (const kind of ObjectKeys) {
			deletePromises.push(scene.deleteEmbeddedDocuments(EmbeddedKeys[kind], [], { deleteAll: true }));
		}
		await Promise.all(deletePromises);
		for (const kind of ObjectKeys) {
			createPromises.push(
				scene.createEmbeddedDocuments(EmbeddedKeys[kind], variant.data[`create${kind.capitalize()}Data`] as any[], {
					keepId: true,
				}),
			);
		}
		await Promise.all(createPromises);

		let promise;
		if (foundry.utils.isNewerVersion(game.version, 14)) {
			// @ts-expect-error
			promise = scene.updateEmbeddedDocuments("Level", variant.data.levelsData);
		} else {
			promise = scene.update({
				background: { src: variant.data.background },
				foreground: variant.data.foreground,
			});
		}

		scene.setFlag(MODULE_NAME, "active", variant.name);
		return promise;
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
			return;
		}

		if (foundry.utils.isNewerVersion(game.version, 14)) {
			// @ts-expect-error
			this.data.levelsData = this.scene.levels.values().toArray();
		} else {
			this.data.background = this.scene.background.src;
			this.data.foreground = this.scene.foreground;
		}

		for (const kind of ObjectKeys) {
			const capitalKind = kind.capitalize();
			const baseIds = new Set(baseVariant.data[`create${capitalKind}Data`]?.map((x) => x._id) ?? []);
			const sceneIds = new Set([...this.scene[`${kind}s`].keys()]);
			const added = new Set<string>();
			const deleted = new Set<string>();
			const kept = new Set<string>();
			const updates = [];
			for (const id of sceneIds) {
				if (!baseIds?.has(id)) {
					added.add(id);
				}
			}
			for (const id of baseIds) {
				if (!sceneIds?.has(id)) {
					deleted.add(id);
				} else {
					kept.add(id);
				}
			}
			const baseDataMap = new Map();
			for (const data of baseVariant.data[`create${capitalKind}Data`]) {
				baseDataMap.set(data._id, data);
			}

			for (const id of kept) {
				const base = baseDataMap.get(id);
				const current = this.scene[`${kind}s`].get(id);
				if (!(JSON.stringify(base) === JSON.stringify(current))) {
					updates.push(current);
				}
			}
			this.data[`delete${capitalKind}Ids`] = [...deleted];
			this.data[`create${capitalKind}Data`] = this.scene[`${kind}s`]
				.values()
				// @ts-expect-error
				.filter((x) => added.has(x._id))
				.toArray();
			// @ts-expect-error
			this.data[`update${capitalKind}Data`] = updates;
		}

		this.setFlag();
	}

	override async activate(): Promise<any> {
		// Validate variant data and correct them
		for (const kind of ObjectKeys) {
			const baseVariant = this.getBaseVariant();
			const capitalKind = kind.capitalize();
			const ids = new Set(
				baseVariant.data[`create${kind.capitalize()}Data`]
					.values()
					.map((x) => x._id)
					.toArray(),
			);
			const deleteIds = this.data[`delete${capitalKind}Ids`];
			const updateIds = this.data[`update${capitalKind}Data`];
			this.data[`delete${capitalKind}Ids`] = deleteIds.filter((x) => ids.has(x));
			for (const id in deleteIds) ids.delete(id);
			// @ts-expect-error
			this.data[`update${capitalKind}Data`] = updateIds.filter((x) => ids.has(x._id));

			this.setFlag();
		}

		// @ts-expect-error
		return this.constructor.activateVariant(this);
	}

	static override async activateVariant(variant: Variant): Promise<any> {
		// Load base data
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

		const promises = [] as Promise<any>[];
		if (variant.name != "Default") {
			for (const kind of ObjectKeys) {
				const capitalKind = kind.capitalize();
				promises.push(scene.deleteEmbeddedDocuments(EmbeddedKeys[kind], variant.data[`delete${capitalKind}Ids`]));
				promises.push(scene.updateEmbeddedDocuments(EmbeddedKeys[kind], variant.data[`update${capitalKind}Data`]));
				promises.push(
					scene.createEmbeddedDocuments(EmbeddedKeys[kind], variant.data[`create${capitalKind}Data`] as any[], {
						keepId: true,
					}),
				);
			}
		} else {
			return Promise<void>;
		}

		if (foundry.utils.isNewerVersion(game.version, 14)) {
			// @ts-expect-error
			promises.push(scene.updateEmbeddedDocuments("Level", variant.data.levelsData));
		} else {
			promises.push(
				scene.update({
					background: { src: variant.data.background },
					foreground: variant.data.foreground,
				}),
			);
		}

		scene.setFlag(MODULE_NAME, "active", variant.name);
		return Promise.all(promises);
	}
}
