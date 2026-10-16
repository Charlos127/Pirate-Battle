import { useRef, useState, type KeyboardEvent } from "react";
import { ControlsPanel } from "./ControlsPanel";
import { DebugPanel } from "./DebugPanel";
import { HistoryTab } from "./HistoryTab";
import { RankingTab } from "./RankingTab";
import { usePendingStore } from "../store/pendingStore";

type TabId = "ranking" | "history";
const TABS: Array<{ id: TabId; label: string }> = [
  { id: "ranking", label: "Ranking" },
  { id: "history", label: "Match History" },
];

export function MainMenu({
  onPlay,
  onOptions,
}: {
  onPlay: () => void;
  onOptions: () => void;
}) {
  const [tab, setTab] = useState<TabId>("ranking");
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  const pendingCount = usePendingStore((s) => s.items.length);
  const showDebug = new URLSearchParams(location.search).has("debug");

  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let next;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    const id = TABS[next]!.id;
    setTab(id);
    tabRefs.current[id]?.focus();
  };

  return (
    <main className="menu">
      <h1 className="menu-title">
        <img
          src="/assets/png/retina/ui/menu/title_pirate_battle.png"
          alt="Pirate Battle"
        />
      </h1>

      <div className="menu-actions">
        <button type="button" className="primary" onClick={onPlay}>
          Play
        </button>
        <button type="button" onClick={onOptions}>
          Options
        </button>
      </div>

      {pendingCount > 0 && (
        <p role="status">
          {pendingCount} {pendingCount === 1 ? "match is" : "matches are"}{" "}
          waiting to sync. It will be retried automatically.
        </p>
      )}

      <div className="panel">
        <ControlsPanel />
      </div>

      <section aria-label="Leaderboards" className="panel">
        <div role="tablist" aria-label="Leaderboards" onKeyDown={onTabKeyDown}>
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              role="tab"
              id={`tab-${t.id}`}
              type="button"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "ranking" ? <RankingTab /> : <HistoryTab />}
        </div>
      </section>

      {showDebug && <DebugPanel />}
    </main>
  );
}
