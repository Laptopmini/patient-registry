# 03 · Data model

All data shown in designs must be synthetic (see `04-sample-data.json`).

## Patient
| Field | Type | Rules / display |
|-------|------|-----------------|
| `id` | UUID | Never shown to users |
| `first_name`, `last_name` | text | Required, 1–100 characters each. Display as "Last, First" in lists and "First Last" in headers. Very long names must wrap or truncate gracefully (see the sample patient "Maximiliana-Josephine Vanderbilt-Okonkwo-Hargreaves") |
| `date_of_birth` | date | Required, not in the future, at most 130 years ago. Display as a localised medium date ("27 Sep 1947") |
| `age` | integer, derived | Computed from date of birth, never entered. Display "78 y"; under 2 years, "18 mo" |
| `email` | text | Optional, must be a valid email |
| `phone` | text | Optional, E.164 (`+14155550155`). Display formatted ("+1 415-555-0155") |
| `address` | object | Optional as a whole. If present: `line1` (required), `line2` (optional), `city` (required), `region` (optional), `postal_code` (optional), `country` (ISO 3166-1 alpha-2, required, default `US`) |
| `blood_type` | enum | `A+` `A-` `B+` `B-` `AB+` `AB-` `O+` `O-` `unknown`. Required, default `unknown`, shown as "Unknown" |
| `status` | enum | `active` · `follow_up` · `inactive`, labelled **Active**, **Follow-up**, **Inactive**. Required, default `active`. Needs a badge with text plus a shape or icon cue |
| `allergies` | list of `{name}` | 0–50 items, each 1–100 characters, unique (case-insensitive) |
| `conditions` | list of `{name}` | Same rules as allergies |
| `last_visit` | datetime, derived | The newest note's clinical time, or empty (show "No visits"). Read-only |
| `version` | integer | Used for edit-conflict detection. Never shown |
| `created_at`, `updated_at` | datetime | Set by the server. Optionally shown in a "record info" footnote |

Archived (deleted) patients disappear from every screen. There's no "archived" status in the UI for v1.

## Note
| Field | Type | Rules / display |
|-------|------|-----------------|
| `id` | UUID | Not shown |
| `recorded_at` | datetime with timezone | The clinical time of the encounter. Required, not in the future. Shown prominently ("12 Oct 2026, 14:30") |
| `body` | text | Required, 1–5,000 characters, plain text (keep line breaks) |
| `created_at` | datetime | When it was entered. Secondary ("added 3 days ago") |

## Summary (read-only, generated)
| Field | Notes |
|-------|-------|
| `name`, `age`, `blood_type` | Come straight from the record |
| `conditions`, `allergies` | Come straight from the record |
| `narrative` | 1–3 short paragraphs generated from the notes |
| `provider` | `template` or `anthropic`, which drives the provenance label |
| `generated_at` | Timestamp |
| `note_count` | "Based on 6 notes" |

## Patient list query
- `q` matches parts of the first name, last name, email or phone.
- `status` filters by one status. Later versions add `blood_type`, `condition` and `allergy` filters.
- `sort` is one of `last_name`, `age`, `last_visit`, `created_at`, prefixed with `-` for descending.
- `limit` (default 20, at most 100) and `offset`. The response includes `total`.

## Error format
Errors use RFC 9457 problem details: `title`, `status`, `detail`, and for validation errors `errors: [{field: "phone", message: "…"}]`. Designs need a field-level error style and an error-summary pattern.
