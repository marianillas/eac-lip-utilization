// lib/clickup-utilization.js
//
// Pulls time entries from ClickUp and classifies them as "core" vs "overhead"
// for two separate tracks: EAC and LIP.
//
// EAC track:
//   - excludes anything in the LIP World space entirely (LIP has its own track)
//   - core = Projects space + Business Development space
//   - overhead = every other space (Marketing, Social Media, Operations,
//     Finance and Budgeting, EAC Core Materials, Contacts, EAC)
//
// LIP track:
//   - only includes entries inside the LIP World space
//   - core = LIP - Partners folder, LIP Prospects folder,
//            LIP Event (SoNV) folder, LIP Events (NoNV) folder,
//            LIP Event (Networking) folder
//   - overhead = LIP - Admin, LIP Financials, LIP Social Media, LIP Marketing,
//     and the standalone "LIP Networking" list (not in any folder)

const CLICKUP_API = "https://api.clickup.com/api/v2";

const STAFF_EMAIL_DOMAIN = "erickaaviles.com";

const LIP_SPACE_ID = "90163342800";

const EAC_CORE_SPACE_IDS = new Set([
  "90162180301", // Projects
  "90165982599", // Business Development
]);

const LIP_CORE_FOLDER_IDS = new Set([
  "90167311476", // LIP - Partners
  "90165552383", // LIP Prospects
  "90168739580", // LIP Event (SoNV)
  "90168509808", // LIP Events (NoNV)
  "90168739563", // LIP Event (Networking)
]);

async function clickupFetch(path, params = {}) {
  const url = new URL(`${CLICKUP_API}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: { Authorization: process.env.CLICKUP_API_TOKEN },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClickUp API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getStaffMembers() {
  const teamId = process.env.CLICKUP_TEAM_ID;
  const data = await clickupFetch(`/team/${teamId}`);
  const members = data.team.members.map((m) => m.user);
  return members.filter(
    (u) => u.email && u.email.endsWith(`@${STAFF_EMAIL_DOMAIN}`)
  );
}

export async function getTimeEntries(startMs, endMs) {
  const teamId = process.env.CLICKUP_TEAM_ID;
  const staff = await getStaffMembers();
  const assigneeIds = staff.map((u) => u.id).join(",");

  const data = await clickupFetch(`/team/${teamId}/time_entries`, {
    start_date: startMs,
    end_date: endMs,
    assignee: assigneeIds,
    include_location_names: true,
  });

  return { entries: data.data || [], staff };
}

function filterToTrack(entries, track) {
  return entries.filter((e) => {
    const spaceId = String(e.task_location?.space_id || "");
    if (track === "lip") return spaceId === LIP_SPACE_ID;
    // eac track: everything NOT in LIP World
    return spaceId !== LIP_SPACE_ID;
  });
}

function isCoreEntry(entry, track) {
  const loc = entry.task_location;
  if (!loc) return false;

  if (track === "eac") {
    return EAC_CORE_SPACE_IDS.has(String(loc.space_id));
  }
  if (track === "lip") {
    return LIP_CORE_FOLDER_IDS.has(String(loc.folder_id));
  }
  return false;
}

function weekKey(dateMs) {
  const d = new Date(Number(dateMs));
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  return monday.toISOString().slice(0, 10);
}

export function summarizeUtilization({ entries, staff, track }) {
  const scoped = filterToTrack(entries, track);

  const byPerson = {};
  const byWeek = {};
  let totalCoreMs = 0;
  let totalOverheadMs = 0;

  for (const u of staff) {
    byPerson[u.id] = { id: u.id, name: u.username || u.email, coreMs: 0, overheadMs: 0 };
  }

  for (const entry of scoped) {
    const userId = entry.user?.id;
    const ms = Number(entry.duration);
    if (!userId || !ms) continue;

    if (!byPerson[userId]) {
      byPerson[userId] = { id: userId, name: entry.user.username, coreMs: 0, overheadMs: 0 };
    }

    const core = isCoreEntry(entry, track);

    if (core) {
      byPerson[userId].coreMs += ms;
      totalCoreMs += ms;
    } else {
      byPerson[userId].overheadMs += ms;
      totalOverheadMs += ms;
    }

    const wk = weekKey(entry.start);
    if (!byWeek[wk]) byWeek[wk] = { week: wk, coreMs: 0, overheadMs: 0 };
    if (core) byWeek[wk].coreMs += ms;
    else byWeek[wk].overheadMs += ms;
  }

  const totalMs = totalCoreMs + totalOverheadMs;

  const perPerson = Object.values(byPerson)
    .map((p) => {
      const total = p.coreMs + p.overheadMs;
      return {
        ...p,
        totalHours: +(total / 3600000).toFixed(1),
        corePct: total ? +((p.coreMs / total) * 100).toFixed(1) : 0,
        overheadPct: total ? +((p.overheadMs / total) * 100).toFixed(1) : 0,
      };
    })
    .filter((p) => p.totalHours > 0)
    .sort((a, b) => b.totalHours - a.totalHours);

  const perWeek = Object.values(byWeek)
    .map((w) => {
      const total = w.coreMs + w.overheadMs;
      return {
        week: w.week,
        corePct: total ? +((w.coreMs / total) * 100).toFixed(1) : 0,
        overheadPct: total ? +((w.overheadMs / total) * 100).toFixed(1) : 0,
        coreHours: +(w.coreMs / 3600000).toFixed(1),
        overheadHours: +(w.overheadMs / 3600000).toFixed(1),
      };
    })
    .sort((a, b) => (a.week > b.week ? 1 : -1));

  return {
    track,
    totals: {
      coreHours: +(totalCoreMs / 3600000).toFixed(1),
      overheadHours: +(totalOverheadMs / 3600000).toFixed(1),
      corePct: totalMs ? +((totalCoreMs / totalMs) * 100).toFixed(1) : 0,
      overheadPct: totalMs ? +((totalOverheadMs / totalMs) * 100).toFixed(1) : 0,
    },
    perPerson,
    perWeek,
  };
}
