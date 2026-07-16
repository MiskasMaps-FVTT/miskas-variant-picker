import type { VariantFilter, VariantRegEx } from "./types";
import type { VariantFlag } from "./variant_opts";

declare module "fvtt-types/configuration" {
	interface AssumeHookRan {
		init: true;
	}

	interface ModuleConfig {
		"module-id": "miskas-variant-picker";
	}

	interface FlagConfig {
		Scene: {
			"miskas-variant-picker": {
				active: string;
				enabled: boolean;
				variants: { [key: string]: VariantFlag };
				[variantName: `variants.${string}`]: VariantFlag;
				/**
					@deprecated Since version 2.0.0
				*/
				regex: VariantRegEx;
				/**
					@deprecated Since version 2.0.0
				*/
				"regex.scene": VariantRegEx["scene"];
				/**
					@deprecated Since version 2.0.0
				*/
				"regex.variant": VariantRegEx["variant"];
				/**
					@deprecated Since version 2.0.0
				*/
				filter: VariantFilter;
				/**
					@deprecated Since version 2.0.0
				*/
				"filter.remove": VariantFilter["remove"];
				/**
					@deprecated Since version 2.0.0
				*/
				"filter.contains": VariantFilter["contains"];
				/**
					@deprecated Since version 2.0.0
				*/
				prefix: string; // @todo Remove after Variants2 is completed
			};
		};
	}

	interface SettingConfig {
		"miskas-variant-picker.hideVariantMigrationOption": boolean;
	}
}
