import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";

export type BoardLead = {
  _id: Id<"leads">;
  name: string;
  contact: string;
  email: string;
  source: string;
  angle: string;
  stage: string;
  heat: string;
  touches: number;
  lastTouch?: string;
  nextFollowUp: string;
};

type Props = {
  leads: BoardLead[];
  stages: string[];
  today: string;
  onMove: (id: Id<"leads">, stage: string) => void;
  onLogTouch: (lead: BoardLead) => void;
  onEdit: (id: Id<"leads">) => void;
};

export default function KanbanBoard({
  leads,
  stages,
  today,
  onMove,
  onLogTouch,
  onEdit,
}: Props) {
  const [dragOver, setDragOver] = useState<string | null>(null);

  const moveBy = (lead: BoardLead, dir: -1 | 1) => {
    const idx = stages.indexOf(lead.stage);
    const next = stages[idx + dir];
    if (next) onMove(lead._id, next);
  };

  return (
    <div className="board">
      {stages.map((stage, stageIdx) => {
        const cards = leads
          .filter((l) => l.stage === stage)
          .sort((a, b) =>
            (a.nextFollowUp || "9999").localeCompare(b.nextFollowUp || "9999"),
          );
        return (
          <section
            key={stage}
            className={"column" + (dragOver === stage ? " dragover" : "")}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(stage);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/plain") as Id<"leads">;
              if (id) onMove(id, stage);
            }}
          >
            <header className="col-head">
              <span className="col-name">{stage}</span>
              <span className="col-count mono">{cards.length}</span>
            </header>
            <div className="col-cards">
              {cards.map((l) => {
                const overdue = l.nextFollowUp < today;
                const isToday = l.nextFollowUp === today;
                return (
                  <article
                    key={l._id}
                    className="kcard"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", l._id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <div className="kcard-top">
                      <button
                        className="kcard-name"
                        title="Edit this lead"
                        onClick={() => onEdit(l._id)}
                      >
                        {l.name}
                      </button>
                      <span className={`badge ${l.heat}`} title={`Heat: ${l.heat}`}>
                        {l.heat}
                      </span>
                    </div>
                    {(l.contact || l.source) && (
                      <div className="kcard-sub">
                        {l.contact}
                        {l.source ? ` · ${l.source}` : ""}
                      </div>
                    )}
                    {l.angle && (
                      <div className="kcard-angle" title={l.angle}>
                        {l.angle}
                      </div>
                    )}
                    <div className="kcard-meta">
                      <span title="Times you've reached out">
                        {l.touches} touch{l.touches === 1 ? "" : "es"}
                      </span>
                      <span
                        className={
                          overdue
                            ? "due-overdue"
                            : isToday
                              ? "due-today"
                              : ""
                        }
                        title={
                          overdue
                            ? "Follow-up overdue"
                            : isToday
                              ? "Follow-up due today"
                              : "Next follow-up"
                        }
                      >
                        {l.nextFollowUp}
                      </span>
                    </div>
                    <div className="kcard-actions">
                      <button
                        className="small ghost nav"
                        title="Move back one stage"
                        disabled={stageIdx === 0}
                        onClick={() => moveBy(l, -1)}
                      >
                        ‹
                      </button>
                      <button
                        className="small"
                        title="Records outreach today and schedules the next follow-up"
                        onClick={() => onLogTouch(l)}
                      >
                        Log touch
                      </button>
                      <button
                        className="small ghost nav"
                        title="Move forward one stage"
                        disabled={stageIdx === stages.length - 1}
                        onClick={() => moveBy(l, 1)}
                      >
                        ›
                      </button>
                    </div>
                  </article>
                );
              })}
              {cards.length === 0 && (
                <div className="col-empty">
                  {stageIdx === 0
                    ? "Drop leads here or add a new one"
                    : "Nothing here yet"}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
