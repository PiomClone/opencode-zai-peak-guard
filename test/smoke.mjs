import { ZaiPeakGuard } from "../src/server.js"

globalThis.Intl.DateTimeFormat = class {
  format() {
    return "10"
  }
}

const hooks = await ZaiPeakGuard()

async function run(sessionID, modelID, text) {
  const output = {
    message: { sessionID, model: { providerID: "zai-coding-plan", modelID } },
    parts: [{ type: "text", text }],
  }
  await hooks["chat.message"]({ sessionID }, output)
  return output
}

const downgraded = await run("s1", "glm-5.2", "do work")
if (downgraded.message.model.modelID !== "glm-4.7") {
  throw new Error(`expected downgrade to glm-4.7, got ${downgraded.message.model.modelID}`)
}

const allowed = await run("s2", "glm-4.7", "разрешаю пик поехали")
if (allowed.message.model.modelID !== "glm-5.2") {
  throw new Error(`expected allow marker to switch to glm-5.2, got ${allowed.message.model.modelID}`)
}
if (allowed.parts[0].text !== "поехали") {
  throw new Error(`expected marker to be stripped, got ${JSON.stringify(allowed.parts[0].text)}`)
}

const next = await run("s2", "glm-5.2", "next")
if (next.message.model.modelID !== "glm-5.2") {
  throw new Error(`expected session allow to keep glm-5.2, got ${next.message.model.modelID}`)
}

console.log("ok")
