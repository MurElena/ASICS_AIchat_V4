import type { HistoryRecord } from "./historyRecords";
import { HISTORY_RECORDS } from "./historyRecords";

const HISTORY_STORAGE_KEY = "contentgen_history_records";

export function loadHistoryRecords(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return HISTORY_RECORDS;
    const parsed = JSON.parse(raw) as HistoryRecord[];
    return parsed.length > 0 ? parsed : HISTORY_RECORDS;
  } catch {
    return HISTORY_RECORDS;
  }
}

export function saveHistoryRecords(records: HistoryRecord[]) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
}

export function appendHistoryRecord(record: HistoryRecord) {
  const records = loadHistoryRecords();
  saveHistoryRecords([record, ...records]);
}

export function createHistoryRecordFromGeneration(options: {
  profileName: string;
  templateName: string;
  type: "single" | "multiproduct";
  createdBy: string;
}): HistoryRecord {
  const now = new Date();
  return {
    id: `h-${Date.now()}`,
    status: "done",
    type: options.type === "multiproduct" ? "multiproduct" : "single",
    title: options.profileName,
    description: `${options.templateName} · Edited generation`,
    date: new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(now),
    createdBy: options.createdBy,
    templateName: options.templateName,
  };
}
