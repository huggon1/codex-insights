# Normalized Event Model

## Purpose

The ingestion layer converts raw Codex session JSONL records into a stable session schema that later analytics and reporting stages can consume without depending on the current raw transcript format.

## Supported Raw Record Families

The current normalizer has explicit handling for these observed raw record families:

- top-level `session_meta`
- top-level `event_msg`
- top-level `response_item`

Unknown top-level record types are preserved as warnings instead of causing hard failures.

## Normalized Session Shape

Each session emits one object with these top-level fields:

- `session_id`
- `started_at`
- `cwd`
- `model_provider`
- `source_file`
- `events`
- `warnings`

## Normalized Event Shape

Each event emits these fields:

- `session_id`
- `timestamp`
- `event_type`
- `role`
- `text`
- `tool_name`
- `tool_status`
- `cwd`
- `model_provider`
- `token_usage`
- `command_text`
- `file_paths`
- `raw_ref`

## Current Event Types

- `session_meta`
- `user_message`
- `assistant_message`
- `tool_call`
- `tool_result`
- `system_event`
- `unknown`

## Notes

- `raw_ref` stores `source_file`, `line_number`, and raw type references for debugging.
- `tool_result` is linked to prior `tool_call` records by `call_id` when present.
- `event_msg` records with payload type `token_count` are normalized as `system_event` with `text: "token_count"` and `token_usage` populated from `info.total_token_usage` when present.
- `warnings` are part of the contract and should be preserved by downstream stages.
- This schema is intentionally minimal and should only grow when later stages require additional deterministic fields.
