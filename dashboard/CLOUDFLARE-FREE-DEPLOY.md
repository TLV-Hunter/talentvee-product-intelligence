# Cloudflare Free Deployment

TalentVee uses the following free-tier architecture:

- Cloudflare Worker for the dashboard and `/api/sync`
- Cloudflare D1 for metadata, watchlists, and chunked product backups
- Cloudflare Access with email OTP for authentication
- GitHub as the source of truth and automatic deployment trigger

R2 is intentionally not used. Product payloads are versioned and split across
`cloud_sync_chunk` rows so each row remains below D1's 2 MB row limit. A new
revision is written before the metadata pointer changes; the prior revision is
deleted only after the new revision becomes active.

## Build settings

- Root directory: `dashboard`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Production branch: `main`

## First deployment

1. Create a D1 database named `talentvee-product-intelligence`.
2. Replace the placeholder `database_id` in `wrangler.jsonc` with the D1 ID.
3. Apply migrations with `npm run db:migrate:remote`.
4. Connect the GitHub repository to Cloudflare Workers Builds.
5. Protect the resulting `workers.dev` hostname with Cloudflare Access.
6. Enable One-time PIN and allow only approved email addresses.

Never commit Cloudflare API tokens, Access JWTs, cookies, OTP values, or user
backup JSON files.
