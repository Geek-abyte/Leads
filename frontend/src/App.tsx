import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import KanbanBoard from "./KanbanBoard";
import SignIn from "./SignIn";

type Lead = {
  _id: Id<"leads">;
  name: string;
  contact: string;
  email: string;
  website: string;
  source: string;
  angle: string;
  notes: string;
  stage: string;
  heat: string;
  heatPinned: boolean;
  touches: number;
  lastTouch?: string;
  nextFollowUp: string;
  contactedDate?: string;
};

type Settings = {
  quota: number;
  cadence: number[];
  coldDays: number;
  stages: string[];
};

const todayStr = () => new Date().toISOString().slice(0, 10);

function startOfWeek(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) /
      86400000,
  );
}

function computeHeat(lead: Lead, settings: Settings): string {
  if (lead.heatPinned) return lead.heat;
  if (["Won", "Booked", "Proposal sent"].includes(lead.stage)) return "hot";
  if (lead.stage === "Lost") return "cold";
  if (lead.stage === "Responded") return "hot";
  if (lead.lastTouch) {
    const d = daysBetween(lead.lastTouch, todayStr());
    if (d >= settings.coldDays) return "cold";
  }
  return "warm";
}

const emptyForm = {
  name: "",
  contact: "",
  email: "",
  website: "",
  source: "",
  angle: "",
  notes: "",
  stage: "",
  heat: "warm",
};

const LS_ONBOARDED = "ldg_onboarded";

export default function App() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) return <div className="empty">Loading…</div>;
  if (!isAuthenticated) return <SignIn />;

  return <Workspace />;
}

function Workspace() {
  const { signOut } = useAuthActions();
  const leads = useQuery(api.leads.list) ?? [];
  const settings = useQuery(api.settings.get);

  const addLead = useMutation(api.leads.add);
  const updateLead = useMutation(api.leads.update);
  const removeLead = useMutation(api.leads.remove);
  const logTouch = useMutation(api.leads.logTouch);
  const setStage = useMutation(api.leads.setStage);
  const setHeat = useMutation(api.leads.setHeat);
  const setNextFollowUp = useMutation(api.leads.setNextFollowUp);
  const saveSettings = useMutation(api.settings.save);
  const resetAll = useMutation(api.settings.resetAll);

  const [filterStage, setFilterStage] = useState("");
  const [filterHeat, setFilterHeat] = useState("");
  const [dueFilter, setDueFilter] = useState<"" | "due" | "overdue">("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"board" | "table">("board");

  const [leadOpen, setLeadOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"leads"> | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sQuota, setSQuota] = useState("20");
  const [sCadence, setSCadence] = useState("0, 3, 7, 14");
  const [sColdDays, setSColdDays] = useState("10");
  const [sStages, setSStages] = useState("");

  const [showWelcome, setShowWelcome] = useState(
    () => !localStorage.getItem(LS_ONBOARDED),
  );
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const notify = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLeadOpen(false);
        setSettingsOpen(false);
        setShowHelp(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!settings) return <div className="empty">Loading…</div>;

  const t = todayStr();
  const weekStart = startOfWeek();
  const contactedThisWeek = leads.filter(
    (l) => l.contactedDate && l.contactedDate >= weekStart,
  ).length;
  const dueToday = leads.filter(
    (l) => l.nextFollowUp === t && !["Won", "Lost"].includes(l.stage),
  ).length;
  const overdue = leads.filter(
    (l) => l.nextFollowUp < t && !["Won", "Lost"].includes(l.stage),
  ).length;
  const hot = leads.filter((l) => computeHeat(l, settings) === "hot").length;

  const matchesFilters = (l: Lead & { heat: string }) => {
    if (filterHeat && l.heat !== filterHeat) return false;
    if (dueFilter === "due")
      return l.nextFollowUp === t && !["Won", "Lost"].includes(l.stage);
    if (dueFilter === "overdue")
      return l.nextFollowUp < t && !["Won", "Lost"].includes(l.stage);
    if (search) {
      const hay = `${l.name} ${l.contact} ${l.source} ${l.email}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  };

  const byDate = (a: { nextFollowUp: string }, b: { nextFollowUp: string }) =>
    (a.nextFollowUp || "9999").localeCompare(b.nextFollowUp || "9999");

  const withHeat = leads.map((l) => ({ ...l, heat: computeHeat(l, settings) }));
  const list = withHeat
    .filter((l) => (!filterStage || l.stage === filterStage) && matchesFilters(l))
    .sort(byDate);
  const boardList = withHeat.filter(matchesFilters).sort(byDate);

  const openLead = (id?: Id<"leads">) => {
    setEditingId(id ?? null);
    if (id) {
      const l = leads.find((x) => x._id === id);
      if (l)
        setForm({
          name: l.name,
          contact: l.contact,
          email: l.email,
          website: l.website,
          source: l.source,
          angle: l.angle,
          notes: l.notes,
          stage: l.stage,
          heat: l.heat,
        });
    } else {
      setForm({ ...emptyForm, stage: settings.stages[0] });
    }
    setLeadOpen(true);
  };

  const saveLead = async () => {
    if (!form.name.trim()) {
      notify("Please enter a business / lead name");
      return;
    }
    const data = {
      name: form.name.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      website: form.website.trim(),
      source: form.source.trim(),
      angle: form.angle.trim(),
      notes: form.notes.trim(),
      stage: form.stage || settings.stages[0],
      heat: form.heat,
      heatPinned: true,
    };
    if (editingId) {
      const l = leads.find((x) => x._id === editingId);
      await updateLead({
        id: editingId,
        ...data,
        touches: l?.touches ?? 0,
        lastTouch: l?.lastTouch,
        nextFollowUp: l?.nextFollowUp ?? t,
        contactedDate: l?.contactedDate,
      });
      notify(`Updated “${data.name}”`);
    } else {
      await addLead({
        ...data,
        touches: 0,
        nextFollowUp: t,
      });
      notify(`Added “${data.name}” — log a touch when you reach out`);
    }
    setLeadOpen(false);
  };

  const openSettings = () => {
    setSQuota(String(settings.quota));
    setSCadence(settings.cadence.join(", "));
    setSColdDays(String(settings.coldDays));
    setSStages(settings.stages.join(", "));
    setSettingsOpen(true);
  };

  const persistSettings = async () => {
    const quota = parseInt(sQuota, 10);
    const cadence = sCadence
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => !isNaN(n));
    const coldDays = parseInt(sColdDays, 10);
    const stages = sStages
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    await saveSettings({
      quota: isNaN(quota) ? settings.quota : quota,
      cadence: cadence.length ? cadence : settings.cadence,
      coldDays: isNaN(coldDays) ? settings.coldDays : coldDays,
      stages: stages.length ? stages : settings.stages,
    });
    setSettingsOpen(false);
    notify("Settings saved");
  };

  const dismissWelcome = () => {
    localStorage.setItem(LS_ONBOARDED, "1");
    setShowWelcome(false);
  };

  const activeFilter =
    dueFilter === "due"
      ? "Due today"
      : dueFilter === "overdue"
        ? "Overdue"
        : "";

  return (
    <>
      <header className="topbar">
        <div className="brand">Ledger</div>
        <div className="stats">
          <div
            className="stat"
            title="Leads you first contacted since Monday, out of your weekly goal"
          >
            <span className="num mono">
              {contactedThisWeek} / {settings.quota}
            </span>
            <span className="lbl">contacted this week</span>
          </div>
          <button
            className={"stat asbtn" + (dueToday > 0 ? " warn" : "")}
            title="Follow-ups scheduled for today — click to filter"
            onClick={() =>
              setDueFilter(dueFilter === "due" ? "" : "due")
            }
          >
            <span className="num mono">{dueToday}</span>
            <span className="lbl">due today</span>
          </button>
          <button
            className={"stat asbtn" + (overdue > 0 ? " warn" : "")}
            title="Follow-ups past their date — click to filter"
            onClick={() =>
              setDueFilter(dueFilter === "overdue" ? "" : "overdue")
            }
          >
            <span className="num mono">{overdue}</span>
            <span className="lbl">overdue</span>
          </button>
          <div
            className="stat"
            title="Leads worth prioritizing right now (replied, booked, or proposed)"
          >
            <span className="num mono">{hot}</span>
            <span className="lbl">hot leads</span>
          </div>
        </div>
        <button
          className="ghost"
          title="How to use Ledger"
          onClick={() => setShowHelp(true)}
        >
          ? Help
        </button>
        <button onClick={openSettings}>Settings</button>
        <button
          className="ghost"
          title="Sign out"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </header>

      <main>
        {overdue + dueToday > 0 && (
          <div className="banner">
            <strong>
              {overdue > 0
                ? `${overdue} follow-up${overdue > 1 ? "s" : ""} overdue`
                : `${dueToday} follow-up${dueToday > 1 ? "s" : ""} due today`}
            </strong>
            <span>
              {overdue > 0 && dueToday > 0
                ? ` · ${dueToday} more due today`
                : " — reach out and hit “Log touch”"}
            </span>
            <button
              className="small"
              onClick={() =>
                setDueFilter(overdue > 0 ? "overdue" : "due")
              }
            >
              Show them
            </button>
          </div>
        )}

        <div className="toolbar">
          <button className="primary" onClick={() => openLead()}>
            + Add lead
          </button>
          <select
            value={filterStage}
            onChange={(e) => {
              setFilterStage(e.target.value);
              setDueFilter("");
            }}
          >
            <option value="">All stages</option>
            {settings.stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filterHeat}
            onChange={(e) => {
              setFilterHeat(e.target.value);
              setDueFilter("");
            }}
          >
            <option value="">All heat</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
          <input
            type="text"
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, contact, source…"
          />
          {activeFilter && (
            <button
              className="ghost small"
              onClick={() => {
                setDueFilter("");
              }}
            >
              ✕ Clear “{activeFilter}” filter
            </button>
          )}
          <div className="viewtoggle" role="group" aria-label="View mode">
            <button
              className={view === "board" ? "active" : ""}
              onClick={() => setView("board")}
              title="Kanban board — drag leads between stages"
            >
              Board
            </button>
            <button
              className={view === "table" ? "active" : ""}
              onClick={() => setView("table")}
              title="Dense table view"
            >
              Table
            </button>
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="tablewrap">
            <div className="empty empty-start">
              <div className="empty-title">No leads yet — let's fix that</div>
              <ol className="steps">
                <li>
                  <strong>Add a lead</strong> — the business you want to work
                  with
                </li>
                <li>
                  <strong>Log a touch</strong> — every time you email, call, or
                  message them
                </li>
                <li>
                  <strong>Follow up</strong> — Ledger tells you who's due today
                  and who's overdue
                </li>
                <li>
                  <strong>Move stages</strong> — drag cards across the board,
                  from Sourced all the way to Won
                </li>
              </ol>
              <button className="primary" onClick={() => openLead()}>
                + Add your first lead
              </button>
            </div>
          </div>
        ) : list.length === 0 && boardList.length === 0 ? (
          <div className="tablewrap">
            <div className="empty">
              No leads match your filters.
              <button
                className="ghost small"
                style={{ marginLeft: 8 }}
                onClick={() => {
                  setFilterStage("");
                  setFilterHeat("");
                  setDueFilter("");
                  setSearch("");
                }}
              >
                Clear all filters
              </button>
            </div>
          </div>
        ) : view === "board" ? (
          <KanbanBoard
            leads={boardList}
            stages={filterStage ? [filterStage] : settings.stages}
            today={t}
            onMove={async (id, stage) => {
              await setStage({ id, stage });
              notify(`Moved to “${stage}”`);
            }}
            onLogTouch={async (lead) => {
              await logTouch({ id: lead._id });
              notify(
                `Touch logged for “${lead.name}” — next follow-up scheduled`,
              );
            }}
            onEdit={(id) => openLead(id)}
          />
        ) : (
          <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th title="Business name, contact, and where they came from">
                  Lead
                </th>
                <th title="Your hook or what's broken — why you're reaching out">
                  Angle
                </th>
                <th title="Where this lead sits in your pipeline">Stage</th>
                <th title="Priority: hot = act now, warm = keep warm, cold = parked">
                  Heat
                </th>
                <th title="How many times you've reached out">Touches</th>
                <th title="Date of your most recent outreach">Last touch</th>
                <th title="When you plan to reach out next">Next follow-up</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => {
                const isOverdue = l.nextFollowUp < t;
                const isToday = l.nextFollowUp === t;
                const nfClass = isOverdue
                  ? "overdue"
                  : isToday
                    ? "today"
                    : "";
                return (
                  <tr
                    key={l._id}
                    className={isOverdue ? "row-overdue" : isToday ? "row-today" : ""}
                  >
                    <td>
                      <div className="leadname">{l.name}</div>
                      <div className="leadsub">
                        {l.contact}
                        {l.email ? ` · ${l.email}` : ""}
                        {l.source ? ` · ${l.source}` : ""}
                      </div>
                    </td>
                    <td data-label="Angle">
                      <div className="angle" title={l.angle}>
                        {l.angle || "—"}
                      </div>
                    </td>
                    <td data-label="Stage">
                      <select
                        value={l.stage}
                        title="Move this lead through your pipeline"
                        onChange={(e) =>
                          setStage({ id: l._id, stage: e.target.value })
                        }
                      >
                        {settings.stages.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Heat">
                      <select
                        className={`badge ${l.heat}`}
                        value={l.heat}
                        title="Hot = act now · Warm = keep warm · Cold = parked"
                        onChange={(e) =>
                          setHeat({ id: l._id, heat: e.target.value })
                        }
                      >
                        <option value="hot">Hot</option>
                        <option value="warm">Warm</option>
                        <option value="cold">Cold</option>
                      </select>
                    </td>
                    <td
                      className="mono"
                      data-label="Touches"
                      title="Times you've reached out"
                    >
                      {l.touches || 0}
                    </td>
                    <td className="datecell" data-label="Last touch">
                      {l.lastTouch || "—"}
                    </td>
                    <td data-label="Next follow-up">
                      <input
                        type="date"
                        className={`datecell ${nfClass}`}
                        value={l.nextFollowUp || ""}
                        title={
                          isOverdue
                            ? "Overdue — pick a new date or log a touch"
                            : isToday
                              ? "Due today"
                              : "Click to reschedule"
                        }
                        onChange={(e) =>
                          setNextFollowUp({
                            id: l._id,
                            nextFollowUp: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className="actions" data-label="">
                      <button
                        className="small"
                        title="Records outreach today and auto-schedules the next follow-up"
                        onClick={async () => {
                          await logTouch({ id: l._id });
                          notify(
                            `Touch logged for “${l.name}” — next follow-up scheduled`,
                          );
                        }}
                      >
                        Log touch
                      </button>
                      <button
                        className="small ghost"
                        onClick={() => openLead(l._id)}
                      >
                        Edit
                      </button>
                      <button
                        className="small ghost"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete “${l.name}”? This cannot be undone.`,
                            )
                          ) {
                            removeLead({ id: l._id });
                            notify(`Deleted “${l.name}”`);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </main>

      <div className={"modal" + (leadOpen ? "" : " hidden")}>
        <div className="modalcard">
          <h2>{editingId ? "Edit lead" : "Add lead"}</h2>
          <p className="hint">
            Only the name is required — fill in the rest as you learn more
            about them.
          </p>
          <div className="field">
            <label>Business / lead name *</label>
            <input
              type="text"
              value={form.name}
              placeholder="e.g. Joe's Plumbing"
              autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="field row2">
            <div>
              <label>Contact name</label>
              <input
                type="text"
                value={form.contact}
                placeholder="Who you'll talk to"
                onChange={(e) =>
                  setForm({ ...form, contact: e.target.value })
                }
              />
            </div>
            <div>
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                placeholder="them@company.com"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="field row2">
            <div>
              <label>Website</label>
              <input
                type="url"
                value={form.website}
                placeholder="https://…"
                onChange={(e) =>
                  setForm({ ...form, website: e.target.value })
                }
              />
            </div>
            <div>
              <label>Source</label>
              <input
                type="text"
                value={form.source}
                placeholder="e.g. Google Maps, referral"
                onChange={(e) =>
                  setForm({ ...form, source: e.target.value })
                }
              />
            </div>
          </div>
          <div className="field">
            <label>Angle — why you're reaching out</label>
            <textarea
              rows={2}
              value={form.angle}
              placeholder="e.g. Site has no mobile menu · Slow load times · Missing online booking"
              onChange={(e) => setForm({ ...form, angle: e.target.value })}
            />
            <div className="help-text">
              Your hook for the conversation — what's broken or what you can
              improve for them.
            </div>
          </div>
          <div className="field row2">
            <div>
              <label>Stage</label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
              >
                {settings.stages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="help-text">Where they are in your pipeline.</div>
            </div>
            <div>
              <label>Heat</label>
              <select
                value={form.heat}
                onChange={(e) => setForm({ ...form, heat: e.target.value })}
              >
                <option value="warm">Warm — keep an eye on</option>
                <option value="hot">Hot — act now</option>
                <option value="cold">Cold — parked for later</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              placeholder="Anything else worth remembering…"
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="modalfoot">
            <button className="ghost" onClick={() => setLeadOpen(false)}>
              Cancel
            </button>
            <button className="primary" onClick={saveLead}>
              {editingId ? "Save changes" : "Save lead"}
            </button>
          </div>
        </div>
      </div>

      <div className={"modal" + (settingsOpen ? "" : " hidden")}>
        <div className="modalcard">
          <h2>Settings</h2>
          <p className="hint">
            Customize this to fit however you're running outreach right now.
          </p>
          <div className="field">
            <label>Weekly outreach quota (new contacts per week)</label>
            <input
              type="text"
              value={sQuota}
              onChange={(e) => setSQuota(e.target.value)}
            />
            <div className="help-text">
              Shown in the header as “X / quota” so you can pace yourself.
            </div>
          </div>
          <div className="field">
            <label>
              Follow-up cadence (days after each touch, comma separated)
            </label>
            <input
              type="text"
              value={sCadence}
              placeholder="0, 3, 7, 14"
              onChange={(e) => setSCadence(e.target.value)}
            />
            <div className="help-text">
              After the 1st touch → next follow-up in 3 days, then 7, then 14.
            </div>
          </div>
          <div className="field">
            <label>Auto-mark cold after this many days with no reply</label>
            <input
              type="text"
              value={sColdDays}
              onChange={(e) => setSColdDays(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Pipeline stages (comma separated, in order)</label>
            <input
              type="text"
              value={sStages}
              onChange={(e) => setSStages(e.target.value)}
            />
          </div>
          <div className="modalfoot">
            <button
              className="ghost danger"
              onClick={() => {
                if (confirm("Erase every lead? This cannot be undone."))
                  resetAll().then(() => {
                    setSettingsOpen(false);
                    notify("All leads erased");
                  });
              }}
            >
              Erase all data
            </button>
            <button className="ghost" onClick={() => setSettingsOpen(false)}>
              Close
            </button>
            <button className="primary" onClick={persistSettings}>
              Save settings
            </button>
          </div>
        </div>
      </div>

      <div className={"modal" + (showWelcome ? "" : " hidden")}>
        <div className="modalcard">
          <h2>Welcome to Ledger</h2>
          <p className="hint">
            A simple pipeline for tracking leads and never forgetting a
            follow-up.
          </p>
          <ol className="steps modal-steps">
            <li>
              <strong>Add a lead</strong> with the business name and your
              angle (why you're reaching out).
            </li>
            <li>
              <strong>Log a touch</strong> every time you contact them —
              Ledger auto-schedules the next follow-up.
            </li>
            <li>
              <strong>Work the board</strong> — every stage is a column; drag
              cards (or use ‹ ›) to move leads forward. The header shows
              what's due today and what's overdue.
            </li>
            <li>
              <strong>Log touches & set heat</strong> so the team always knows
              who's hot and what's next.
            </li>
          </ol>
          <div className="modalfoot">
            <button
              className="ghost"
              onClick={() => {
                dismissWelcome();
                setShowHelp(true);
              }}
            >
              Open full guide
            </button>
            <button className="primary" onClick={dismissWelcome}>
              Get started
            </button>
          </div>
        </div>
      </div>

      <div className={"modal" + (showHelp ? "" : " hidden")}>
        <div className="modalcard">
          <h2>How to use Ledger</h2>
          <p className="hint">The daily loop, and what every field means.</p>

          <div className="help-section">
            <div className="help-h">The daily loop</div>
            <ol className="steps modal-steps">
              <li>Check the header: anything due today or overdue?</li>
              <li>Click “Show them”, reach out, then hit “Log touch” on the card.</li>
              <li>Drag the card to the next column (or use ‹ ›) as the conversation progresses.</li>
              <li>Log touch records today, bumps touches +1, advances the stage if needed, and schedules the next follow-up from your cadence.</li>
              <li>New prospects go in with “+ Add lead”. Switch to Table view for a dense list.</li>
            </ol>
          </div>

          <div className="help-section">
            <div className="help-h">Fields</div>
            <dl className="glossary">
              <dt>Stage</dt>
              <dd>
                Where they are: Sourced → Contacted → … → Won / Lost. On the
                board, each stage is a column — drag cards between them.
              </dd>
              <dt>Heat</dt>
              <dd>
                <span className="badge hot">Hot</span> act now ·{" "}
                <span className="badge warm">Warm</span> keep warm ·{" "}
                <span className="badge cold">Cold</span> parked.
              </dd>
              <dt>Touches</dt>
              <dd>How many times you've reached out.</dd>
              <dt>Angle</dt>
              <dd>Your hook — what's broken or what you'll improve for them.</dd>
              <dt>Next follow-up</dt>
              <dd>
                When you plan to reach out next.{" "}
                <em>Red</em> = overdue, <em>amber</em> = today.
              </dd>
            </dl>
          </div>

          <div className="help-section">
            <div className="help-h">Header numbers</div>
            <dl className="glossary">
              <dt>X / quota</dt>
              <dd>Leads first contacted this week vs. your weekly goal.</dd>
              <dt>Due today / Overdue</dt>
              <dd>Click either one to filter the table to just those leads.</dd>
              <dt>Hot leads</dt>
              <dd>How many leads are currently marked hot.</dd>
            </dl>
          </div>

          <div className="modalfoot">
            <button className="primary" onClick={() => setShowHelp(false)}>
              Got it
            </button>
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
