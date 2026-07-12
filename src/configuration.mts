import type { VariantFilter, VariantRegEx } from "./types";
import type { VariantFlag } from "./variant_opts";

declare module "fvtt-types/configuration" {
	interface AssumeHookRan {
		ready: true;
	}

	interface ModuleConfig {
		"module-id": "miskas-variant-picker";
	}

	interface FlagConfig {
		Scene: {
			"miskas-variant-picker": {
				variants: { [key: string]: VariantFlag };
				enabled: boolean;
				[variantName: `variants.${string}`]: VariantFlag;
				regex: VariantRegEx; // @todo Remove after Variants2 is completed
				"regex.scene": VariantRegEx["scene"]; // @todo Remove after Variants2 is completed
				"regex.variant": VariantRegEx["variant"]; // @todo Remove after Variants2 is completed
				filter: VariantFilter; // @todo Remove after Variants2 is completed
				"filter.remove": VariantFilter["remove"]; // @todo Remove after Variants2 is completed
				"filter.contains": VariantFilter["contains"]; // @todo Remove after Variants2 is completed
				prefix: string; // @todo Remove after Variants2 is completed
			};
		};
	}

	interface SettingConfig {
		"miskas-variant-picker.showSuccess": boolean;
		"miskas-variant-picker.buildingMode": boolean;
	}
}
