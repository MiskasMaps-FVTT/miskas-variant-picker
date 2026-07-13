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
				active: string;
				enabled: boolean;
				variants: { [key: string]: VariantFlag };
				[variantName: `variants.${string}`]: VariantFlag;
			};
		};
	}

	interface SettingConfig {
		"miskas-variant-picker.showSuccess": boolean;
		"miskas-variant-picker.constantUpdate": boolean;
	}
}
