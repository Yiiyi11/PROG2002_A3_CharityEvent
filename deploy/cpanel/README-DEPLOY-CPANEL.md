# Deploying the Charity Events A3 project on cPanel

_Last updated: 2026-10-20 · Team: Yiiyi11 & zhou123445_

This folder is a **ready-to-upload cPanel build**. Nothing needs to be compiled
and there is no build step — the AngularJS sites are plain files served by the
Node process.

```
cpanel-build/
├── app.js                          Passenger entry point (exports the Express app)
├── package.json                    production dependencies only
├── .env.example                    -> rename to .env and fill in the database details
├── charityevents_db-cpanel.sql     phpMyAdmin import file (schema + seed data)
├── api/                            Express RESTful API
├── client/                         public website  (served at  / )
├── admin/                          staff portal    (served at  /admin/ )
└── README-DEPLOY-CPANEL.md         this file
```

---

## 0. What you need before starting

| Requirement | Where to find it |
| --- | --- |
| cPanel login | From your unit / SCU account |
| **Setup Node.js App** icon | cPanel → Software section |
| **MySQL Databases** icon | cPanel → Databases section |
| **phpMyAdmin** icon | cPanel → Databases section |
| Your cPanel account name | Shown top-left of cPanel, e.g. `scu1234567` |

Throughout this guide the account name is written as `cpuser` — **replace every
occurrence with your own account name.**

---

## 1. Upload the code

1. cPanel → **File Manager**.
2. Decide where the app lives. Recommended: create a folder **outside**
   `public_html`, for example:

   ```
   /home/cpuser/charityapp
   ```

   Keeping it outside `public_html` means the source code, `.env` file and
   database password are not downloadable via a browser URL.
3. Upload `Yiiyi11A3-cpanel.zip` into that folder and use **Extract**.
4. Check that `app.js` sits directly inside `charityapp/`, not one level deeper
   (some zip tools create an extra folder — if so, move the files up).

---

## 2. Create the database and import the data

cPanel does **not** let you create databases from SQL, which is why
`charityevents_db-cpanel.sql` deliberately contains no `CREATE DATABASE`
statement.

1. cPanel → **MySQL Databases** → *Create New Database*
   - Database name: `charity` → cPanel stores it as **`cpuser_charity`**
   - Write the full name down, you need it for `.env`.
2. Same page → *Add New User*
   - Username: `charityadm` → stored as **`cpuser_charityadm`**
   - Password: use **Password Generator**, copy it somewhere safe.
3. Same page → *Add User To Database* → select the user and the database →
   **Add** → tick **ALL PRIVILEGES** → *Make Changes*.
4. cPanel → **phpMyAdmin**
   → click the database **`cpuser_charity`** in the left sidebar
   → **Import** tab → **Choose File** → `charityevents_db-cpanel.sql`
   → scroll down → **Go**.
5. You should see
   *"Import has been successfully finished, 32 queries executed."*
   The left sidebar now lists four tables:
   `categories`, `charity_organisations`, `events`, `registrations`.

**Expected row counts**

| Table | Rows |
| --- | --- |
| `categories` | 6 |
| `charity_organisations` | 3 |
| `events` | 13 |
| `registrations` | 18 |

> If phpMyAdmin complains **#1273 Unknown collation**, the server is an older
> MariaDB: open the .sql file, find/replace `utf8mb4_unicode_ci` with
> `utf8mb4_general_ci`, save, and import again.
>
> If it complains **#1044 Access denied**, you imported without selecting the
> database first — click the database name in the left sidebar, then use the
> Import tab.

---

## 3. Create the .env file

1. In File Manager, enable **Settings → Show Hidden Files**.
2. Rename `.env.example` to **`.env`**.
3. Right-click `.env` → **Edit**, and fill in the four database values:

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=cpuser_charityadm
DB_PASSWORD=the-password-from-step-2.3
DB_NAME=cpuser_charity

PORT=3000
CLIENT_ORIGIN=*
```

> `DB_HOST` stays `localhost` on cPanel — the database is on the same server.

---

## 4. Create the Node.js application

1. cPanel → **Setup Node.js App** → **Create Application**.
2. Fill in:

| Field | Value |
| --- | --- |
| Node.js version | **18.x** (or the newest 18/20 offered) |
| Application mode | **Production** |
| Application root | `charityapp` |
| Application URL | your domain, path left **empty** (uses `/`) |
| Application startup file | **`app.js`** |

3. Click **Create**.
4. The new app appears in the list. Click **Run NPM Install** and wait for
   *"npm install completed"*. This installs `express`, `mysql2`, `cors` and
   `dotenv` into the app's virtual environment.
5. Click **Restart** (the app must restart to pick up `.env`).

> `Application startup file` must be `app.js`, **not** `api/server.js`.
> Passenger always loads the startup file and expects it to export the Express
> app; `app.js` does exactly that.

---

## 5. Check the deployment

Open these URLs (replace the domain with yours):

| URL | Expected result |
| --- | --- |
| `https://yourdomain.com/api/health` | JSON: `{"success":true,"data":{"status":"up",...}}` |
| `https://yourdomain.com/api/events/home` | JSON with 12 featured events |
| `https://yourdomain.com/` | Public website homepage, 13 event cards |
| `https://yourdomain.com/admin/` | Staff portal dashboard |
| `https://yourdomain.com/weather.html` | 7-day Open-Meteo forecast |

If `/api/health` returns JSON but the pages are blank, see the troubleshooting
table below — the usual cause is a stale `charityApiBase` value cached in the
browser from local testing.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| **503 Service Unavailable** | Passenger could not start Node | cPanel → Setup Node.js App → check the error log link; usually a missing `npm install` or a syntax error |
| **502 / blank page, no CSS** | Wrong application root | `app.js`, `api/`, `client/`, `admin/` must all be at the same level |
| Page loads but **no events shown**, console shows `localhost:3000` | Browser cached the old API base URL | DevTools → Application → Local Storage → delete key `charityApiBase`, hard-reload (Ctrl+F5) |
| **`ER_ACCESS_DENIED_ERROR`** in the log | Wrong DB user/password | Re-check `.env`; the user must be added to the *specific* database |
| **`ER_BAD_DB_ERROR`** | `DB_NAME` missing the `cpuser_` prefix | Copy the exact name from MySQL Databases |
| **`ER_NO_SUCH_TABLE`** | SQL not imported into the right database | Import again with the database selected in phpMyAdmin |
| Event images return **404** | `client/src/assets/img/` not uploaded | Re-upload the `client` folder, keeping subfolders |
| **`Cannot find module 'express'`** | npm install never ran | Click **Run NPM Install**, then **Restart** |
| Weather page empty | Server cannot reach the internet, or Open-Meteo blocked | Check `https://api.open-meteo.com/v1/forecast?latitude=-27.47&longitude=153.02&daily=weather_code` in a browser |
| **`Can't acquire lock for app: xxx`** | A stale `.lock` file is left in the virtualenv | See section 6.1 below |

**Reading the log:** cPanel → Setup Node.js App → your app → the
`stderr.log` link. Every API request is also logged as
`[api] GET /api/events/home -> 200 (12ms)`, which makes it easy to prove the
API is being reached.

---

## 6.1 Error `Can't acquire lock for app`

### Why it happens

The Node.js Selector (CloudLinux / Passenger) creates a `.lock` file inside the
application's virtualenv before every start / stop / restart / npm install, so
two operations cannot touch the app at once. It is removed when the operation
**finishes**.

`app.js` is a long-running server. If you launch it with **"Run JS script"** or
**"Run NPM Script → start"**, cPanel waits for the command to exit — but
`node app.js` never exits, it just keeps listening. The spinner never stops, the
lock is never released, and every later button reports *Can't acquire lock*.

So the error is not a code fault: it is the wrong button plus a leftover lock.

### Fix in three steps (no SSH needed)

1. **Delete the stale lock**
   - cPanel → **File Manager** → **Settings** → enable **Show Hidden Files**
   - Open `nodevenv` in `/home/youruser/`, then your app folder, e.g.
     `/home/cpuser/nodevenv/charityevent/.lock`
   - Right-click `.lock` → **Delete**. This removes a temporary marker only —
     your code and virtualenv are untouched.
2. **Restart the right way**
   - cPanel → **Setup Node.js App** → **Stop App**, then **Start App**
     (or just **Restart**).
3. **Use only these buttons from now on**

   | Goal | Use | Never use |
   | --- | --- | --- |
   | Apply code changes | **Restart** | Run JS script |
   | After adding dependencies | **Run NPM Install** then **Restart** | Run NPM Script → start |
   | Stop temporarily | **Stop App** | — |

### If the error returns immediately

A hung process is still alive and recreating the lock:

1. Check whether the site still loads. If it does, only the management UI is
   stuck — close and reopen the cPanel tab; the website is unaffected.
2. Otherwise use cPanel **Terminal** / SSH:

   ```bash
   lsof -u $USER | grep lock     # find the PID holding the lock
   kill -15 <pid>
   rm -f ~/nodevenv/charityevent/.lock
   ```

3. If that is not possible, open a ticket with the host including the app name,
   domain and exact error text — clearing Passenger locks is a server-side task.

### Variant: the message reads `Can't acquire lock for app: %(app)s`

`%(app)s` is cPanel's **unsubstituted** error-template placeholder — a display bug
in the selector, not a different problem. It simply means the app name could not
be resolved, which happens when the failing action is at the app-list / global
level rather than inside one application.

In that case the lock is often not inside the app subfolder, so search the whole
virtualenv tree:

```bash
find ~/nodevenv -name ".lock" -print      # list them first
find ~/nodevenv -name ".lock" -delete     # then remove
rm -f ~/nodevenv/.lock ~/.nodevenv.lock 2>/dev/null
```

Then **Stop App** → **Start App**.

> If `find` returns nothing, the lock is held by a **live process** (filesystem
> lock), not a leftover file — go to the `lsof` + `kill` step instead. Without SSH
> or Terminal, send the host this line: *"Please clear the Node.js Selector lock —
> I get 'Can't acquire lock for app: %(app)s'."*
>
> If it cannot be cleared, it does not block your submission: as long as the site
> still loads, Passenger is serving it normally and only the cPanel buttons are
> broken.

---

## 7. Updating the deployed site

1. Edit files locally, commit and push to GitHub as usual.
2. Upload only the changed folder (`client/`, `admin/` or `api/`) over the old
   one in File Manager (**Overwrite** when asked).
3. cPanel → Setup Node.js App → **Restart**.

The database is untouched by a code update, so no data is lost.

---

## 8. Notes for the marker

* Node process serves **both** websites and the API from one origin, so there
  is no CORS problem in production.
* `charityevents_db-cpanel.sql` is the *only* database file needed: it creates
  the 4 tables, all foreign keys, the UNIQUE/CHECK constraints, and inserts the
  seed data.
* The API is genuinely RESTful (`GET/POST/PUT/DELETE` on `/api/events` and
  `/api/registrations`) and returns proper status codes: `201` on create,
  `400` on validation failure, `404` on missing resource, `409` on business-rule
  conflicts (duplicate email, event full, event still has registrations).
