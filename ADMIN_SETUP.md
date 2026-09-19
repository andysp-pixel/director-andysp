# Director Andy SP — Admin setup

The code is ready for Cloudflare Workers, D1, R2 and Access.

## 1. Install and create database tables

```bash
npm install
npx wrangler login
npm run db:init
```

The Worker also runs safe migrations automatically when it starts.

## 2. Configure Cloudflare Access values

Add these Worker variables in **Workers & Pages → director-andysp → Settings → Variables and Secrets**:

- `CF_ACCESS_TEAM_DOMAIN`: your Zero Trust team domain, for example `your-team.cloudflareaccess.com`
- `CF_ACCESS_AUD`: the Application Audience (AUD) tag shown in the Access application
- `ADMIN_EMAIL`: the one Gmail address allowed to administer the website

Do not commit secret tokens or passwords to GitHub.

Configure the Access application to protect only:

```text
/admin/*
```

The public website and `/api/projects` must remain public.

## 3. Deploy

```bash
npm run deploy
```

Open `/admin/` after deployment. Uploads are saved in the `director-andy-media` R2 bucket and project records/analytics are saved in `director-andy-db`.

## Analytics used by the dashboard

- `POST /api/visit`: records a first-party page visit using a random secure visitor cookie.
- `POST /api/projects/:id/view`: increments a published project's views.
- `GET /admin/api/analytics?period=30d`: returns visitors, page views and project media views; it is protected by Cloudflare Access.

The dashboard accepts one to five files per submission. Each file becomes its own project and can be published, unpublished or permanently deleted.
# Director Andy SP — deployment checklist

The project now includes portfolio uploads, website analytics, offer bookings,
PDF confirmations, booking email notifications and editable Services/Offers.

## Required Cloudflare bindings

- D1 binding: `DB`
- R2 binding: `MEDIA`
- Static assets binding: `ASSETS`
- Send Email binding: `BOOKING_EMAIL`, restricted to `damoryandy@gmail.com`

Enable Cloudflare Email Routing for `directorandysp.com` and verify the destination
`damoryandy@gmail.com`. The booking sender used by the Worker is
`bookings@directorandysp.com`.

## Deploy

```bash
npm install
npx wrangler login
npm run db:init
npm run deploy
```

Protect `admin.directorandysp.com` with Cloudflare Access and allow only the
administrator Gmail address. Set these Worker variables in Cloudflare:

- `CF_ACCESS_TEAM_DOMAIN`
- `CF_ACCESS_AUD`
- `ADMIN_EMAIL`

The public website must remain accessible without Access. Only the admin
subdomain should be protected.
