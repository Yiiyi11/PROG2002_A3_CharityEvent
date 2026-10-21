# Database Design — Charity Events (Assessment 3)

## 1. Entity relationship diagram

```
┌──────────────────────────┐
│        categories        │
├──────────────────────────┤
│ category_id   INT  PK    │
│ category_name VARCHAR(80)│  UNIQUE
│ description   VARCHAR(255)│
└────────────┬─────────────┘
             │ 1
             │
             │ N
┌────────────▼─────────────────────────┐        ┌────────────────────────────┐
│               events                 │        │  charity_organisations     │
├──────────────────────────────────────┤        ├────────────────────────────┤
│ event_id          INT  PK            │  N   1 │ organisation_id  INT  PK   │
│ category_id       INT  FK ───────────┼────────┤ organisation_name VARCHAR    │
│ organisation_id   INT  FK ───────────┼────────►│ contact_email    VARCHAR    │
│ event_name        VARCHAR(150)       │        │ phone            VARCHAR    │
│ event_description TEXT               │        │ website          VARCHAR    │
│ event_date        DATETIME           │        └────────────────────────────┘
│ location          VARCHAR(150)       │
│ latitude          DECIMAL(9,6)       │  ← added in A3 (Open-Meteo)
│ longitude         DECIMAL(9,6)       │  ← added in A3 (Open-Meteo)
│ ticket_price      DECIMAL(10,2)      │
│ capacity          INT                │  ← added in A3
│ target_amount     DECIMAL(10,2)      │
│ raised_amount     DECIMAL(10,2)      │
│ is_suspended      TINYINT(1)         │
│ event_image_url   VARCHAR(255)       │
└────────────┬─────────────────────────┘
             │ 1
             │
             │ N            ON UPDATE CASCADE / ON DELETE RESTRICT
┌────────────▼──────────────────────────┐
│             registrations             │  ← NEW in Assessment 3
├───────────────────────────────────────┤
│ registration_id   INT  PK AUTO_INC    │
│ event_id          INT  FK             │
│ user_name         VARCHAR(120)        │
│ user_email        VARCHAR(150)        │
│ user_phone        VARCHAR(30)         │
│ ticket_quantity   INT   CHECK 1..10   │
│ total_amount      DECIMAL(10,2)       │
│ registration_date DATETIME            │
│ notes             VARCHAR(255) NULL   │
├───────────────────────────────────────┤
│ UNIQUE (event_id, user_email)         │
│ INDEX  (registration_date)            │
└───────────────────────────────────────┘
```

## 2. Cardinality

| Relationship | Cardinality | Notes |
| --- | --- | --- |
| `categories` → `events` | 1 : N | Every event belongs to exactly one category. |
| `charity_organisations` → `events` | 1 : N | Every event is run by one organisation. |
| `events` → `registrations` | 1 : N | An event has zero or many bookings. |

## 3. Normalisation

The schema is in **third normal form**:

* **1NF** — every column holds a single atomic value; there are no repeating
  groups. Multi-ticket bookings are modelled as `ticket_quantity`, not as a
  comma-separated list of attendees.
* **2NF** — every table has a single-column surrogate primary key
  (`event_id`, `registration_id`, …), so no non-key attribute depends on part of
  a composite key.
* **3NF** — no transitive dependencies. The organisation's email and website live
  only in `charity_organisations`; `events` stores just the foreign key.
  The category name lives only in `categories`.

`registrations.total_amount` is technically derivable
(`ticket_quantity × events.ticket_price`). It is stored anyway, because the price
can change after a booking is made and the amount the visitor actually paid must
remain auditable. The value is computed **server-side** on insert — never trusted
from the browser.

## 4. Constraint rationale

| Constraint | Why it exists |
| --- | --- |
| `fk_registrations_event … ON DELETE RESTRICT` | A booking is a financial record. Deleting its event would orphan it. The API returns `409` and explains how many registrations block the delete. |
| `UNIQUE (event_id, user_email)` | Stops one person from holding several bookings for the same event, which would let them hoard limited seats. The API returns `409`. |
| `CHECK (ticket_quantity BETWEEN 1 AND 10)` | A group booking limit, enforced by MySQL so it holds even if the API is bypassed. |
| `UNIQUE (category_name)` | Prevents duplicate categories appearing in the browse menu. |
| `ON UPDATE CASCADE` | If a key ever changes, dependent rows follow automatically. |

## 5. Indexes

| Index | Supports |
| --- | --- |
| `idx_event_date (event_date)` | Sorting and filtering the event list by date. |
| `idx_registration_date (registration_date)` | The required "newest registration first" ordering. |
| `uq_registration_event_user` | Duplicate-booking check on `POST /api/registrations`. |
| `idx_event_location (location)` | The `location=` search filter. |

## 6. Migration from Assessment 2

```sql
ALTER TABLE events
  ADD COLUMN latitude  DECIMAL(9,6) NULL AFTER location,
  ADD COLUMN longitude DECIMAL(9,6) NULL AFTER latitude,
  ADD COLUMN capacity  INT NOT NULL DEFAULT 200 AFTER ticket_price;

ALTER TABLE categories
  ADD COLUMN description VARCHAR(255) NULL AFTER category_name;

ALTER TABLE charity_organisations
  ADD COLUMN website VARCHAR(255) NULL AFTER phone;

CREATE TABLE registrations ( … );
```

`database/charityevents_a3_schema.sql` applies all of the above and seeds
13 events, 6 categories, 3 organisations and 18 registrations spread across
multiple events and dates.
