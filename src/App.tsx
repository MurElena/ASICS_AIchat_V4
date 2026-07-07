import { useEffect, useRef, useState, type ReactNode } from "react";
import { AiGenerationChat } from "./components/AiGenerationChat";
import { HomeTopBar } from "./components/HomeTopBar";
import { ManualSubNav, type ConfigTab, type ManualTab } from "./components/ManualSubNav";
import type { UserMenuAction } from "./components/UserMenu";
import { Login } from "./components/Login";
import { loadUser, saveUser, type AppView, type User } from "./data/session";
import type { GenerationMode } from "./components/HomeTopBar";
import type { SavedProfile } from "./data/profiles";
import { Admin } from "./pages/Admin";
import { Configuration } from "./pages/Configuration";
import { Documentation } from "./pages/Documentation";
import { History } from "./pages/History";
import { ManualGenerate } from "./pages/ManualGenerate";
import { GenerationRun } from "./pages/GenerationRun";
import { Statistics } from "./pages/Statistics";
import { Profile } from "./pages/Profile";
import {
  GenerationEditor,
  type GenerationEditorCloseResult,
} from "./components/GenerationEditor";
import { GenerationCommitModal } from "./components/GenerationCommitModal";
import type { GenerationOutput } from "./data/generationOutput";
import {
  appendHistoryRecord,
  createHistoryRecordFromGeneration,
} from "./data/historyStore";
import { appendInstructionsToUserStyleGuide } from "./data/styleGuidesStore";
import type { KnowledgeTab } from "./data/knowledgeBase";

export default function App() {
  const [user, setUser] = useState<User | null>(() => loadUser());
  const [mode, setMode] = useState<GenerationMode>("ai");
  const [chatKey, setChatKey] = useState(0);
  const [openWizard, setOpenWizard] = useState(false);
  const [landingResetKey, setLandingResetKey] = useState(0);
  const [view, setView] = useState<AppView>("home");
  const [manualTab, setManualTab] = useState<ManualTab>("generate");
  const [configTab, setConfigTab] = useState<ConfigTab>("templates");
  const [configKnowledgeTab, setConfigKnowledgeTab] = useState<KnowledgeTab>("dictionaries");
  const [runningProfile, setRunningProfile] = useState<SavedProfile | null>(null);
  const [editorOutput, setEditorOutput] = useState<GenerationOutput | null>(null);
  const [pendingEditorClose, setPendingEditorClose] = useState<GenerationEditorCloseResult | null>(
    null,
  );
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("asics_theme") as "light" | "dark" | null) ?? "light",
  );

  const prevView = useRef(view);
  const openingWizard = useRef(false);

  const clearGenerationFlow = () => {
    setRunningProfile(null);
    setEditorOutput(null);
    setPendingEditorClose(null);
    setShowCommitModal(false);
  };

  useEffect(() => {
    if (view !== "home") {
      clearGenerationFlow();
    }
  }, [view]);

  useEffect(() => {
    if (
      view === "home" &&
      prevView.current !== "home" &&
      mode === "manual" &&
      manualTab === "generate"
    ) {
      if (!openingWizard.current) {
        setLandingResetKey((k) => k + 1);
      }
      openingWizard.current = false;
    }
    prevView.current = view;
  }, [view, mode, manualTab]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("asics_theme", theme);
  }, [theme]);

  const handleLogin = (next: User) => {
    saveUser(next);
    setUser(next);
    setView("home");
  };

  const handleLogout = () => {
    saveUser(null);
    setUser(null);
    setView("home");
    setMode("ai");
    clearGenerationFlow();
  };

  const handleUpdateUser = (next: User) => {
    saveUser(next);
    setUser(next);
  };

  const handleModeChange = (next: GenerationMode) => {
    setMode(next);
    if (next === "manual") {
      setView("home");
      setManualTab("generate");
    } else {
      clearGenerationFlow();
    }
  };

  const finishWithoutStyleGuide = (profile: SavedProfile) => {
    appendHistoryRecord(
      createHistoryRecordFromGeneration({
        profileName: profile.name,
        templateName: profile.template,
        type: profile.type,
        createdBy: user!.name,
      }),
    );
    clearGenerationFlow();
    setLandingResetKey((k) => k + 1);
    setView("history");
  };

  const handleEditorCloseRequest = (result: GenerationEditorCloseResult) => {
    if (!runningProfile || !user) return;

    if (result.committedInstructions.length > 0) {
      setPendingEditorClose(result);
      setShowCommitModal(true);
      return;
    }

    finishWithoutStyleGuide(runningProfile);
  };

  const handleCommitStyleGuide = (
    editedInstructions: GenerationEditorCloseResult["committedInstructions"],
  ) => {
    if (!runningProfile || !user || !pendingEditorClose) return;

    appendInstructionsToUserStyleGuide({
      userId: user.userId,
      userName: user.name,
      instructions: editedInstructions.map((item) => ({
        summary: item.summary,
        sourcePrompt: item.sourcePrompt,
      })),
      context: {
        template: runningProfile.template,
        language: runningProfile.language,
      },
    });

    appendHistoryRecord(
      createHistoryRecordFromGeneration({
        profileName: runningProfile.name,
        templateName: runningProfile.template,
        type: runningProfile.type,
        createdBy: user.name,
      }),
    );

    clearGenerationFlow();
    setView("home");
    setManualTab("configuration");
    setConfigTab("brand-voice");
    setConfigKnowledgeTab("style-guides");
  };

  const handleRunProfile = (profile: SavedProfile) => {
    setRunningProfile(profile);
    setEditorOutput(null);
    setPendingEditorClose(null);
    setShowCommitModal(false);
  };

  const handleMenuAction = (action: UserMenuAction) => {
    switch (action) {
      case "toggle-theme":
        setTheme((current) => (current === "light" ? "dark" : "light"));
        break;
      case "account":
        setView("account");
        break;
      case "admin":
        setView("admin");
        break;
      case "statistics":
        setView("statistics");
        break;
      case "documentation":
        setView("documentation");
        break;
      case "logout":
        handleLogout();
        break;
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const isManualHome = mode === "manual" && view === "home";
  const isGenerating =
    mode === "manual" && view === "home" && manualTab === "generate" && runningProfile !== null;

  const mainClass =
    view === "home" && mode === "ai"
      ? "chat-main chat-main--ai"
      : view === "home" && mode === "manual" && manualTab === "generate" && !isGenerating
        ? "chat-main manual-main"
        : "app-page";

  const renderManualGenerate = (): ReactNode => {
    if (runningProfile && editorOutput) {
      return (
        <>
          <GenerationEditor
            profile={runningProfile}
            initialOutput={editorOutput}
            onRequestClose={handleEditorCloseRequest}
          />
          {showCommitModal && pendingEditorClose && (
            <GenerationCommitModal
              instructions={pendingEditorClose.committedInstructions}
              userName={user.name}
              onCancel={() => {
                setShowCommitModal(false);
                setPendingEditorClose(null);
              }}
              onCloseWithoutCommitting={() => finishWithoutStyleGuide(runningProfile)}
              onCommit={handleCommitStyleGuide}
            />
          )}
        </>
      );
    }

    if (runningProfile) {
      return (
        <GenerationRun
          profile={runningProfile}
          onBack={() => setRunningProfile(null)}
          onGenerated={setEditorOutput}
        />
      );
    }

    return (
      <ManualGenerate
        user={user}
        openWizard={openWizard}
        onWizardOpened={() => setOpenWizard(false)}
        landingResetKey={landingResetKey}
        onRunProfile={handleRunProfile}
      />
    );
  };

  const renderContent = () => {
    if (view === "history") {
      return (
        <>
          <button type="button" className="btn-link page-back" onClick={() => setView("home")}>
            ← Back
          </button>
          <History session={user} userRole={user.role} />
        </>
      );
    }

    switch (view) {
      case "account":
        return (
          <Profile
            session={user}
            onBack={() => setView("home")}
            onUpdateSession={handleUpdateUser}
            onLogout={handleLogout}
            onDeleteAccount={handleLogout}
          />
        );
      case "admin":
        return (
          <>
            <button type="button" className="btn-link page-back" onClick={() => setView("home")}>
              ← Back
            </button>
            <Admin />
          </>
        );
      case "statistics":
        return (
          <>
            <button type="button" className="btn-link page-back" onClick={() => setView("home")}>
              ← Back
            </button>
            <Statistics />
          </>
        );
      case "documentation":
        return (
          <>
            <button type="button" className="btn-link page-back" onClick={() => setView("home")}>
              ← Back
            </button>
            <Documentation onNavigate={setView} />
          </>
        );
      default:
        if (mode === "manual") {
          if (manualTab === "configuration") {
            return (
              <Configuration
                initialTab={configTab === "brand-voice" ? "brand-voice" : "templates"}
                initialKnowledgeTab={configKnowledgeTab}
              />
            );
          }
          return renderManualGenerate();
        }
        return <AiGenerationChat user={user} chatKey={chatKey} />;
    }
  };

  return (
    <div className="chat-shell">
      <HomeTopBar
        user={user}
        mode={mode}
        theme={theme}
        onModeChange={handleModeChange}
        onNewChat={() => {
          if (mode === "manual") {
            openingWizard.current = true;
            setView("home");
            setManualTab("generate");
            setOpenWizard(true);
          } else {
            setView("home");
            setChatKey((k) => k + 1);
          }
        }}
        onOpenHistory={() => setView("history")}
        onMenuAction={handleMenuAction}
      />

      {isManualHome && (
        <ManualSubNav
          activeTab={manualTab}
          configTab={configTab}
          onTabChange={(tab) => {
            setManualTab(tab);
            if (tab === "generate") {
              setOpenWizard(false);
              clearGenerationFlow();
              setLandingResetKey((k) => k + 1);
            } else {
              clearGenerationFlow();
            }
          }}
          onConfigTabChange={setConfigTab}
        />
      )}

      <main className={mainClass}>{renderContent()}</main>
    </div>
  );
}
