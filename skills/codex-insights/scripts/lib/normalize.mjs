function extractTextSegments(content) {
  if (typeof content === "string") {
    return [content]
  }

  if (!Array.isArray(content)) {
    return []
  }

  const segments = []

  for (const block of content) {
    if (!block || typeof block !== "object") {
      continue
    }

    if (typeof block.text === "string") {
      segments.push(block.text)
    }
  }

  return segments
}

function compactText(value) {
  if (typeof value !== "string") {
    return null
  }

  return value.trim() || null
}

function createRawRef(record) {
  return {
    source_file: record.source_file,
    line_number: record.line_number,
    raw_type: record.type,
    payload_type:
      record.payload && typeof record.payload === "object" && typeof record.payload.type === "string"
        ? record.payload.type
        : null,
  }
}

function inferToolStatus(output) {
  if (typeof output !== "string") {
    return "unknown"
  }

  const match = output.match(/Process exited with code (\d+)/)
  if (!match) {
    return "unknown"
  }

  return match[1] === "0" ? "success" : "failure"
}

function buildTextFromOutput(output) {
  if (typeof output !== "string") {
    return null
  }

  return compactText(output.slice(0, 500))
}

function normalizeUsage(rawUsage) {
  if (!rawUsage || typeof rawUsage !== "object" || Array.isArray(rawUsage)) {
    return null
  }

  const keys = [
    "input_tokens",
    "cached_input_tokens",
    "output_tokens",
    "reasoning_output_tokens",
    "total_tokens",
  ]
  const usage = {}
  let hasValue = false

  for (const key of keys) {
    const value = rawUsage[key]
    if (Number.isFinite(value) && value >= 0) {
      usage[key] = value
      hasValue = true
    }
  }

  return hasValue ? usage : null
}

function createBaseEvent(sessionState, record, overrides = {}) {
  return {
    session_id: sessionState.sessionId,
    timestamp: record.timestamp,
    event_type: "unknown",
    role: null,
    text: null,
    tool_name: null,
    tool_status: null,
    cwd: sessionState.cwd,
    model_provider: sessionState.modelProvider,
    token_usage: null,
    command_text: null,
    file_paths: [],
    raw_ref: createRawRef(record),
    ...overrides,
  }
}

function normalizeEventMessage(record, sessionState, warnings) {
  const payload = record.payload
  if (!payload || typeof payload !== "object") {
    warnings.push({
      code: "invalid_event_msg_payload",
      message: "event_msg payload was not an object.",
      raw_ref: createRawRef(record),
    })
    return createBaseEvent(sessionState, record, { event_type: "unknown" })
  }

  switch (payload.type) {
    case "user_message":
      return createBaseEvent(sessionState, record, {
        event_type: "user_message",
        role: "user",
        text: compactText(payload.message),
      })
    case "agent_message":
      return createBaseEvent(sessionState, record, {
        event_type: "assistant_message",
        role: "assistant",
        text: compactText(payload.message),
      })
    case "token_count":
      return createBaseEvent(sessionState, record, {
        event_type: "system_event",
        text: "token_count",
        token_usage: normalizeUsage(payload.info?.total_token_usage),
      })
    default:
      return createBaseEvent(sessionState, record, {
        event_type: "system_event",
        text: typeof payload.type === "string" ? payload.type : null,
      })
  }
}

function normalizeResponseItem(record, sessionState, callMap, warnings) {
  const payload = record.payload
  if (!payload || typeof payload !== "object") {
    warnings.push({
      code: "invalid_response_item_payload",
      message: "response_item payload was not an object.",
      raw_ref: createRawRef(record),
    })
    return createBaseEvent(sessionState, record, { event_type: "unknown" })
  }

  switch (payload.type) {
    case "message": {
      const text = extractTextSegments(payload.content).join("\n")
      const role = payload.role === "user" || payload.role === "assistant" ? payload.role : null
      return createBaseEvent(sessionState, record, {
        event_type:
          role === "user" ? "user_message" : role === "assistant" ? "assistant_message" : "system_event",
        role,
        text: compactText(text),
      })
    }
    case "function_call": {
      if (typeof payload.call_id === "string" && typeof payload.name === "string") {
        callMap.set(payload.call_id, payload.name)
      }

      return createBaseEvent(sessionState, record, {
        event_type: "tool_call",
        tool_name: typeof payload.name === "string" ? payload.name : null,
        command_text: typeof payload.arguments === "string" ? payload.arguments : null,
      })
    }
    case "function_call_output":
      return createBaseEvent(sessionState, record, {
        event_type: "tool_result",
        tool_name:
          typeof payload.call_id === "string" && callMap.has(payload.call_id)
            ? callMap.get(payload.call_id)
            : null,
        tool_status: inferToolStatus(payload.output),
        text: buildTextFromOutput(payload.output),
      })
    case "reasoning":
      return createBaseEvent(sessionState, record, {
        event_type: "system_event",
        text: "reasoning",
      })
    default:
      warnings.push({
        code: "unsupported_response_item_type",
        message: `Unsupported response_item payload type: ${String(payload.type)}`,
        raw_ref: createRawRef(record),
      })
      return createBaseEvent(sessionState, record, {
        event_type: "unknown",
        text: typeof payload.type === "string" ? payload.type : null,
      })
  }
}

export function normalizeSessionRecords(records, initialWarnings = []) {
  const warnings = [...initialWarnings]
  const callMap = new Map()
  const sessionMetaRecord = records.find((record) => record.type === "session_meta")
  const sessionState = {
    sessionId:
      sessionMetaRecord?.payload && typeof sessionMetaRecord.payload.id === "string"
        ? sessionMetaRecord.payload.id
        : "unknown-session",
    startedAt:
      sessionMetaRecord?.payload && typeof sessionMetaRecord.payload.timestamp === "string"
        ? sessionMetaRecord.payload.timestamp
        : records[0]?.timestamp ?? null,
    cwd:
      sessionMetaRecord?.payload && typeof sessionMetaRecord.payload.cwd === "string"
        ? sessionMetaRecord.payload.cwd
        : null,
    modelProvider:
      sessionMetaRecord?.payload && typeof sessionMetaRecord.payload.model_provider === "string"
        ? sessionMetaRecord.payload.model_provider
        : null,
  }

  if (!sessionMetaRecord) {
    warnings.push({
      code: "missing_session_meta",
      message: "No session_meta record was found in this transcript file.",
      raw_ref: null,
    })
  }

  const events = records.map((record) => {
    if (record.type === "session_meta") {
      return createBaseEvent(sessionState, record, {
        event_type: "session_meta",
        text: "session_meta",
      })
    }

    if (record.type === "event_msg") {
      return normalizeEventMessage(record, sessionState, warnings)
    }

    if (record.type === "response_item") {
      return normalizeResponseItem(record, sessionState, callMap, warnings)
    }

    warnings.push({
      code: "unsupported_record_type",
      message: `Unsupported top-level record type: ${String(record.type)}`,
      raw_ref: createRawRef(record),
    })

    return createBaseEvent(sessionState, record, {
      event_type: "unknown",
      text: compactText(record.type),
    })
  })

  return {
    session_id: sessionState.sessionId,
    started_at: sessionState.startedAt,
    cwd: sessionState.cwd,
    model_provider: sessionState.modelProvider,
    source_file: records[0]?.source_file ?? null,
    events,
    warnings,
  }
}
