# API Reference — Charity Events A3

Base URL: `http://localhost:3000/api`

Every response uses one envelope so the client can handle success and failure
the same way:

```json
{ "success": true,  "data": { }, "message": "OK" }
{ "success": false, "message": "…", "errors": { "field": "reason" } }
```

---

## Events

### `GET /api/events/home`

Landing-page payload: the featured events, the headline counters, and the
category list in one round trip.

```json
{
  "success": true,
  "data": {
    "featured": [ … ],
    "stats": { "total_events": 12, "total_registrations": 18, "total_raised": 134250 },
    "categories": [ … ]
  }
}
```

### `GET /api/events/search`

| Query param | Type | Meaning |
| --- | --- | --- |
| `date` | `YYYY-MM-DD` | Events that start on that calendar day |
| `location` | string | Partial, case-insensitive match on `location` |
| `category_id` | int | Filter to one category |
| `keyword` | string | Matches `event_name` or `event_description` |
| `include_past` | `true`/`false` | Default `false` — only future events |
| `sort` | `date_asc` \| `date_desc` \| `price_asc` \| `price_desc` | Ordering |

```bash
curl "http://localhost:3000/api/events/search?location=Brisbane&sort=date_asc"
```

```json
{ "success": true, "count": 6, "data": [ … ] }
```

### `GET /api/events`

Administrator list. Behaves like `/search` with `include_past=true`, but also
returns suspended events. Every row includes the derived fields `status`,
`tickets_sold`, `seats_remaining` and `progress_percent`.

### `GET /api/events/:event_id`

Single event **plus its registrations, newest first**.

```json
{
  "success": true,
  "data": {
    "event_id": 1,
    "event_name": "City Fun Run 2026",
    "status": "open",
    "tickets_sold": 52,
    "seats_remaining": 348,
    "progress_percent": 13,
    "registrations": [
      { "registration_id": 18, "user_name": "…", "registration_date": "2026-10-08 09:14:00", "ticket_quantity": 2 },
      { "registration_id": 17, "user_name": "…", "registration_date": "2026-10-02 16:40:00", "ticket_quantity": 1 }
    ]
  }
}
```

`registrations` is ordered by `registration_date DESC`, so the most recent
booking is always the first row — this is an explicit Assessment 3 requirement.

Returns `404` when the id does not exist.

### `POST /api/events`

```json
{
  "event_name": "Riverside Clean-Up",
  "category_id": 3,
  "organisation_id": 1,
  "event_description": "A morning of riverside litter collection.",
  "event_date": "2027-03-14 09:00:00",
  "location": "New Farm Park, Brisbane QLD",
  "latitude": -27.4712,
  "longitude": 153.0491,
  "ticket_price": 0,
  "capacity": 120,
  "target_amount": 5000,
  "event_image_url": "img/springball.jpg"
}
```

Responses: `201` on success, `400` with per-field `errors`, `409` if an event
with the same name and date already exists.

### `PUT /api/events/:event_id`

Same body as `POST`. Extra rule: `capacity` may not be reduced below the number
of tickets already sold — that returns `400` rather than silently overselling.

### `DELETE /api/events/:event_id`

* `200` — deleted.
* `404` — no such event.
* `409` — the event has registrations. The body carries
  `data.registration_count` so the UI can explain why.
  *No event with real bookings is ever silently destroyed.*

---

## Registrations

### `POST /api/registrations`

```json
{
  "event_id": 1,
  "user_name": "Alex Chen",
  "user_email": "alex.chen@example.com",
  "user_phone": "0412 345 678",
  "ticket_quantity": 2,
  "notes": "Wheelchair access please"
}
```

Server-side rules, in order:

1. All fields validated (`400` with a per-field map if anything is wrong).
2. The event must exist (`404`) and must not be suspended (`409`).
3. The event must not already have finished (`400`).
4. The email must not already be registered for this event (`409`).
5. `ticket_quantity` may not exceed `seats_remaining` (`409`).

`total_amount` is calculated on the server as
`ticket_quantity × events.ticket_price`. A value sent by the browser is ignored,
so a visitor cannot edit the price in dev-tools.

Successful response is `201` with the created registration, including the
generated `registration_id` and `registration_date`.

### `GET /api/registrations`

Administrator list — every registration joined with its event name, date and
location, ordered by `registration_date DESC`.

### `GET /api/events/:event_id/registrations`

Registrations for one event only, newest first. `404` if the event is unknown.

### `DELETE /api/registrations/:registration_id`

Cancels a booking and frees the seat. `404` if the id is unknown.

---

## Supporting endpoints

### `GET /api/categories`

```json
{
  "success": true,
  "data": [
    { "category_id": 1, "category_name": "Sports & Fitness",
      "description": "Runs, walks and rides that get the community moving.",
      "event_count": 5 }
  ]
}
```

`event_count` is aggregated with a `LEFT JOIN … GROUP BY`, so categories with no
events still appear with `0`.

### `GET /api/organisations`

Every charity, with a count of the events it is running.

### `GET /api/stats`

```json
{
  "success": true,
  "data": {
    "total_events": 12,
    "total_registrations": 18,
    "total_tickets": 34,
    "total_raised": 134250,
    "average_tickets_per_registration": 1.89,
    "registrations_last_7_days": 4,
    "per_category": [ { "category_name": "Sports & Fitness", "event_count": 5, "tickets_sold": 52 } ]
  }
}
```

---

## Error format

A `400` always names the offending fields:

```json
{
  "success": false,
  "message": "Please correct the highlighted fields",
  "errors": {
    "user_email": "Enter a valid email address, for example name@example.com",
    "ticket_quantity": "Tickets must be a whole number between 1 and 10"
  }
}
```

A `409` explains the business rule that was hit:

```json
{
  "success": false,
  "message": "This event already has 3 registrations. Cancel them before deleting the event.",
  "data": { "registration_count": 3 }
}
```

---

## Security notes

* **SQL injection** — every statement uses `?` placeholders through
  `mysql2.execute()`; user input is never concatenated into SQL.
* **Secrets** — credentials live in `.env`, which is git-ignored. Only
  `.env.example` is committed.
* **Trust boundary** — the client is treated as untrusted. Prices, totals,
  capacity and status are all recomputed on the server.
* **CORS** — `CLIENT_ORIGIN` restricts which origins may call the API.
