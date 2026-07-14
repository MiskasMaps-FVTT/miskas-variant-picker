This module allows you to easily create variants of existing scenes when you have multiple mostly same scenes.
Each variant can be easily changed to and modified without any hassle.
The aim of this module is to remove clutter from your scene directories by consolidating multiple scenes into a single one.

## How to use
Variants can be changed in three places: the scene config, scene context menu, and the variants scene controls.
The scene config menu is where you can manage your variants: create, delete and add them from a list.
The control tools allow you to create, switch, and save variants easily.

Each modification to a scene must be manually saved from the scene config or the tools, unless the continuous updates setting is enabled, where each change is saved immediately, but this may cause some performance issues with larges scenes when editing them. It is recommended to keep this setting off to ensure unwanted changes aren't made to the variants.

Each scene that uses variants has a single variant named "_Default_". This variant acts as the base for all other variants and changes to this variant are applied to all other variants. This allows you to build the base scene first, and apply minor changes as needed to all the variants.

Currently, variants allow you to have distinct walls, lights, and backgrounds for each variant. V14 levels support also exists, but all variants have the same levels. Each variant can have different level configurations, but not additional or removed levels.



### ⚠️ Caution! ⚠️
Changing variants overwrites _all_ unsaved changes!
