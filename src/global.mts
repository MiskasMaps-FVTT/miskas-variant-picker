import { VariantFilter, VariantRegEx } from "./types";

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
				  regex: VariantRegEx,
				  filter: VariantFilter,
				  prefix: string
	        }
	    };
	}

	interface SettingConfig {
		"miskas-variant-picker.globalEnable": boolean;
		"miskas-variant-picker.showSuccess": boolean;
		"miskas-variant-picker.buildingMode": boolean;
	}
}
