# Monthly Reporting System — Overview

## What is this app?

This is a **monthly reporting platform** built for an organization that operates across multiple geographic levels — from large districts down to small local councils. It gives every level of the organization a structured, consistent way to record what happened each month and share that information up the chain.

Think of it as a digital report card that travels upward — local councils fill it in, their zone reviews it, and the district gets the final picture.

---

## How the organization is structured

The organization has three levels, each nested inside the one above:

**Zila (District)** — the top level. Oversees everything within a district.

**Zone** — sits inside a Zila. Each Zila has multiple Zones.

**UC (Union Council / Halqa)** — the ground level. Each Zone has multiple UCs. This is where members actually belong and where reports originate.

Every person in the system is a member of exactly one UC.

---

## What does the app actually do?

### 1. Members fill out monthly reports

At the start of each month, the UC President or Secretary logs in and fills out a report for their UC covering the previous month. The form asks things like:

- Who is the current president and secretary?
- How many Rukan, Umeedwar, and youth members are there?
- What activities took place? (e.g. youth meetings, study circles, sports events) — how many times, and how many people attended?

Some fields are pre-filled automatically from last month's report to save time.

### 2. Reports flow upward for review

Once UC reports are filled in, the Zone President can review all the reports from UCs in their zone, make corrections if needed, and then **lock** them — signalling that the zone's data is complete.

The Zila President then reviews everything across all zones and gives the final **sign-off**, locking the data permanently for that month.

### 3. Data is exportable

At any level, authorized users can export the data as an Excel file — either for a single UC, a whole zone, or the entire Zila — useful for meetings, presentations, or record-keeping.

---

## Who uses it and what can they do?

| Role | What they can do |
|---|---|
| **UC President** | Fill in and edit their UC's monthly report; manage members in their UC |
| **UC Secretary** | Same as UC President for report entry |
| **Zone President** | View and edit all UC reports in their zone; lock reports once reviewed |
| **Zone Secretary** | View and edit UC reports in their zone |
| **Zila President** | Full access to everything; assign roles to members; give final sign-off |
| **Zila Secretary** | Read-only access across the entire Zila; can export reports |

A person can hold more than one role — for example, someone might be both a UC President and assist at the Zone level.

---

## How does locking work?

Reports go through three stages:

**Draft** → the UC has submitted their report but it can still be edited by the UC or Zone.

**Zone Locked** → the Zone President has reviewed and locked all UC reports in their zone. UC and Zone users can no longer make changes. Only the Zila President can edit at this point.

**Finalized** → the Zila President has given final sign-off. The report is now permanent and no one can edit it.

This ensures data integrity — once a level signs off, the information below it is frozen.

---

## What makes it flexible?

The form itself is driven by the system — meaning administrators can add new fields or sections to the report without rebuilding the app. Fields can be different depending on whether you're filling in a UC, Zone, or Zila-level report.

Activities are also flexible — there's a standard list (like "Youth Meeting", which is compulsory every month), but users can also log custom activities that aren't on the predefined list.

---

## What the app is not

- It is **not** a communication tool — there's no messaging or notifications
- It is **not** a real-time dashboard — data reflects what has been submitted for each month
- It is **not** public — every user must log in with an email and password