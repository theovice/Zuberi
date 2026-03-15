# HTTP Gateway (v1)

The HTTP gateway serves registry bundles and typed/raw turn views for the UI.
Default bind: `CXDB_HTTP_BIND=127.0.0.1:9010`.

## Registry

- `PUT /v1/registry/bundles/{bundle_id}`
  - Body: registry bundle JSON
  - `201 Created` on new bundle
  - `204 No Content` if identical bundle already exists
  - `409/422` on validation error

- `GET /v1/registry/bundles/{bundle_id}`
  - Returns bundle JSON
  - Uses `ETag` / `If-None-Match`

- `GET /v1/registry/types/{type_id}/versions/{type_version}`
  - Returns descriptor for a single type version

Note: If `bundle_id` contains `#`, clients must URL-encode it or rely on server-side prefix matching.

## Turns

`GET /v1/contexts/{context_id}/turns`

Query params:
- `limit` (default 64)
- `before_turn_id` (paging older turns)
- `view=typed|raw|both` (default typed)
- `type_hint_mode=inherit|latest|explicit` (default inherit)
- `as_type_id`, `as_type_version` (required if explicit)
- `include_unknown=0|1`
- `bytes_render=base64|hex|len_only` (default base64)
- `u64_format=string|number` (default string)
- `enum_render=label|number|both` (default label)
- `time_render=iso|unix_ms` (default iso)

Response (typed):

```json
{
  "meta": {
    "context_id": "1",
    "head_turn_id": "5",
    "head_depth": 5,
    "registry_bundle_id": "2025-12-19T20:00:00Z#abc123"
  },
  "turns": [
    {
      "turn_id": "5",
      "parent_turn_id": "4",
      "depth": 5,
      "declared_type": { "type_id": "...", "type_version": 1 },
      "decoded_as": { "type_id": "...", "type_version": 1 },
      "data": { "role": "user", "text": "hello" }
    }
  ],
  "next_before_turn_id": "5"
}
```
