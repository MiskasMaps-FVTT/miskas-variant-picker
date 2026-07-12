import { MODULE_NAME } from "./constants";

export function setVariant(scene: Scene, variant: VariantFlag) {
	return scene.setFlag(MODULE_NAME, "variants", {
		[`${variant.name}`]: { name: variant.name, sceneUuid: variant.sceneUuid, data: variant.data },
	});
}

export function getVariant(scene: Scene, variantName: string) {
	return scene.getFlag(MODULE_NAME, `variants.${variantName}`);
}

export function getVariantObject(scene: Scene, variantName: string): Variant | BaseVariant {
	const flags = scene.getFlag(MODULE_NAME, `variants.${variantName}`);
	if (flags.name == "base") {
		return new BaseVariant(flags.sceneUuid, flags.data as BaseVariantData);
	} else {
		return new Variant(flags.name, flags.sceneUuid, flags.data);
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
}

/**
 * Variant object to be used inside js
 */
export class BaseVariant implements VariantFlag {
	name: string = "base";
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
		this.data = data;
	}

	setFlag() {
		setVariant(this.scene, this);
	}

	getBaseVariant() {
		const baseVariant = getVariantObject(this.scene, "base");
		if (baseVariant === undefined) {
			ui.notifications.error(`Scene ${this.sceneUuid} doesn't have a base variant`);
			throw new Error("no base variant");
		}
		return baseVariant;
	}

	update() {
		this.data.background = this.scene.background.src;
		this.data.foreground = this.scene.foreground;
		this.data.createWallData = this.scene.walls.values().toArray();
		this.data.createLightData = this.scene.lights.values().toArray() as unknown as AmbientLightDocument.CreateData[];
	}

	activateVariant() {
		const scene = this.scene;
		const baseVariant = this.getBaseVariant();

		// Clear the scene
		scene.deleteEmbeddedDocuments(
			"Wall",
			scene.walls
				.entries()
				.map((x) => x[0])
				.toArray(),
		);
		scene.deleteEmbeddedDocuments(
			"AmbientLight",
			scene.lights
				.entries()
				.map((x) => x[0])
				.toArray(),
		);

		// Populate the scene with variant data
		this.scene.background.src = this.data.background;
		this.scene.foreground = this.data.foreground;
		scene.createEmbeddedDocuments("Wall", baseVariant.data?.createWallData, { keepId: true });
		scene.createEmbeddedDocuments("AmbientLight", baseVariant.data?.createLightData, { keepId: true });
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

		// Update
		this.data.background = this.scene.background.src;
		this.data.foreground = this.scene.foreground;

		// Update walls
		const baseWallIds = (baseVariant.data?.createWallData?.map((x) => x._id) as string[]) ?? [];
		const sceneWallIds = [...this.scene.walls.keys()];
		const wallsAdded = new Set();
		const wallsDeleted = new Set();
		for (const id of sceneWallIds) {
			if (!baseWallIds.includes(id)) {
				wallsAdded.add(id);
			}
		}
		for (const id of baseWallIds) {
			if (!sceneWallIds.includes(id)) {
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
			if (!baseLightIds.includes(id)) {
				lightsAdded.add(id);
			}
		}
		for (const id of baseLightIds) {
			if (!sceneLightIds.includes(id)) {
				lightsDeleted.add(id);
			}
		}
		this.data.deleteLightIds = [...lightsDeleted];
		this.data.createLightData = this.scene.lights
			.values()
			.filter((x) => lightsAdded.has(x._id))
			.toArray() as unknown as AmbientLightDocument.CreateData[];
	}

	override activateVariant() {
		const scene = this.scene;
		const baseVariant = this.getBaseVariant();

		// Clear the scene
		scene.deleteEmbeddedDocuments(
			"Wall",
			scene.walls
				.entries()
				.map((x) => x[0])
				.toArray(),
		);
		scene.deleteEmbeddedDocuments(
			"AmbientLight",
			scene.lights
				.entries()
				.map((x) => x[0])
				.toArray(),
		);

		// Populate the scene with variant data
		this.scene.background.src = this.data.background;
		this.scene.foreground = this.data.foreground;
		if (this.name == "base") {
			scene.createEmbeddedDocuments("Wall", baseVariant.data?.createWallData, { keepId: true });
			scene.createEmbeddedDocuments("AmbientLight", baseVariant.data?.createLightData, { keepId: true });
		} else {
			this.data.background = this.scene.background.src;
			this.data.foreground = this.scene.foreground;
			if (baseVariant.data.createWallData !== undefined) {
				scene.createEmbeddedDocuments(
					"Wall",
					baseVariant.data?.createWallData.filter((x) => !this.data?.deleteWallIds.includes(x._id)),
					{ keepId: true },
				);
			}
			if (baseVariant.data.createLightData !== undefined) {
				scene.createEmbeddedDocuments(
					"AmbientLight",
					baseVariant.data.createLightData.filter((x) => !this.data?.deleteLightIds.includes(x._id)),
					{ keepId: true },
				);
			}
			if (this.data.createWallData !== undefined) {
				scene.createEmbeddedDocuments("Wall", this.data?.createWallData, { keepId: true });
			}
			if (this.data.createWallData !== undefined) {
				scene.createEmbeddedDocuments("AmbientLight", this.data?.createLightData, { keepId: true });
			}
		}

		if (game.settings.get("miskas-variant-picker", "showSuccess"))
			ui.notifications.success("Variant changed successfully");
	}
}
