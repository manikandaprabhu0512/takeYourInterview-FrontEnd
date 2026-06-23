import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Pencil } from "lucide-react";
import {
  addSource,
  deleteArtifact,
  deleteSource,
  generateArtifact,
  getNotebook,
  listArtifacts,
  listMessages,
  listSources,
  sendMessage,
} from "../components/NotebookAPI";
import SourceRail from "../components/SourceRail";
import ChatPanel from "../components/ChatPannel";
import StudioPanel from "../components/StudioPannel";
import AddSourceIntake from "../components/SourceIntake";
import Loader from "../components/Loader";
import { streamAnswer } from "../utils/stream_answer";

export default function NotebookPage() {
  const params = useParams();
  const notebookId = params.id;

  const [notebook, setNotebook] = useState(null);
  const [sources, setSources] = useState([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [addingSource, setAddingSource] = useState(false);
  const [selectedurls, setSelectedurls] = useState(new Set());
  const [status, setStatus] = useState("");

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [artifacts, setArtifacts] = useState([]);
  const [artifactsLoading, setArtifactsLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState(null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef(null);

  const [showIntake, setShowIntake] = useState(false);

  useEffect(() => {
    getNotebook(notebookId).then(setNotebook);

    listSources(notebookId).then((s) => {
      setSources(s);

      setSourcesLoading(false);
      if (s.length === 0) setShowIntake(true);
    });

    listMessages(notebookId).then((m) => {
      setMessages(m);
      setMessagesLoading(false);
    });

    listArtifacts(notebookId).then((a) => {
      setArtifacts(a);
      setArtifactsLoading(false);
    });
  }, [notebookId]);

  function toggleSelect(url) {
    setSelectedurls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  async function handleAddSource(query) {
    setShowIntake(false);
    setAddingSource(true);
    setSending(true);
    setStatus("Loading...");
    const optimisticUser = {
      id: `tmp-${Date.now()}`,
      notebookId,
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    try {
      const response = await addSource(notebookId, query);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let eventType = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.replace("event:", "").trim();
          }

          if (line.startsWith("data:")) {
            const data = JSON.parse(line.replace("data:", "").trim());

            switch (eventType) {
              case "title_generated":
                setNotebook((prev) => ({ ...prev, title: data.title }));
                setStatus(`Generated title: ${data.title}`);
                break;

              case "scraping_complete":
                setStatus(`Found ${data.urls_found} sources...`);
                break;

              case "pages_loaded":
                setStatus(`Loading ${data.pages_loaded} pages...`);
                break;

              case "ingestion_complete":
                const newSources = data.sources.map((s) => ({
                  id: crypto.randomUUID(),
                  notebookId,
                  title: s.title,
                  type: "url",
                  status: "ready",
                  addedAt: new Date().toISOString(),
                }));
                setSources((prev) => [...prev, ...newSources]);
                setStatus(`Stored ${data.urls_stored} sources`);
                break;

              case "answer_ready":
                setSending(false);
                await streamAnswer(
                  notebookId,
                  data.assistant.content,
                  setMessages,
                );
                break;

              case "done":
                break;
            }
          }
        }
      }
    } finally {
      setAddingSource(false);
      setSending(false);
    }
  }

  async function handleDeleteSource(id) {
    await deleteSource(notebookId, id);
    setSources((prev) => prev.filter((s) => s._id !== id));
    setSelectedurls((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleSend(query, files) {
    setSending(true);
    const optimisticUser = {
      id: `tmp-${Date.now()}`,
      notebookId,
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    try {
      const response = await sendMessage(
        notebookId,
        query,
        Array.from(selectedurls),
        files,
      );
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let eventType = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.replace("event:", "").trim();
          }

          if (line.startsWith("data:")) {
            let data;
            try {
              data = JSON.parse(line.replace("data:", "").trim());
            } catch {
              continue;
            }

            switch (eventType) {
              case "checking_files":
                setStatus("Checking files...");
                break;

              case "uploading_files":
                setStatus(`Uploading ${data.count} file(s)...`);
                break;

              case "file_stored":
                setStatus(`Stored ${data.count} file(s)`);
                break;

              case "sources_saved":
                setStatus("Saving sources...");
                setSources((prev) => [...prev, ...data.sources]);
                break;

              case "loading_url":
                setStatus("Loading URL...");
                break;

              case "source_saved":
                setSources((prev) => [...prev, data]);
                break;

              case "fetching_history":
                setStatus("Fetching history...");
                break;

              case "smaller_model_generating_answer":
                setStatus("Generating answer...");
                break;

              case "larger_model_generating_answer":
                setStatus("Thinking deeper...");
                break;

              case "retrieving_context":
                setStatus("Retrieving context...");
                break;

              case "checking_confidence":
                setStatus("Checking confidence...");
                break;

              case "answer_ready":
                setSending(false);
                await streamAnswer(
                  notebookId,
                  data.assistant.content,
                  setMessages,
                );
                break;

              case "partial_success":
                setStatus(`${data.count} file(s) stored, some failed`);
                break;

              case "error":
                setStatus(`Error: ${data.message}`);
                setMessages((prev) =>
                  prev.filter(
                    (m) =>
                      m.id !== optimisticUser.id &&
                      m.id !== optimisticAssistant.id,
                  ),
                );
                break;

              case "done":
                setStatus("");
                break;
            }
          }
        }
      }
    } catch (err) {
      console.error("SSE error:", err);
    } finally {
      setSending(false);
    }
  }

  async function handleGenerate(type) {
    setGeneratingType(type);
    try {
      const labels = {
        summary: "Overview summary",
        study_guide: "Study guide",
        faq: "FAQ",
        timeline: "Timeline",
        audio_overview: "Audio overview",
      };
      const art = await generateArtifact(notebookId, type, labels[type]);
      setArtifacts((prev) => [art, ...prev]);
    } finally {
      setGeneratingType(null);
    }
  }

  async function handleDeleteArtifact(id) {
    await deleteArtifact(id);
    setArtifacts((prev) => prev.filter((a) => a.id !== id));
  }

  function startEditingTitle() {
    if (!notebook) return;
    setTitleDraft(notebook.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  }

  async function commitTitle() {
    const trimmed = titleDraft.trim();
    setEditingTitle(false);
    if (!notebook || !trimmed || trimmed === notebook.title) return;
    const updated = await renameNotebook(notebookId, trimmed);
    if (updated) setNotebook(updated);
  }

  return (
    <div className="h-screen flex flex-col paper-texture">
      <header className="border-b border-(--rule) shrink-0">
        <div className="px-4 py-2.5 flex items-center gap-3">
          <Link
            to="/marginal"
            className="w-8 h-8 rounded-sm border border-(--rule) flex items-center justify-center hover:bg-(--card-stock)/50 transition-colors shrink-0"
            title="Back to notebooks"
          >
            <ArrowLeft size={15} />
          </Link>
          <div className="w-7 h-7 rounded-sm border border-(--binding) flex items-center justify-center bg-(--paper-raised) -rotate-2 shrink-0">
            <BookOpen
              size={14}
              strokeWidth={1.75}
              className="text-(--binding)"
            />
          </div>
          <div className="min-w-0">
            {notebook ? (
              editingTitle ? (
                <input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTitle();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  autoFocus
                  className="font-(family-name:--font-display) text-base leading-tight bg-transparent border-b border-(--binding) focus:outline-none w-full max-w-xs"
                />
              ) : (
                <button
                  onClick={startEditingTitle}
                  className="group inline-flex items-center gap-1.5 max-w-full cursor-text"
                  title="Click to rename"
                >
                  <h1 className="font-(family-name:--font-display) text-base leading-tight truncate">
                    {notebook.emoji} {notebook.title}
                  </h1>
                  <Pencil
                    size={12}
                    className="text-(--ink-soft) opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  />
                </button>
              )
            ) : (
              <div className="h-4 w-40 bg-(--card-stock)/50 rounded animate-pulse" />
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] overflow-hidden">
        <div className="hidden lg:block border-r border-(--rule) overflow-hidden bg-(--paper-raised)/40">
          <SourceRail
            sources={sources}
            selectedurls={selectedurls}
            onToggleSelect={toggleSelect}
            onAddSource={handleAddSource}
            onDeleteSource={handleDeleteSource}
          />
        </div>

        <div className="overflow-hidden">
          <ChatPanel
            messages={messages}
            loading={messagesLoading}
            sending={sending}
            status={status}
            hasSources={sources.length > 0}
            onSend={handleSend}
          />
        </div>

        <div className="hidden lg:block border-l border-(--rule) overflow-hidden bg-(--paper-raised)/40">
          <StudioPanel
            artifacts={artifacts}
            loading={artifactsLoading}
            generatingType={generatingType}
            hasSources={sources.length > 0}
            onGenerate={handleGenerate}
            onDelete={handleDeleteArtifact}
          />
        </div>
      </div>

      {/* Mobile: sources & studio collapse into tabs below chat would go here if needed */}
      {!sourcesLoading && sources.length === 0 && (
        <div className="lg:hidden border-t border-(--rule) shrink-0">
          {/* Placeholder note for mobile - rails are hidden on small screens */}
        </div>
      )}

      {sources.length == 0 && showIntake && (
        <AddSourceIntake
          onAddSource={handleAddSource}
          onClose={() => setShowIntake(false)}
        />
      )}
    </div>
  );
}
