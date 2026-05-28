---
title: Appearance Settings
description: Theme and font choices available in Keyper.
---

Keyper includes a dedicated **Appearance** tab in Dashboard Settings so each user can tune the vault to a comfortable visual style. These choices are local preferences: changing the theme or font does not affect stored credentials, encryption, database schema, or other users.

## Opening appearance settings

1. Unlock Keyper.
2. Open **Dashboard Settings**.
3. Select the **Appearance** tab.

Theme and font choices are saved locally in the browser or Electron profile and are restored automatically on the next launch.

## Theme choices

The screenshots in these docs show the default dark and light themes, but Keyper includes a larger set of built-in appearance modes:

| Theme | Best for |
| --- | --- |
| Light | A clean white workspace for bright environments. |
| Dark | The default black dark-mode vault. |
| System | Matching the current operating-system preference. |
| Charcoal | A softer dark option with lighter contrast than the default dark theme. |
| Medium Gray | A balanced middle-contrast option between light and dark. |
| Light Gray | A neutral, low-glare light theme. |
| Warm Light | A softer light theme with warmer background tones. |
| Blue | A cool light theme with blue-focused accents. |
| Midnight Blue | A dark blue background theme. |
| Deep Purple | A dark purple background theme. |

The theme selector uses visual swatches, so users can preview the general palette before applying it. Core dashboard surfaces, tags, buttons, and background accents follow the selected palette.

## Font choices

Keyper also provides five application font choices:

| Font | Character |
| --- | --- |
| Inter | The default clean interface font. |
| Roboto | A familiar, compact sans-serif option. |
| Outfit | A rounder modern sans-serif option. |
| Playfair Display | A more editorial serif option. |
| Fira Code | A monospaced option for users who prefer code-like readability. |

The Keyper logo keeps its branded styling even when the application font changes.

## Local preference storage

Appearance preferences are stored locally:

- Theme preference: `theme`
- Font preference: `keyper-font-preference`

Clearing the browser or Electron profile storage can reset these preferences to the defaults. It does not erase remote Supabase or Neon data, but it can remove local provider configuration and browser-local SQLite data depending on what storage is cleared.
