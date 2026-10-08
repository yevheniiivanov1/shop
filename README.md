# Online Shop: Rails API + React

A small online shop built as a test assignment: sign-up and sign-in, a searchable catalog, a cart, (simulated) payment, order history and an admin area.

- **Backend:** Ruby 3.4, Rails 8.1 (API-only), PostgreSQL, Devise 5
- **Frontend:** React 19 + TypeScript, Vite, React Router (a standalone SPA, no Rails views)
- **Infrastructure:** Docker Compose for development, a single production Dockerfile, a Render blueprint

**Demo accounts** (the password for both is `password`):

| Role | Email |
|---|---|
| Admin | `admin@example.com` |
| Customer | `user@example.com` |

## Quick start

Only Docker is required.

```bash
docker compose up
```

Then open http://localhost:5173. The first start takes a while: it installs gems and npm packages, creates the database and loads demo data (30 items, two users, a couple of orders).

To check the production build locally (the same image that runs on the hosting, with Rails serving the React app itself):

```bash
docker compose --profile prod up --build app
```

Then open http://localhost:8080.

### Development (5173) vs production build (8080)

| | http://localhost:5173 | http://localhost:8080 |
|---|---|---|
| What runs | Vite dev server + Rails in `development` (two containers) | One container built from the `Dockerfile`, Rails in `production` |
| React | Served by Vite: unminified, hot reload, `/api` proxied to Rails on port 3000 | Pre-built and minified, served by Rails from the same port as the API |
| Code changes | Picked up immediately | Require `--build` |
| Database | `shop_development` | `shop_production` (separate data) |
| Use it for | Day-to-day development | Checking what will be deployed |

## How the assignment maps to the code

### Tables

| Assignment | Table | Columns |
|---|---|---|
| Users | `users` | `first_name`, `last_name`, `email`, `encrypted_password` (Devise stores a bcrypt hash), `role` (`user` / `admin`) |
| Items | `items` | `name`, `description`, `price` |
| Orders | `orders` | `user_id` → `users`, `amount` |
| Orders_description | `order_descriptions` | `order_id` → `orders`, `item_id` → `items`, `quantity`, `price`* |

\* `price` on an order line is the unit price at the moment of purchase. Without it, changing a price in the catalog would retroactively change orders that were already paid. All other columns are exactly as in the assignment.

Data integrity is also enforced by the database: foreign keys, `NOT NULL`, check constraints (`role IN ('user','admin')`, `price >= 0`, `quantity > 0`) and a unique index on `(order_id, item_id)`. Schema: [`backend/db/schema.rb`](backend/db/schema.rb).

### Steps

1. **Sign-up and sign-in** use the Devise gem. The session lives in an encrypted HttpOnly cookie, and state-changing requests are protected with a CSRF token.
2. **Picking items:** the catalog supports search by name and description (`ILIKE` backed by PostgreSQL trigram indexes), sorting and pagination. Each item has a quantity picker; the cart is kept in the browser.
3. **"Payment":** `POST /api/orders` creates a row in `orders` and one row in `order_descriptions` per item, in a single transaction ([`Checkout`](backend/app/services/checkout.rb)). The amount is calculated on the server from database prices; prices sent by the client are ignored.
4. **Orders belong to users** via `orders.user_id`, a foreign key to `users`.
5. **Roles**
   - **admin** can view and edit the `users` table (including roles and passwords) and the `items` table (create, edit, delete).
   - **user** can edit only their own personal details: first name, last name, email and password. Changing the email or password requires the current password.
6. **My orders** lists the signed-in user's orders. Expanding an order loads its lines.

## API

All responses are JSON. Errors look like `{ "error": "...", "errors": ["..."] }`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/sign_up` | everyone | sign up (always with the `user` role) |
| POST | `/api/auth/sign_in` | everyone | sign in |
| DELETE | `/api/auth/sign_out` | signed in | sign out |
| GET | `/api/me` | everyone | current user or `null` |
| PATCH | `/api/profile` | signed in | update own details |
| GET | `/api/items?q=&sort=&page=&per_page=` | everyone | catalog: search, sorting, pagination |
| GET | `/api/items/:id` | everyone | single item |
| GET | `/api/orders` | signed in | own orders |
| GET | `/api/orders/:id` | signed in | own order with its lines |
| POST | `/api/orders` | signed in | pay for the cart: `{ items: [{ item_id, quantity }] }` |
| GET/POST/PATCH/DELETE | `/api/admin/users[/:id]` | admin | users table |
| POST/PATCH/DELETE | `/api/admin/items[/:id]` | admin | items table |

## Design decisions

- **Single origin.** In production Rails serves the built React app: assets are cached for a year, `index.html` is never cached. In development Vite proxies `/api` to Rails. Either way the browser talks to one origin, so a plain Devise cookie session works with no CORS setup and no JWT in `localStorage`.
- **CSRF** uses the cookie-to-header pattern: Rails puts the token into the `CSRF-TOKEN` cookie and the client sends it back in `X-CSRF-Token`.
- **Guard rails:**
  - the role can't be set on sign-up or from the profile;
  - an admin can't remove their own admin rights or delete themselves;
  - items that were already ordered and users who have orders can't be deleted (`restrict_with_error`).
- **Money** is stored as `decimal` and sent as a string (`"1299.00"`), never as a float.

## Tests and checks

```bash
docker compose exec backend bin/rails test        # models, checkout service, API (43 tests)
docker compose exec backend bin/rubocop           # style
docker compose exec backend bin/brakeman          # static security analysis
cd frontend && npm run lint && npm run build      # oxlint + TypeScript type check + build
```

The same checks run on GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Deploying to Render (free plan)

1. Push the repository to GitHub.
2. On [render.com](https://render.com) choose **New → Blueprint** and pick the repository. [`render.yaml`](render.yaml) creates a PostgreSQL database and a web service built from the root `Dockerfile`.
3. On every start the container runs migrations and loads the demo data (it is never duplicated).

Check the current free-plan limits before deploying: free web services sleep when idle (the first request afterwards is slow), and free databases have a limited lifetime. The database can live elsewhere (for example, Neon); just set its URL in the `DATABASE_URL` environment variable.

## Project layout

```
backend/                    Rails API
  app/controllers/api/      catalog, orders, profile, admin
  app/controllers/users/    Devise sign-in/sign-out and sign-up as JSON
  app/services/checkout.rb  placing an order
  app/serializers/          JSON representations of the models
  db/migrate/, db/seeds.rb
  test/                     minitest: models, service, API integration tests
frontend/                   React SPA
  src/api/                  fetch client (cookie session + CSRF), types, endpoints
  src/auth/, src/cart/      auth and cart contexts
  src/pages/                pages, including admin/
Dockerfile                  production image: React build + Rails
docker-compose.yml          development: db + backend + frontend
render.yaml                 Render blueprint
```

## Running without Docker

Requires Ruby 3.4, PostgreSQL and Node 24 (on Windows, WSL is the easiest way).

```bash
cd backend
bundle install
DB_HOST=localhost DB_USERNAME=postgres DB_PASSWORD=postgres bin/rails db:prepare db:seed server
```

```bash
cd frontend
npm install
npm run dev
```
