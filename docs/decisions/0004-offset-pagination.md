# 0004. Offset pagination with a total count

- Status: accepted
- Date: 2026-11-05

## Context
`GET /patients` is paginated, and supports server-side search, filtering and sorting. A registry belongs to one practice (later, one tenant): thousands to tens of thousands of patients. Staff find patients mostly by searching, not by paging deep.

## Options
- **Offset + total count**: gives page numbers and "N results". Its cost grows with page depth.
- **Keyset / cursor**: stable under concurrent inserts and scales to very large tables. It has no page numbers, and multi-field sorts make it more complex.

## Decision
Offset. The parameters are `limit` (1–100, default 20) and `offset`. The response is `{items, total, limit, offset}`.

## Consequences
- The UI can show page numbers and result counts. The virtualized list (a stretch goal) pages through offsets.
- A filtered `COUNT(*)` with trigram and sort indexes stays in the low milliseconds at practice scale. The 1,000-patient seed demonstrates it.
- With real-time updates, an insert can shift page boundaries. If that becomes a problem, a `cursor` parameter can be added alongside `offset` without breaking the response.
