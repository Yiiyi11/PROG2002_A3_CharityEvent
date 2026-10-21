# PROG2002 Assessment 3 — Charity Event Booking System

A full-stack charity event booking platform built for **PROG2002 Assessment 3**.
The public website lets visitors browse, search and register for charity events;
a separate staff portal lets administrators manage events, categories and the
registrations that come in.

| Layer | Technology |
| --- | --- |
| Front end (public site) | HTML5, CSS3, **AngularJS 1.8.3** (ngRoute SPA + page controllers) |
| Front end (staff portal) | HTML5, CSS3, **AngularJS 1.8.3** (separate SPA application) |
| Back end | **Node.js 18.20.8**, **Express 4**, `mysql2/promise` connection pool |
| Database | **MySQL 8.0** — 5 tables, foreign keys, CHECK constraints, unique keys |
| External open API | **Open-Meteo** (`api.open-meteo.com`) — live 7-day venue forecasts |
| Styling | Hand-written CSS design system (custom properties, no framework) |

---

## 1. Repository layout

```
PROG2002_A3_CharityEvent/
├── api/                          Node.js + Express back end
│   ├── server.js                 App entry point: middleware, routes, static hosting
│   ├── event_db.js               mysql2 connection pool (reads .env)
│   ├── routes/
│   │   ├── events.js             /api/events        — CRUD + search + detail
│   │   ├── registrations.js      /api/registrations — create / list / delete
│   │   ├── categories.js         /api/categories    — category lookup
│   │   ├── organisations.js      /api/organisations — charity lookup
│   │   └── stats.js              /api/stats         — dashboard aggregates
│   └── utils/
│       ├── validation.js         Chainable server-side validator
│       └── respond.js            Uniform JSON response envelope
├── client/                       Public AngularJS site (9 pages)
├── admin/                        Staff portal AngularJS app (7 routes)
├── database/
│   └── charityevents_a3_schema.sql   Full schema + seed data (A2 → A3 migration)
├── docs/                         Report material, ER diagram, API reference
├── .env.example                  Configuration template
└── package.json
```

---

## 2. Getting started

### 2.1 Prerequisites

* **Node.js 18.20.8** (`node -v` must report `v18.20.x`)
* **MySQL 8.0** running locally

### 2.2 Create the database

```bash
mysql -u root -p < database/charityevents_a3_schema.sql
```

The script is idempotent: it drops and recreates `charityevents_db`, so you can
re-run it at any time to reset to the shipped demo data.

### 2.3 Configure the connection

Copy `.env.example` to `.env` and adjust the values:

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=charityevents_db
PORT=3000
```

### 2.4 Install and run

```bash
npm install
npm start
```

Then open:

| URL | What it is |
| --- | --- |
| <http://localhost:3000/> | Public charity website |
| <http://localhost:3000/admin/> | Staff portal |

---

## 3. Database design

Five tables, normalised to 3NF.

```
categories ──┐
             ├──< events >──┐
organisations┘              │
                            ├──< registrations
                            └──  (ON DELETE RESTRICT)
```

### 3.1 What changed from Assessment 2

| Change | Reason |
| --- | --- |
| **`registrations` table added** | Core A3 requirement: visitors must be able to book seats. |
| `events.latitude` / `longitude` added | Lets the site request an Open-Meteo forecast for the actual venue. |
| `events.capacity` added | Enables "seats remaining" and an over-booking guard. |
| `categories.description` added | Gives the category page something meaningful to show. |
| `charity_organisations.website` added | Lets visitors verify who is running an event. |
| `UNIQUE (event_id, user_email)` | One person may hold only one registration per event. |
| `CHECK (ticket_quantity BETWEEN 1 AND 10)` | Enforced by the database, not only by JavaScript. |

### 3.2 Key constraints

```sql
-- registrations
CONSTRAINT fk_registrations_event
  FOREIGN KEY (event_id) REFERENCES events (event_id)
  ON UPDATE CASCADE ON DELETE RESTRICT,
CONSTRAINT chk_registration_tickets
  CHECK (ticket_quantity BETWEEN 1 AND 10),
UNIQUE KEY uq_registration_event_user (event_id, user_email)
```

`ON DELETE RESTRICT` is deliberate: an event that already has registrations
cannot be deleted, because that would orphan real booking records.

---

## 4. REST API reference

All responses use the same envelope:

```json
{ "success": true, "data": { }, "message": "..." }
```

### 4.1 Events

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/events/home` | Featured events + headline stats for the landing page |
| `GET` | `/api/events/search` | Search by `date`, `location`, `category_id`, `keyword`, `include_past`, `sort` |
| `GET` | `/api/events` | Admin list — every event, including suspended ones |
| `GET` | `/api/events/:event_id` | Single event **with its registrations, newest first** |
| `POST` | `/api/events` | Create an event |
| `PUT` | `/api/events/:event_id` | Update an event |
| `DELETE` | `/api/events/:event_id` | Delete an event (`409` if it has registrations) |

Every event object is decorated server-side with derived fields so the client
never has to re-compute business rules:

```json
{
  "event_id": 1,
  "event_name": "City Fun Run 2026",
  "status": "open",              // open | full | past | suspended
  "tickets_sold": 52,
  "seats_remaining": 348,
  "progress_percent": 13
}
```

### 4.2 Registrations

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/registrations` | Admin list of all registrations |
| `GET` | `/api/events/:event_id/registrations` | Registrations for one event, ordered `registration_date DESC` |
| `POST` | `/api/registrations` | Register for an event |
| `DELETE` | `/api/registrations/:registration_id` | Cancel a registration |

### 4.3 Status codes

| Code | When |
| --- | --- |
| `200` | Successful read or update |
| `201` | Resource created |
| `400` | Validation failure (per-field messages returned in `errors`) |
| `404` | Resource not found |
| `409` | Business-rule conflict: duplicate email, event full, event suspended, event has registrations |
| `500` | Unexpected server error |

### 4.4 Server-side validation

`api/utils/validation.js` exposes a small chainable validator. Every write
endpoint validates before it touches the database:

```js
const { Validator } = require('../utils/validation');

const v = new Validator(req.body)
  .required('event_name', 'Event name')
  .maxLength('event_name', 150)
  .required('event_date', 'Event date')
  .dateTime('event_date')
  .number('ticket_price', { min: 0 })
  .oneOf('category_id', categoryIds);

if (v.hasErrors()) return fail(res, 400, 'Please check the form', v.errors);
```

All SQL uses **parameter placeholders** (`?`), so user input can never be
concatenated into a statement.

---

## 5. External open API — Open-Meteo

The brief asks for an external open API that genuinely improves the site.
`client/src/js/services/weather.service.js` calls:

```
https://api.open-meteo.com/v1/forecast
  ?latitude=…&longitude=…
  &daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max
  &timezone=Australia%2FBrisbane&forecast_days=7
```

Open-Meteo is used because it needs **no API key**, has no rate-limit surprises
during marking, and returns real forecast data.

Where the data appears:

* **Event detail page** — a live forecast for the venue on the event date, with
  an advice banner ("rain is likely, the event will move indoors").
* **Weather page** — 7-day forecast plus a venue picker for all locations that
  currently have events.
* **Staff portal → Weather diagnostics** — lets staff check every venue's
  forecast at once when deciding whether to postpone.

WMO weather codes are translated to readable text and icons in `WMO_CODES`.

---

## 6. AngularJS architecture

Two independent applications share nothing but the API:

**`charityApp`** (public site)

| Piece | File |
| --- | --- |
| Module + routes | `client/src/js/app.config.js` |
| API wrapper | `client/src/js/services/event.service.js` |
| Weather wrapper | `client/src/js/services/weather.service.js` |
| Reusable card directive | `client/src/js/directives/event-card.js` |
| Helper directives | `client/src/js/directives/helpers.js` (`ngError`, `backToTop`, `countUp`) |
| 10 controllers | `client/src/js/controllers/` |

**`adminApp`** (staff portal)

| Piece | File |
| --- | --- |
| Module + routes | `admin/src/js/admin-app.js` |
| `ApiService`, `ToastService`, `Fmt` | `admin/src/js/admin-app.js` |
| 7 controllers | `admin/src/js/controllers/` |

AngularJS concepts demonstrated: modules, dependency injection, `factory`
services, custom directives (with isolated scope), `$routeProvider` / `ng-view`,
two-way binding, `ng-model-options`, `ng-repeat` with filters, `ng-options`,
`$watchGroup`, form validation states, and `$http` interceptors.

---

## 7. Pages

### Public site (9 pages)

| Page | File | What it does |
| --- | --- | --- |
| Home | `index.html` | Hero, live stats, featured events, category shortcuts |
| All events | `events.html` | Card grid with upcoming / past tabs |
| Search | `search.html` | Filter by date, location, category, keyword |
| Event detail | `event-detail.html` | Full details, forecast, **registration list** |
| Register | `register.html` | Booking form with live total calculation |
| Categories | `categories.html` | Browse by cause |
| Weather | `weather.html` | 7-day forecasts for every venue |
| About | `about.html` | Mission, impact numbers, team |
| Contact | `contact.html` | Enquiry form with client-side validation |

### Staff portal (7 routes)

Dashboard · Manage events · Create event · Edit event · Categories ·
Registrations · Weather diagnostics

---

## 8. Testing performed

* Every page opened in a headless Chrome run — 16 routes, **0 console errors,
  0 failed network requests**.
* API behaviour verified with `curl` for each endpoint, including the negative
  paths: invalid payload → `400` with per-field errors; duplicate email → `409`;
  over-capacity booking → `409`; deleting an event with registrations → `409`;
  reducing capacity below tickets sold → `400`.
* Registration list ordering verified: the detail endpoint returns
  `registration_date` in descending order (newest booking first), as required.

---

## 9. Team

| Member | GitHub | Main responsibilities |
| --- | --- | --- |
| Yiiyi11 | [@Yiiyi11](https://github.com/Yiiyi11) | Database schema, Express API, validation, AngularJS public site |
| zhou123445 | [@zhou123445](https://github.com/zhou123445) | Staff portal, search & registration flows, weather integration, styling |

---

## 10. GenAI acknowledgement

Portions of the CSS design system, boilerplate and documentation wording were
drafted with the assistance of generative AI tools. All architecture decisions,
database design, business rules and final code review were carried out by the
team members listed above.
