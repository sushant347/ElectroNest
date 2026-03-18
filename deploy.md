# ElectroNest — Deployment Steps (Only Web Tasks)

> All code is already set up and ready. Just do these steps on the websites below.

---

## STEP 1 — Push to GitHub

Open terminal in the `Debug` folder and run:

```bash
git init
git add .
git commit -m "ElectroNest initial commit"
```

Then:
1. Go to [github.com](https://github.com) → sign in → click **+** → **New repository**
2. Name: `ElectroNest` → **Private** → click **Create repository**
3. Copy the commands GitHub shows you under **"…or push an existing repository"** and run them in terminal

---

## STEP 2 — Create Free Database (Neon)

1. Go to [neon.tech](https://neon.tech) → **Sign up with GitHub**
2. Click **Create Project** → name it `electronest` → click **Create**
3. On the project page, find the **Connection string** box
4. Click **Copy** — it looks like:
   ```
   postgresql://user:password@host/dbname?sslmode=require
   ```
5. **Paste it somewhere safe** — you'll need it in Step 3

---

## STEP 3 — Deploy Backend (Render)

1. Go to [render.com](https://render.com) → **Sign up with GitHub**
2. Click **New +** → **Web Service**
3. Click **Connect** next to your `ElectroNest` GitHub repo
4. Fill in these fields exactly:

   | Field | Value |
   |-------|-------|
   | Name | `electronest-api` |
   | Root Directory | `backend` |
   | Runtime | `Python` |
   | Build Command | `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate && python manage.py seed_users && python manage.py seed_products` |
   | Start Command | `gunicorn page.wsgi --bind 0.0.0.0:$PORT` |
   | Instance Type | **Free** |

5. Scroll down to **Environment Variables** → add these one by one:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | paste your Neon connection string from Step 2 |
   | `SECRET_KEY` | type any long random text e.g. `x7k2m9qw3z8p1r5t6y4u` |
   | `DEBUG` | `False` |
   | `ALLOWED_HOSTS` | `electronest-api.onrender.com` |
   | `CORS_ORIGINS` | `https://electronest.vercel.app` |

6. Click **Create Web Service** → wait 3–5 minutes to deploy

7. Once deployed, click **Shell** tab on Render and run:
   ```
   python manage.py migrate
   python manage.py createsuperuser
   ```

8. Test: open `https://electronest-api.onrender.com/api/products/` → should show `[]` (empty JSON, no error)

---

## STEP 4 — Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → **Sign up with GitHub**
2. Click **Add New Project** → click **Import** next to `ElectroNest`
3. Set:

   | Field | Value |
   |-------|-------|
   | Framework Preset | `Vite` |
   | Root Directory | `frontend` |

4. Open **Environment Variables** section → add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_BASE_URL` | `https://electronest-api.onrender.com/api` |

5. Click **Deploy** → wait 1–2 minutes

6. Your site is live at the URL Vercel gives you (e.g. `https://electronest.vercel.app`)

---

## STEP 5 — Fix CORS (1 last thing on Render)

1. Go back to Render → your `electronest-api` service → **Environment** tab
2. Change `CORS_ORIGINS` value to your exact Vercel URL (copy from Step 4)
3. Click **Save Changes** → Render redeploys automatically

---

## STEP 6 — Reset Database & Redeploy (if migration errors occurred)

If you get migration errors (e.g. "relation does not exist", "column does not exist"), reset Neon and redeploy:

### 6a — Reset Neon database

1. Go to [neon.tech](https://neon.tech) → open your `electronest` project
2. Click **SQL Editor** tab
3. Paste and run this SQL:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO neondb_owner;
   GRANT ALL ON SCHEMA public TO public;
   ```
4. Click **Run** — this wipes all tables

### 6b — Push new code to GitHub

In your terminal (inside the `Debug` folder):
```bash
git add backend/orders/migrations/0001_initial.py backend/products/migrations/0001_initial.py backend/accounts/migrations/0001_initial.py backend/orders/migrations/ backend/products/migrations/ backend/admin_panel/migrations/ backend/requirements.txt deploy.md
git commit -m "Fix migrations: add CreateModel state entries for managed=False tables"
git push
```

### 6c — Update build command on Render

1. Go to Render → your `electronest-api` service → **Settings** tab
2. Find **Build Command** and set it to:
   ```
   pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate && python manage.py seed_users && python manage.py seed_products
   ```
3. Click **Save Changes**
4. Click **Manual Deploy** → **Deploy latest commit**
5. Watch the build logs — it should end with:
   ```
   Categories: 12 created, 0 skipped
   Suppliers: 8 created, 0 skipped
   Products: 426 created, 0 skipped
   Sequences reset.
   Done — database seeded successfully.
   ```

---

## Done

| | URL |
|--|-----|
| Your Website | `https://electronest.vercel.app` |
| API | `https://electronest-api.onrender.com/api/products/` |
| Admin Panel | `https://electronest-api.onrender.com/admin/` |

> **Note:** On Render free tier, the backend sleeps after 15 minutes of no use.
> First request after sleeping takes ~30 seconds. This is normal.
