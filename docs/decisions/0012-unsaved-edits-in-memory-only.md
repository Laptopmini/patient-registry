# 0012. Keep unsaved edits in memory only

- Status: accepted
- Date: 2026-11-05

## Context
Edits must survive network failures and offline saves, so nothing typed is lost. The design proposed a `sessionStorage` draft that would also survive a reload. Form data here is protected health information (PHI).

## Options
- **`sessionStorage` draft**, keyed by patient and version: it survives a reload, but leaves unencrypted PHI in browser storage, which session restore can write to disk.
- **Memory only:** the form state is kept across failures and retries, and nothing is written to the device.

## Decision
Memory only. No patient data is written to `localStorage`, `sessionStorage`, IndexedDB or the Cache API. Browser storage is limited to non-PHI preferences, such as the later theme toggle.

## Consequences
- No ePHI rests on the device, so the app needs no device-level safeguards (encryption at rest, purge on logoff) for drafts. That fits the HIPAA Security Rule's safeguard expectations without extra controls. This is an engineering reading, not legal advice.
- A reload or a closed tab discards unsaved edits. Before leaving a form with unsaved changes, the app asks for confirmation (in-app navigation blocker plus `beforeunload`).
- `docs/SECURITY.md` records this, and a test checks that saving a form writes nothing to Web Storage.
