# EAC / LIP Utilization Dashboard (standalone)

This is a complete, separate mini-app. It will get its own link, like
`eac-lip-utilization.vercel.app`, totally separate from your kanban board.

## What's in this folder
- `app/page.jsx` — the dashboard itself (EAC/LIP tabs, date range, tables)
- `app/api/utilization/route.js` — fetches and calculates the data
- `lib/clickup-utilization.js` — the core vs. overhead rules
- `app/layout.js`, `package.json`, `next.config.js` — required scaffolding, you don't need to touch these

## Step 1 — Create a new GitHub repository
1. Go to github.com and log in (same account as your kanban board, if you have one)
2. Click the **+** in the top right → **New repository**
3. Name it something like `eac-lip-utilization`
4. Keep it **Private**
5. Click **Create repository**

## Step 2 — Upload these files to that repository
The simplest way, no command line needed:
1. On your new repo's page, click **uploading an existing file**
2. Drag this entire folder's contents into the browser window (keep the folder structure — GitHub will preserve `app/`, `lib/`, etc.)
3. Scroll down, click **Commit changes**

## Step 3 — Import the repo into Vercel
1. Go to vercel.com and log in
2. Click **Add New** → **Project**
3. Find and select the `eac-lip-utilization` repo you just made
4. Before clicking Deploy, open **Environment Variables** and add:
   - `CLICKUP_API_TOKEN` — your ClickUp API token (ClickUp → avatar → Settings → Apps → API Token)
   - `CLICKUP_TEAM_ID` — `9016596870`
5. Click **Deploy**

## Step 4 — Visit your dashboard
After a minute or two, Vercel will show "Ready" and give you a link like
`eac-lip-utilization.vercel.app`. That's your dashboard — share that link with
your team.

## Changing the core/overhead rules later
Open `lib/clickup-utilization.js` — the rules are the constants near the top
(`EAC_CORE_SPACE_IDS`, `LIP_CORE_FOLDER_IDS`). Edit, commit, push — Vercel
redeploys automatically.
