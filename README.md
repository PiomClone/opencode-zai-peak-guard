# opencode-zai-peak-guard

OpenCode server plugin that prevents accidental Z.AI / GLM peak pricing usage and documents the current off-peak quota window.

It is useful when you use Z.AI Coding Plan models in OpenCode and want a default-safe behavior during the expensive peak window: premium requests are automatically downgraded unless you explicitly allow peak usage for the current session.

Companion TUI plugin: [opencode-zai-rate-indicator](https://github.com/PiomClone/opencode-zai-rate-indicator).

## Quick Install

```sh
opencode plugin git@github.com:PiomClone/opencode-zai-peak-guard.git -g --force
```

Restart OpenCode after installing.

## What It Does

Default behavior:

- during `09:00-13:00 Europe/Moscow`, premium Z.AI models are treated as `3x` quota
- outside peak hours, premium Z.AI models are treated as `1x` quota until `2026-09-30`, then `2x` quota by default

During peak:

- downgrades `zai-coding-plan/glm-5.2` and `zai-coding-plan/glm-5-turbo` to `zai-coding-plan/glm-4.7`
- adds a short notice to the user message
- does not throw, so OpenCode TUI does not show stack traces
- `Разрешаю пик` allows premium usage for the current session
- `Разрешаю пик поехали` strips the marker and sends `поехали` to `glm-5.2`

Session allow state is in-memory and resets after OpenCode restarts.

## Install

From GitHub:

```sh
opencode plugin git@github.com:PiomClone/opencode-zai-peak-guard.git -g --force
```

From a local checkout:

```sh
opencode plugin file://$(pwd) -g --force
```

## Options

```jsonc
[
  "git@github.com:PiomClone/opencode-zai-peak-guard.git",
  {
    "peakHours": { "start": 9, "end": 13, "timeZone": "Europe/Moscow" },
    "offPeakBenefitUntil": "2026-09-30",
    "blockedProviders": ["zai-coding-plan", "zhipuai-coding-plan", "zai", "zhipuai"],
    "blockedModels": ["glm-5.2", "glm-5-turbo"],
    "fallbackModel": { "providerID": "zai-coding-plan", "modelID": "glm-4.7" },
    "premiumModel": { "providerID": "zai-coding-plan", "modelID": "glm-5.2" },
    "allowMarkers": ["разрешаю пик", "allow peak", "!peak", "!пик"]
  }
]
```

## Development

```sh
npm run check
```

## Keywords

OpenCode plugin, Z.AI, Z AI, GLM-5, GLM-5.2, Z.AI Coding Plan, peak pricing, off-peak quota, quota guard, model downgrade.
