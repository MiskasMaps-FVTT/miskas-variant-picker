import { MODULE_NAME } from "./constants";

export function addVariant(scene: Scene, variantName: string) {
	if (scene.getFlag(MODULE_NAME, `variants.${variantName}`) === undefined) {
		const variant = variantName == "Default" ? new BaseVariant(scene) : new Variant(variantName, scene, {});
		variant.update();
		scene.setFlag(MODULE_NAME, `variants.${variantName}`, variant);
	}
}

export function activateVariant(scene: Scene, variantName: string) {
	return Variant.activateVariant(getVariantObject(scene, variantName));
}

export function setVariant(scene: Scene, variant: VariantFlag) {
	return scene.setFlag(MODULE_NAME, `variants.${variant.name}`, {
		name: variant.name,
		sceneUuid: variant.sceneUuid,
		data: variant.data,
	});
}

export function updateActive(scene: Scene) {
	return getVariantObject(scene, scene.getFlag("miskas-variant-picker", "active")).update();
}

export function deleteVariant(scene: Scene, variantName: string) {
	if (variantName == scene.getFlag(MODULE_NAME, "active")) scene.setFlag(MODULE_NAME, "active", "Default");
	scene.unsetFlag(MODULE_NAME, `variants.${variantName}`);
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

/**
 * Data stored in the variant
 */
type BaseVariantData = {
	background: string;
	foreground: string;
	createWallData: WallDocument.CreateData[];
	createLightData: AmbientLightDocument.CreateData[];
};

/**
 * Data stored in the variant
 */
type VariantData = Partial<BaseVariantData> & {
	deleteWallIds?: any[]; // Can't find the definite type of ids
	deleteLightIds?: any[]; // Can't find the definite type of ids
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
		this.data.background = this.scene.background.src;
		this.data.foreground = this.scene.foreground;
		this.data.createWallData = this.scene.walls.values().toArray();
		this.data.createLightData = this.scene.lights.values().toArray() as unknown as AmbientLightDocument.CreateData[];
		this.setFlag();
	}

	activate() {
		// @ts-expect-error
		this.constructor.activateVariant(this);
	}

	static async activateVariant(variant: BaseVariant) {
		const scene = variant.scene;

		// Clear the scene
		await scene.deleteEmbeddedDocuments("Wall", scene.walls.keys().toArray());
		await scene.deleteEmbeddedDocuments("AmbientLight", scene.lights.keys().toArray());

		if (!foundry.utils.isNewerVersion(game.version, 14)) {
			variant.scene.background.src = variant.data.background;
			variant.scene.foreground = variant.data.foreground;
		} // @todo implement levels support

		// Populate the scene with variant data
		scene.createEmbeddedDocuments("Wall", variant.data?.createWallData, { keepId: true });
		scene.createEmbeddedDocuments("AmbientLight", variant.data?.createLightData, { keepId: true });
		if (game.settings.get("miskas-variant-picker", "showSuccess"))
			ui.notifications.success("Variant changed successfully");
		variant.scene.background.src = variant.data.background;
		variant.scene.foreground = variant.data.foreground;

		scene.setFlag(MODULE_NAME, "active", variant.name);

		if (game.settings.get("miskas-variant-picker", "showSuccess"))
			ui.notifications.success("Variant changed successfully");
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
		this.data = data;
	}

	override update() {
		const baseVariant = this.getBaseVariant();

		this.data.background = this.scene.background.src;
		this.data.foreground = this.scene.foreground;

		// Update walls
		const baseWallIds = (baseVariant.data?.createWallData?.map((x) => x._id) as string[]) ?? [];
		const sceneWallIds = [...this.scene.walls.keys()];
		const wallsAdded = new Set();
		const wallsDeleted = new Set();
		for (const id of sceneWallIds) {
			if (!baseWallIds?.includes(id)) {
				wallsAdded.add(id);
			}
		}
		for (const id of baseWallIds) {
			if (!sceneWallIds?.includes(id)) {
				wallsDeleted.add(id);
			}
		}
		this.data.deleteWallIds = [...wallsDeleted];
		this.data.createWallData = this.scene.walls
			.values()
			.filter((x) => wallsAdded.has(x._id))
			.toArray();

		// Update lights
		const baseLightIds = (baseVariant.data?.createLightData?.map((x) => x._id) as string[]) ?? [];
		const sceneLightIds = [...this.scene.lights.keys()];
		const lightsAdded = new Set();
		const lightsDeleted = new Set();
		for (const id of sceneLightIds) {
			if (!baseLightIds?.includes(id)) {
				lightsAdded.add(id);
			}
		}
		for (const id of baseLightIds) {
			if (!sceneLightIds?.includes(id)) {
				lightsDeleted.add(id);
			}
		}
		this.data.deleteLightIds = [...lightsDeleted];
		this.data.createLightData = this.scene.lights
			.values()
			.filter((x) => lightsAdded.has(x._id))
			.toArray() as unknown as AmbientLightDocument.CreateData[];
		this.setFlag();
	}

	static override async activateVariant(variant: Variant) {
		const scene = variant.scene;
		const baseVariant = variant.getBaseVariant();

		// Clear the scene
		await scene.deleteEmbeddedDocuments("Wall", scene.walls.keys().toArray());
		await scene.deleteEmbeddedDocuments("AmbientLight", scene.lights.keys().toArray());

		// Populate the scene with variant data
		if (!foundry.utils.isNewerVersion(game.version, 14)) {
			variant.scene.background.src = variant.data.background;
			variant.scene.foreground = variant.data.foreground;
		} // @todo implement levels support

		if (variant.name == "Default") {
			scene.createEmbeddedDocuments("Wall", baseVariant.data?.createWallData, { keepId: true });
			scene.createEmbeddedDocuments("AmbientLight", baseVariant.data?.createLightData, { keepId: true });
		} else {
			variant.data.background = variant.scene.background.src;
			variant.data.foreground = variant.scene.foreground;
			if (baseVariant.data.createWallData !== undefined) {
				scene.createEmbeddedDocuments(
					"Wall",
					baseVariant.data?.createWallData.filter((x) => !variant.data?.deleteWallIds?.includes(x._id)),
					{ keepId: true },
				);
			}
			if (baseVariant.data.createLightData !== undefined) {
				scene.createEmbeddedDocuments(
					"AmbientLight",
					baseVariant.data.createLightData.filter((x) => !variant.data?.deleteLightIds?.includes(x._id)),
					{ keepId: true },
				);
			}
			if (variant.data.createWallData !== undefined) {
				scene.createEmbeddedDocuments("Wall", variant.data?.createWallData, { keepId: true });
			}
			if (variant.data.createWallData !== undefined) {
				scene.createEmbeddedDocuments("AmbientLight", variant.data?.createLightData, { keepId: true });
			}
		}

		scene.setFlag(MODULE_NAME, "active", variant.name);

		if (game.settings.get("miskas-variant-picker", "showSuccess"))
			ui.notifications.success("Variant changed successfully");
	}
}
