This module allows you to easily change the background of a scene through the context menu.

Designed for the map naming syntax of Miska's Maps and locked to those modules by default, but it is possible to define custom RegExes to find the correct variants in the same directory and filter them.

## How to use
Enable the variant building setting from the module settings.

<img width="318" height="366" alt="example" src="https://github.com/MiskasMaps-FVTT/miskas-variant-picker/blob/feature/custom-variants/assets/example.png?raw=true"/>

Do not use Scene RegEx and Prefix together. Scene RegEx is used to dynamically define the prefix.

Scene RegEx: part of the filename of the background of the current scene that is used to find variants.

Variant RegEx: used to get the name of the variant for display. It **must** include at least one capture group, the first of which should contain the variant name.

Prefix: A string to use to search for matching variants. If a file contains this string, it is included in the potential matches for variants, which are further filtered to only those that contain a variant name.

Contains: An extra filter that selects only scenes containing this string.
