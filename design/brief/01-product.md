# 01 · Product

## What it is
Patient Registry is a web dashboard that a medical practice uses to keep track of its patients. Staff can find a patient quickly, look over their profile and clinical history, add short clinical notes, and read an automatically generated summary.

## Who uses it
| User | Context | Needs most |
|------|---------|-----------|
| **Front-desk staff** | Busy and interrupted, at a desktop or a reception tablet | Find a patient in seconds, register new patients, update contact details |
| **Clinicians** (GPs, nurses) | Between appointments, often on a laptop or tablet, sometimes on a phone | See allergies and conditions at a glance, read and add notes, scan the summary |
| **Practice manager** | Desktop, occasional use | A sense of the patient population (counts by status), and housekeeping such as archiving |

Later versions will add sign-in, roles, an audit log, real-time updates and several practices. The design should leave room for a user menu in the header and for more sidebar sections.

## Goals
1. **Speed:** search answers while you type, and lists of thousands of patients stay smooth.
2. **Safety:** allergies are impossible to miss. Destructive actions ask for confirmation. Entered data is never lost when the network fails.
3. **Clarity:** a calm, low-noise clinical interface. Status and severity are never conveyed by colour alone.
4. **Accessibility:** WCAG 2.2 AA, fully keyboard-operable, comfortable at a 360px width.

## In scope (v1)
- Dashboard home with key counts and a shortcut to search
- Patient list: search, filter by status (and later by blood type, condition or allergy), sort, paginate
- Patient detail: profile, clinical notes (list, add, delete), generated summary
- Create and edit a patient, with validation
- A not-found page, plus error, empty, loading and offline states everywhere
- Light and dark themes that follow the system setting (a manual toggle is a later addition)

## Out of scope (v1)
Authentication, appointments or scheduling, billing, file attachments, messaging, printing.

## Tone
Professional, reassuring and plain-spoken. Use sentence case. Avoid jargon in system messages ("We couldn't save your changes", not "Error 500").
