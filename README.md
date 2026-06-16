# opencode-zai-peak-guard

OpenCode server plugin that prevents accidental Z.AI peak pricing usage.

Default behavior during `09:00-13:00 Europe/Moscow`:

- downgrades `zai-coding-plan/glm-5.2` and `zai-coding-plan/glm-5-turbo` to `zai-coding-plan/glm-4.7`
- adds a short notice to the user message
- does not throw, so OpenCode TUI does not show stack traces
- `Разрешаю пик` allows premium usage for the current session
- `Разрешаю пик поехали` strips the marker and sends `поехали` to `glm-5.2`

Session allow state is in-memory and resets after OpenCode restarts.

## Install

```sh
opencode plugin file://$(pwd) -g --force
```

Or add it to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugin": [
    "file:///Users/avkorkin/prj/opencode/plugins/opencode-zai-peak-guard"
  ]
}
```

## Options

```jsonc
[
  "file:///Users/avkorkin/prj/opencode/plugins/opencode-zai-peak-guard",
  {
    "peakHours": { "start": 9, "end": 13, "timeZone": "Europe/Moscow" },
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
