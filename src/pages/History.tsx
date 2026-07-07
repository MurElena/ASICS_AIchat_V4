import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { GenerationEditor } from "../components/GenerationEditor";
import { IconSearch } from "../components/Icons";
import { loadHistoryRecords } from "../data/historyStore";
import type { HistoryRecord } from "../data/historyRecords";
import type { GenerationOutput } from "../data/generationOutput";
import type { SavedProfile } from "../data/profiles";
import type { User } from "../data/session";
import type { UserRole } from "../data/roles";
import { openHistoryRecordInEditor } from "../utils/historyEditorUtils";

const STATUS_LABELS = {
  done: "Done",
  processing: "Processing",
  pending: "Pending",
  error: "Error",
} as const;

interface HistoryProps {
  session: User;
  userRole: UserRole;
}

export function History({ session, userRole }: HistoryProps) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{
    record: HistoryRecord;
    profile: SavedProfile;
    output: GenerationOutput;
  } | null>(null);

  const records = useMemo(() => {
    const all = loadHistoryRecords();
    if (userRole === "simple_user") {
      return all.filter((r) => r.createdBy === session.name);
    }
    return all;
  }, [session.name, userRole]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.createdBy.toLowerCase().includes(q),
    );
  }, [records, search]);

  const downloadRecord = (title: string, event: MouseEvent) => {
    event.stopPropagation();
    const blob = new Blob([`Generated output for: ${title}\n\n(Demo export)`], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-").slice(0, 40)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openRecord = (record: HistoryRecord) => {
    const { profile, output } = openHistoryRecordInEditor(record);
    setEditing({ record, profile, output });
  };

  const handleRowKeyDown = (record: HistoryRecord, event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openRecord(record);
    }
  };

  if (editing) {
    return (
      <div className="history-editor-view">
        <GenerationEditor
          profile={editing.profile}
          initialOutput={editing.output}
          onRequestClose={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="history-page">
      <header className="page-header">
        <h1 className="page-title">History</h1>
        <p className="page-subtitle">
          {userRole === "simple_user"
            ? "Your past generations — view and download outputs"
            : "All users’ generation history across the workspace"}
        </p>
      </header>

      <div className="templates-toolbar">
        <div className="templates-search">
          <IconSearch size={18} className="templates-search-icon" />
          <input
            type="search"
            className="templates-search-input"
            placeholder="Search history…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="templates-empty panel">
          <p>No generations match your search.</p>
        </div>
      ) : (
        <ul className="history-list">
          {filtered.map((record) => (
            <li key={record.id}>
              <div
                className="history-row panel history-row--clickable"
                role="button"
                tabIndex={0}
                onClick={() => openRecord(record)}
                onKeyDown={(e) => handleRowKeyDown(record, e)}
              >
                <div className="history-row-main">
                  <div className="history-row-top">
                    <span className={`history-tag history-tag--status-${record.status}`}>
                      {STATUS_LABELS[record.status]}
                    </span>
                    <span className={`history-tag history-tag--type-${record.type}`}>
                      {record.type === "single" ? "Single" : "Multiproduct"}
                    </span>
                  </div>
                  <h2 className="history-row-title">{record.title}</h2>
                  <p className="history-row-desc">{record.description}</p>
                  <p className="history-row-meta">
                    {record.date}
                    {userRole !== "simple_user" && (
                      <>
                        {" "}
                        · <strong>{record.createdBy}</strong>
                      </>
                    )}
                    {record.templateName && <> · {record.templateName}</>}
                  </p>
                </div>
                <div className="history-row-actions">
                  {record.status === "done" && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={(e) => downloadRecord(record.title, e)}
                    >
                      Download
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
