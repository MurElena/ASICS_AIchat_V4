import { buildGenerationOutput } from "../data/generationOutput";
import type { HistoryRecord } from "../data/historyRecords";
import { DEMO_EXCEL_PROFILE_ID, type SavedProfile } from "../data/profiles";

export function profileFromHistoryRecord(record: HistoryRecord): SavedProfile {
  return {
    id: record.type === "multiproduct" ? DEMO_EXCEL_PROFILE_ID : `history-${record.id}`,
    name: record.title,
    type: record.type,
    createdBy: record.createdBy,
    createdAt: record.date,
    template: record.templateName ?? "Product Description",
    language: "English",
    length: record.type === "multiproduct" ? "N/A" : "Medium (100–300 words)",
    dictionary: "Corporate — Default",
    styleGuides: [],
    referenceContent: [],
  };
}

export function openHistoryRecordInEditor(record: HistoryRecord) {
  const profile = profileFromHistoryRecord(record);
  const source =
    record.status === "done"
      ? record.description
      : `History record (${record.status}) · ${record.description}`;
  return {
    profile,
    output: buildGenerationOutput(profile, source),
  };
}
