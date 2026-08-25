"use client";

import { useEffect, useState, useCallback, Fragment } from "react";

function toDateInputValue(d) {
  return d.toISOString().slice(0, 10);
}

export default function UtilizationDashboard() {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000);

  const [track, setTrack] = useState("eac");
  const [start, setStart] = useState(toDateInputValue(weekAgo));
  const [end, setEnd] = useState(toDateInputValue(today));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const togglePerson = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/utilization?track=${track}&start=${start}&end=${end}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [track, start, end]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif", color: "#1a1a1a" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Team Utilization</h1>
      <p style={{ color: "#666", marginBottom: 20 }}>Core vs. overhead, from ClickUp time tracking.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <TabButton active={track === "eac"} onClick={() => setTrack("eac")}>
          EAC
        </TabButton>
        <TabButton active={track === "lip"} onClick={() => setTrack("lip")}>
          LIP
        </TabButton>
        <TabButton active={track === "total"} onClick={() => setTrack("total")}>
          Total
        </TabButton>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "end", marginBottom: 24, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 13 }}>
          Start
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 13 }}>
          End
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "#1a1a1a",
            color: "white",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
          }}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        {lastUpdated && (
          <span style={{ fontSize: 12, color: "#999" }}>
            Updated {lastUpdated.toLocaleTimeString()} · auto-refreshes every 60s
          </span>
        )}
      </div>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {data && (
        <>
          <section style={{ display: "flex", gap: 24, marginBottom: 32 }}>
            <StatCard label="Core" pct={data.totals.corePct} hours={data.totals.coreHours} color="#2563eb" />
            <StatCard label="Overhead" pct={data.totals.overheadPct} hours={data.totals.overheadHours} color="#9ca3af" />
          </section>

          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>By Person</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eee", fontSize: 13, color: "#666" }}>
                <th style={{ padding: "6px 8px" }}>Name</th>
                <th style={{ padding: "6px 8px" }}>Total Hrs</th>
                <th style={{ padding: "6px 8px" }}>Core %</th>
                <th style={{ padding: "6px 8px" }}>Overhead %</th>
                <th style={{ padding: "6px 8px", width: 160 }}></th>
              </tr>
            </thead>
            <tbody>
              {data.perPerson.map((p) => {
                const isOpen = expandedIds.has(p.id);
                return (
                  <Fragment key={p.id}>
                    <tr
                      onClick={() => togglePerson(p.id)}
                      style={{ borderBottom: "1px solid #f4f4f4", cursor: "pointer" }}
                    >
                      <td style={{ padding: "8px" }}>
                        <span style={{ display: "inline-block", width: 14, color: "#999" }}>
                          {isOpen ? "▾" : "▸"}
                        </span>
                        {p.name}
                      </td>
                      <td style={{ padding: "8px" }}>{p.totalHours}</td>
                      <td style={{ padding: "8px" }}>{p.corePct}%</td>
                      <td style={{ padding: "8px" }}>{p.overheadPct}%</td>
                      <td style={{ padding: "8px" }}>
                        <Bar corePct={p.corePct} />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr style={{ borderBottom: "1px solid #f4f4f4" }}>
                        <td colSpan={5} style={{ padding: "4px 8px 12px 30px", background: "#fafafa" }}>
                          <PersonBreakdown breakdown={p.breakdown} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {data.perPerson.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 8, color: "#999" }}>
                    No time entries in this range for this track.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>By Week</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eee", fontSize: 13, color: "#666" }}>
                <th style={{ padding: "6px 8px" }}>Week of</th>
                <th style={{ padding: "6px 8px" }}>Core Hrs</th>
                <th style={{ padding: "6px 8px" }}>Overhead Hrs</th>
                <th style={{ padding: "6px 8px" }}>Core %</th>
              </tr>
            </thead>
            <tbody>
              {data.perWeek.map((w) => (
                <tr key={w.week} style={{ borderBottom: "1px solid #f4f4f4" }}>
                  <td style={{ padding: "8px" }}>{w.week}</td>
                  <td style={{ padding: "8px" }}>{w.coreHours}</td>
                  <td style={{ padding: "8px" }}>{w.overheadHours}</td>
                  <td style={{ padding: "8px" }}>{w.corePct}%</td>
                </tr>
              ))}
              {data.perWeek.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 8, color: "#999" }}>
                    No time entries in this range for this track.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 20px",
        borderRadius: 6,
        border: active ? "1px solid #1a1a1a" : "1px solid #ddd",
        background: active ? "#1a1a1a" : "white",
        color: active ? "white" : "#1a1a1a",
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

function StatCard({ label, pct, hours, color }) {
  return (
    <div style={{ flex: 1, border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 13, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{pct}%</div>
      <div style={{ fontSize: 13, color: "#999" }}>{hours} hrs</div>
    </div>
  );
}

function PersonBreakdown({ breakdown }) {
  if (!breakdown || breakdown.length === 0) {
    return <div style={{ fontSize: 13, color: "#999", padding: "4px 0" }}>No entries in this range.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
      {breakdown.map((space) => (
        <div key={space.space}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            <span>{space.space}</span>
            <span>{space.hours} hrs</span>
          </div>
          {space.lists.map((list) => (
            <div
              key={list.list}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#666",
                paddingLeft: 14,
              }}
            >
              <span>{list.list}</span>
              <span>{list.hours} hrs</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Bar({ corePct }) {
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "#eee" }}>
      <div style={{ width: `${corePct}%`, background: "#2563eb" }} />
    </div>
  );
}
