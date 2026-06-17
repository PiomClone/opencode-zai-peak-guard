const DEFAULT_BLOCKED_PROVIDERS = ["zai-coding-plan", "zhipuai-coding-plan", "zai", "zhipuai"]
const DEFAULT_BLOCKED_MODELS = ["glm-5.2", "glm-5-turbo"]
const DEFAULT_ALLOW_MARKERS = ["разрешаю пик", "allow peak", "!peak", "!пик", "[peak-ok]", "[пик-ок]"]
const DEFAULT_FALLBACK_MODEL = { providerID: "zai-coding-plan", modelID: "glm-4.7" }
const DEFAULT_PREMIUM_MODEL = { providerID: "zai-coding-plan", modelID: "glm-5.2" }
const DEFAULT_PEAK_HOURS = { start: 9, end: 13, timeZone: "Europe/Moscow" }
const DEFAULT_OFF_PEAK_BENEFIT_UNTIL = "2026-09-30"

const allowedPeakSessions = new Set()

function normalizeList(value, fallback) {
  return Array.isArray(value) && value.length > 0 ? value.map((item) => String(item).toLowerCase()) : fallback
}

function config(options = {}) {
  return {
    blockedProviders: new Set(normalizeList(options.blockedProviders, DEFAULT_BLOCKED_PROVIDERS)),
    blockedModels: new Set(normalizeList(options.blockedModels, DEFAULT_BLOCKED_MODELS)),
    allowMarkers:
      Array.isArray(options.allowMarkers) && options.allowMarkers.length > 0
        ? options.allowMarkers.map((item) => String(item).toLowerCase())
        : DEFAULT_ALLOW_MARKERS,
    fallbackModel: { ...DEFAULT_FALLBACK_MODEL, ...options.fallbackModel },
    premiumModel: { ...DEFAULT_PREMIUM_MODEL, ...options.premiumModel },
    peakHours: { ...DEFAULT_PEAK_HOURS, ...options.peakHours },
    offPeakBenefitUntil: options.offPeakBenefitUntil ?? DEFAULT_OFF_PEAK_BENEFIT_UNTIL,
  }
}

function hourInTimeZone(timeZone) {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date())

  return Number(hour)
}

function isPeakNow(peakHours) {
  const hour = hourInTimeZone(peakHours.timeZone)
  return hour >= peakHours.start && hour < peakHours.end
}

function dateKeyInTimeZone(timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function isOffPeakBenefitActive(settings) {
  if (!settings.offPeakBenefitUntil) return false
  return dateKeyInTimeZone(settings.peakHours.timeZone) <= settings.offPeakBenefitUntil
}

function currentQuotaMultiplier(settings) {
  if (isPeakNow(settings.peakHours)) return "3x"
  return isOffPeakBenefitActive(settings) ? "1x" : "2x"
}

function textParts(output) {
  return (output?.parts ?? []).filter((part) => part.type === "text" && typeof part.text === "string")
}

function hasSessionAllowMarker(output, allowMarkers) {
  const text = [
    ...textParts(output).map((part) => part.text),
    JSON.stringify(output),
  ]
    .join("\n")
    .toLowerCase()

  return allowMarkers.some((marker) => text.includes(marker))
}

function stripSessionAllowMarkers(output, allowMarkers) {
  for (const part of textParts(output)) {
    let next = part.text
    for (const marker of allowMarkers) {
      const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      next = next.replace(new RegExp(escaped, "gi"), "")
    }
    part.text = next.trim()
  }
}

function prependNotice(output, text) {
  const parts = textParts(output)
  if (parts.length === 0) return
  parts[0].text = `${text}\n\n${parts[0].text}`.trim()
}

export const ZaiPeakGuard = async (_input, options = {}) => {
  const settings = config(options)

  return {
    "chat.message": async (input, output) => {
      const messageModel = output?.message?.model ?? input.model
      const providerID = String(messageModel?.providerID ?? "").toLowerCase()
      const modelID = String(messageModel?.modelID ?? "").toLowerCase()

      if (!isPeakNow(settings.peakHours)) return

      const sessionKey = input.sessionID || output?.message?.sessionID || "__global__"

      if (hasSessionAllowMarker(output, settings.allowMarkers)) {
        allowedPeakSessions.add(sessionKey)
        stripSessionAllowMarkers(output, settings.allowMarkers)
        const hasText = textParts(output).some((part) => part.text.trim() !== "")

        if (hasText && settings.blockedProviders.has(providerID)) {
          output.message.model = {
            ...output.message.model,
            ...settings.premiumModel,
          }
        }

        if (!hasText) {
          output.message.model = {
            ...output.message.model,
            ...settings.fallbackModel,
          }
          prependNotice(output, "Z.AI peak guard: peak is allowed for the next requests in this session.")
        }
        return
      }

      if (!settings.blockedProviders.has(providerID)) return
      if (!settings.blockedModels.has(modelID)) return
      if (allowedPeakSessions.has(sessionKey)) return

      output.message.model = {
        ...output.message.model,
        ...settings.fallbackModel,
      }

      prependNotice(
        output,
        `Z.AI peak guard: ${messageModel.modelID} is in peak pricing window. ` +
          `Current quota multiplier: ${currentQuotaMultiplier(settings)}. ` +
          `Automatically switching this request to ${settings.fallbackModel.providerID}/${settings.fallbackModel.modelID}. ` +
          `Send '${settings.allowMarkers[0]}' once to allow peak usage for this session.`,
      )
    },
  }
}

export default {
  id: "opencode-zai-peak-guard",
  server: ZaiPeakGuard,
}
