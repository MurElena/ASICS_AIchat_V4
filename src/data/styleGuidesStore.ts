import { MOCK_STYLE_GUIDES, type StyleGuide } from "./knowledgeBase";

export const STYLE_GUIDES_STORAGE_KEY = "contentgen_style_guides";

export interface StyleGuideInstructionCommit {
  summary: string;
  sourcePrompt: string;
}

export function formatUserStyleGuideName(userName: string): string {
  return `${userName.trim()} Style guide`;
}

export function userStyleGuideId(userId: string): string {
  return `sg-user-${userId}`;
}

export function loadStyleGuides(): StyleGuide[] {
  try {
    const raw = localStorage.getItem(STYLE_GUIDES_STORAGE_KEY);
    if (!raw) return MOCK_STYLE_GUIDES;
    const parsed = JSON.parse(raw) as StyleGuide[];
    return parsed.length > 0 ? parsed : MOCK_STYLE_GUIDES;
  } catch {
    return MOCK_STYLE_GUIDES;
  }
}

export function saveStyleGuides(guides: StyleGuide[]) {
  localStorage.setItem(STYLE_GUIDES_STORAGE_KEY, JSON.stringify(guides));
}

export function appendStyleGuide(guide: StyleGuide) {
  const guides = loadStyleGuides();
  saveStyleGuides([guide, ...guides]);
}

export function findUserStyleGuide(userId: string): StyleGuide | undefined {
  const id = userStyleGuideId(userId);
  return loadStyleGuides().find((guide) => guide.id === id || guide.userId === userId);
}

function formatCommitDate(): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function formatInstructionBlock(
  instructions: StyleGuideInstructionCommit[],
  context: { template: string; language: string },
  dateStr: string,
): string {
  return `## ${dateStr} · ${context.template} · ${context.language}

${instructions
  .map(
    (item, index) =>
      `### Instruction ${index + 1}\n${item.summary.trim()}\n\n_From: “${item.sourcePrompt}”_`,
  )
  .join("\n\n")}`;
}

/** Create on first commit, then append instructions on every subsequent commit. */
export function appendInstructionsToUserStyleGuide(options: {
  userId: string;
  userName: string;
  instructions: StyleGuideInstructionCommit[];
  context: { template: string; language: string };
}): StyleGuide {
  const guides = loadStyleGuides();
  const id = userStyleGuideId(options.userId);
  const name = formatUserStyleGuideName(options.userName);
  const dateStr = formatCommitDate();
  const block = formatInstructionBlock(options.instructions, options.context, dateStr);
  const existing = guides.find((guide) => guide.id === id || guide.userId === options.userId);

  if (!existing) {
    const guide: StyleGuide = {
      id,
      name,
      content: `# ${name}

Personal style rules captured from generation editing.

---

${block}`,
      usageCount: 0,
      label: "Style guide",
      uploadedAt: dateStr,
      createdBy: options.userName,
      userId: options.userId,
      isUserGuide: true,
    };
    saveStyleGuides([guide, ...guides]);
    return guide;
  }

  const updated: StyleGuide = {
    ...existing,
    name,
    content: `${existing.content?.trim() ?? `# ${name}`}\n\n---\n\n${block}`,
    uploadedAt: dateStr,
    userId: options.userId,
    isUserGuide: true,
  };
  saveStyleGuides(guides.map((guide) => (guide.id === existing.id ? updated : guide)));
  return updated;
}

export function createStyleGuideFromInstructions(options: {
  name: string;
  content: string;
  createdBy: string;
}): StyleGuide {
  return {
    id: `sg-${Date.now()}`,
    name: options.name,
    content: options.content,
    usageCount: 0,
    label: "Style guide",
    uploadedAt: formatCommitDate(),
    createdBy: options.createdBy,
  };
}
