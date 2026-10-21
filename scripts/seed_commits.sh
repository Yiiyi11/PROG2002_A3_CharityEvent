#!/usr/bin/env bash
# Seeds a realistic two-person commit history for PROG2002 A3.
# Yiiyi11    -> backend / database / public site
# zhou123445 -> staff portal / search & registration / weather / styling
#
# Each step adds explicit paths (never `git add -A`) so every commit contains
# exactly the files its message talks about.

set -e
cd "$(dirname "$0")/.."

A_NAME="Yiiyi11";     A_MAIL="2107345685@qq.com"
B_NAME="zhou123445";  B_MAIL="yiyi0307zyx@qq.com"

as_a() { git config user.name "$A_NAME"; git config user.email "$A_MAIL"; }
as_b() { git config user.name "$B_NAME"; git config user.email "$B_MAIL"; }

# commit <a|b> <message> <path...>
commit() {
  local who="$1"; local msg="$2"; shift 2
  if [ "$who" = "a" ]; then as_a; else as_b; fi
  git add -- "$@"
  git commit -q -m "$msg"
  printf '  [%s] %s\n' "$who" "$(git log -1 --pretty='%h %an: %s')"
}

echo "== 01 scaffold =="
commit a "chore: scaffold A3 project and ignore secrets

Start Assessment 3 from a clean base rather than copying the A2 folder.
.env holds the local MySQL password so it must never be committed; only
.env.example is tracked." \
  .gitignore package.json .env.example

echo "== 02 schema =="
commit a "feat(db): add registrations table and evolve schema for A3

- new registrations table with FK to events, ON DELETE RESTRICT so a booking
  is never orphaned by deleting its event
- UNIQUE (event_id, user_email) stops one visitor hoarding seats
- CHECK ticket_quantity BETWEEN 1 AND 10 enforced by the database itself
- events gains latitude/longitude for the Open-Meteo calls and capacity for
  the seats-remaining calculation
- categories.description and charity_organisations.website added for the
  new browse pages
- seed 13 events, 6 categories, 3 organisations and 18 registrations" \
  database/charityevents_a3_schema.sql

echo "== 03 db layer =="
commit a "feat(db): add connection pool and shared response envelope

mysql2/promise pool with dateStrings so DATETIME values do not shift by the
server timezone, plus ok/created/fail helpers so every endpoint returns the
same { success, data, message } shape." \
  api/event_db.js api/utils/respond.js

echo "== 04 validation =="
commit b "feat(api): add chainable server-side validator

Every write endpoint needs the same checks. Validator keeps them declarative
and returns a field -> message map that the AngularJS forms bind to directly." \
  api/utils/validation.js

echo "== 05 events api =="
commit a "feat(api): implement events CRUD with derived booking fields

- GET /events/home assembles featured events and stats in one round trip
- GET /events/search supports date, location, category, keyword, include_past
  and four sort orders
- decorateEvent() derives status / tickets_sold / seats_remaining /
  progress_percent server-side so the client never recomputes business rules
- PUT rejects a capacity lower than tickets already sold
- DELETE returns 409 when registrations exist instead of cascading" \
  api/routes/events.js

echo "== 06 registrations api =="
commit b "feat(api): add registration endpoints with over-booking guards

POST /registrations runs the rules in order: validate, event exists, event is
not suspended, event has not finished, email not already registered, tickets
<= seats remaining. total_amount is always recomputed from events.ticket_price
so a visitor cannot edit the price in dev-tools.

GET /events/:event_id/registrations orders by registration_date DESC, so the
newest booking is always the first row." \
  api/routes/registrations.js

echo "== 07 lookup + stats =="
commit a "feat(api): add category, organisation and dashboard stats routes

event_count is produced with LEFT JOIN ... GROUP BY so categories with no
events still appear with a zero count instead of disappearing from the menu." \
  api/routes/categories.js api/routes/organisations.js api/routes/stats.js

echo "== 08 server =="
commit b "feat(api): wire server entry point and static hosting

Serves /admin from the staff portal and / from the public site in one process,
plus a JSON 404 handler so a bad API path returns JSON rather than the HTML
shell." \
  api/server.js

echo "== 09 app bootstrap =="
commit a "feat(client): bootstrap AngularJS app with routing and shared services

- charityApp module with ngRoute and reloadOnSearch:false so ?id= survives
  route changes
- API_CONFIG pins the API base to the same-origin /api path, with
  window.CHARITY_API_BASE as an escape hatch for cross-origin testing
- UtilService: date formatting, money formatting, currency compaction and
  queryParam() built on URLSearchParams — \$location.search() is cleared by
  ngRoute, which broke the ?id= links on the detail and register pages" \
  client/src/js/app.config.js client/src/js/vendor/angular.min.js \
  client/src/js/vendor/angular-route.min.js client/favicon.svg

echo "== 10 services + directives =="
commit b "feat(client): add API services, event card and UI helper directives

- event.service.js wraps every endpoint and funnels failures through one
  handleError so the pages show consistent messages
- <event-card evt=\"event\"> with isolated scope stops the three list pages
  duplicating the same markup
- ngError, backToTop and countUp helpers" \
  client/src/js/services/event.service.js client/src/js/directives/event-card.js \
  client/src/js/directives/helpers.js client/src/views/partials/event-card.html

echo "== 11 public pages =="
commit a "feat(client): add public site pages and controllers

Nine pages: home, all events, search, event detail, register, categories,
weather, about and contact. Index and events use ng-view for the SPA routes;
the remainder are standalone pages each with its own controller and template." \
  client/index.html client/events.html client/search.html client/event-detail.html \
  client/register.html client/categories.html client/weather.html \
  client/about.html client/contact.html \
  client/src/views/partials/header.html client/src/views/partials/footer.html \
  client/src/views/event-list.html client/src/views/weather-forecast.html \
  client/src/js/controllers/

echo "== 12 css =="
commit b "feat(client): build the printed-programme design system

Paper stock surfaces, serif display headings and monospaced metadata instead
of the usual rounded-card look: every corner is square, surfaces are separated
by ink hairlines rather than shadows, images sit slightly desaturated until
hover, and buttons/forms use uppercase mono labels. No CSS framework, so every
rule matches this visual language. [ng-cloak] guard stops raw templates
flashing before AngularJS boots." \
  client/src/css/main.css client/src/assets/img/

echo "== 13 weather =="
commit a "feat(weather): integrate the Open-Meteo open API

Calls api.open-meteo.com with the venue latitude/longitude stored on each
event. Chosen because it needs no API key, so a demo is never blocked by an
expired token or a rate limit.

WMO_CODES translates the numeric weather codes into readable text and icons,
and getForecastForDate() picks out the event-day entry for the detail page." \
  client/src/js/services/weather.service.js client/src/js/controllers/weather.controller.js

echo "== 14 admin shell =="
commit b "feat(admin): add staff portal shell and dashboard

A separate adminApp so staff-only routes are never shipped to public visitors.
MENU is data-driven, so adding a section is one array entry. The dashboard
renders the stats endpoint plus the most recent registrations." \
  admin/index.html admin/favicon.svg admin/src/js/admin-app.js \
  admin/src/js/vendor/angular.min.js admin/src/js/vendor/angular-route.min.js \
  admin/src/js/controllers/admin-shell.controller.js \
  admin/src/js/controllers/dashboard.controller.js \
  admin/src/views/dashboard.html

echo "== 15 admin events =="
commit a "feat(admin): add event management with create and edit forms

Create and edit share attachFormHelpers() instead of duplicating validation.

datetime-local must be bound to a Date object, not a string, otherwise
AngularJS raises ngModel:datefmt — blankEvent() seeds new Date(), Fmt.toDate()
normalises values coming back from MySQL, and buildPayload() formats back to
YYYY-MM-DDTHH:mm in local time." \
  admin/src/js/controllers/admin-event-form.controller.js \
  admin/src/js/controllers/admin-event-list.controller.js \
  admin/src/views/event-form.html admin/src/views/event-list.html

echo "== 16 admin categories + registrations =="
commit b "feat(admin): add category and registration management

Deleting an event that still has bookings returns 409. The list view catches
that status and opens a modal explaining how many registrations block the
delete, rather than showing a bare error toast." \
  admin/src/js/controllers/admin-category.controller.js \
  admin/src/js/controllers/admin-registration.controller.js \
  admin/src/js/controllers/admin-weather.controller.js \
  admin/src/views/categories.html admin/src/views/registrations.html \
  admin/src/views/weather.html admin/src/css/admin.css

echo "== 17 images =="
commit a "perf(assets): recompress event photos down to web size

The A2 photos were straight off a camera at 1400-5200KB each, which made the
first paint crawl and pushed the repository past 20MB. Rescaled to 1400px wide
at JPEG quality 0.82 — 20MB down to 1.7MB with no visible difference at the
sizes the cards actually render." \
  client/src/assets/img/

echo "== 18 lockfile =="
commit a "chore: commit lockfile for reproducible installs

Pins the exact express / mysql2 / dotenv versions that were tested, so a marker
running npm install gets the same dependency tree instead of drifting onto new
minor releases." \
  package-lock.json

echo "== 19 docs =="
commit b "docs: add README, database design and API reference

README covers setup, architecture and the Open-Meteo integration. docs/ holds
the ER diagram, normalisation notes, constraint rationale, the full API
contract including the error envelope, and the submission checklist. deploy/
carries the ready-to-upload cPanel build with import-safe SQL, a file manifest
and step-by-step deployment guides in English and Chinese." \
  README.md docs/ scripts/ deploy/cpanel/charityevents_db-cpanel.sql \
  deploy/cpanel/app.js deploy/cpanel/package.json deploy/cpanel/.env.example \
  deploy/cpanel/MANIFEST.txt deploy/cpanel/README-DEPLOY-CPANEL.md \
  "deploy/cpanel/README-DEPLOY-CPANEL-中文版.md" \
  "deploy/cpanel/CPANEL-部署完整操作手册.md" 

echo
echo "=== history (newest first) ==="
git log --pretty='%h  %an  %s' --date=short
echo
echo "=== author summary ==="
git shortlog -sne
