import { KnowledgeBase } from "./KnowledgeBase";
import { Templates } from "./Templates";
import type { KnowledgeTab } from "../data/knowledgeBase";

export type ConfigurationTab = "templates" | "brand-voice";

interface ConfigurationProps {
  initialTab?: ConfigurationTab;
  initialKnowledgeTab?: KnowledgeTab;
}

export function Configuration({
  initialTab = "templates",
  initialKnowledgeTab = "dictionaries",
}: ConfigurationProps) {
  const activeTab = initialTab;

  return (
    <div className="configuration-page">
      {activeTab === "templates" && <Templates />}
      {activeTab === "brand-voice" && (
        <KnowledgeBase variant="brand-voice" initialTab={initialKnowledgeTab} />
      )}
    </div>
  );
}
