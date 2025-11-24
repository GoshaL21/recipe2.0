"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I’m your nutrition assistant. You can ask me about healthy eating, macros, your meal plan, or how to adjust meals to your goals. 😊",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [attachedRecipe, setAttachedRecipe] = useState<any | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<{ id: number; title: string; createdAt?: string }[]>(
    [],
  );
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Scroll only the chat container when messages change
  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // On mount, try to load the most recent saved chat session (if user is logged in)
  useEffect(() => {
    const loadLastSession = async () => {
      try {
        if (typeof window === "undefined") return;

        // Prepare headers with JWT if available
        let headers: HeadersInit = { "Content-Type": "application/json" };
        const token = localStorage.getItem("token");
        if (!token) {
          // Not logged in → no DB-backed history
          return;
        }
        headers = {
          ...headers,
          Authorization: `Bearer ${token}`,
        };

        // 1) Get all sessions (backend returns them sorted by updatedAt desc)
        const res = await fetch("/api/chat/sessions", {
          method: "GET",
          headers,
          credentials: "include",
        });

        if (!res.ok) return;

        const sessions = await res.json();
        if (!Array.isArray(sessions) || sessions.length === 0) return;

        const latest = sessions[0]; // most recent chat session

        // 2) Load messages for that session
        const res2 = await fetch(`/api/chat/session?id=${latest.id}`, {
          method: "GET",
          headers,
          credentials: "include",
        });

        if (!res2.ok) return;

        const data = await res2.json();

        if (Array.isArray(data.messages)) {
          setMessages(
            data.messages.map((m: any) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            })),
          );
          setSessionId(data.id);
        }
      } catch (e) {
        console.error("Failed to load last chat session", e);
      }
    };

    loadLastSession();
  }, []);

  const fetchSessions = async () => {
    try {
      if (typeof window === "undefined") return;
      setIsLoadingSessions(true);
      let headers: HeadersInit = { "Content-Type": "application/json" };
      const token = localStorage.getItem("token");
      if (token) {
        headers = {
          ...headers,
          Authorization: `Bearer ${token}`,
        };
      }
      const res = await fetch("/api/chat/sessions", {
        method: "GET",
        headers,
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(
          data.map((s: any) => ({
            id: s.id,
            title: s.title,
            createdAt: s.createdAt,
          })),
        );
      }
    } catch (e) {
      console.error("Failed to load chat sessions", e);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Load user's saved recipes so they can attach one into the chat
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        if (typeof window === "undefined") return;
        setIsLoadingRecipes(true);
        const token = localStorage.getItem("token");
        const headers: HeadersInit = token
          ? {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            }
          : {
              "Content-Type": "application/json",
            };

        let res = await fetch("/api/user/recipes", {
          method: "GET",
          headers,
          credentials: "include",
        });
        if (res.status === 404 || res.status === 405) {
          res = await fetch("/api/recipes", {
            method: "GET",
            headers,
            credentials: "include",
          });
        }
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setRecipes(data);
        }
      } catch (e) {
        console.error("Failed to load recipes for chat:", e);
      } finally {
        setIsLoadingRecipes(false);
      }
    };

    fetchRecipes();
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setError(null);

    // Add user message optimistically
    const newUserMessage: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare short history for the API (last 10 turns)
      const historyForApi = updatedMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
          headers = {
            ...headers,
            Authorization: `Bearer ${token}`,
          };
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: trimmed,
          history: historyForApi,
          attachedRecipe: attachedRecipe
            ? {
                name: attachedRecipe.name,
                ingredients: attachedRecipe.ingredients,
                instructions: attachedRecipe.instructions,
                nutrition: attachedRecipe.nutrition,
                cookingTime: attachedRecipe.cookingTime,
                cost: attachedRecipe.cost,
              }
            : null,
          sessionId,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to get reply from assistant.");
      }

      const data = await res.json();
      const replyText: string =
        data?.reply ||
        "Sorry, I couldn't generate a response right now. Please try again.";

      // If backend created or returned a chat session, remember its id
      if (typeof data.sessionId === "number") {
        setSessionId((prev) => (prev ?? data.sessionId));
      }

      const newAssistantMessage: ChatMessage = {
        role: "assistant",
        content: replyText,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to send message. Please try again.");
      // Optionally add an assistant message with the error
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong while processing your message. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    e,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setSessionId(null);
    setAttachedRecipe(null);
    setError(null);
    setRenamingId(null);
    setRenameValue("");
    setMessages([
      {
        role: "assistant",
        content:
          "Hi! I’m your nutrition assistant. You can ask me about healthy eating, macros, your meal plan, or how to adjust meals to your goals. 😊",
      },
    ]);
  };
  const handleStartRename = (id: number, title: string | null) => {
    setRenamingId(id);
    setRenameValue(title ?? "");
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const handleSubmitRename = async (id: number) => {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    try {
      let headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
          headers = {
            ...headers,
            Authorization: `Bearer ${token}`,
          };
        }
      }
      const res = await fetch(`/api/chat/session?id=${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to rename chat.");
      }
      const updated = await res.json();
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: updated.title ?? trimmed } : s)),
      );
      setRenamingId(null);
      setRenameValue("");
    } catch (e) {
      console.error("Failed to rename chat session", e);
    }
  };

  const handleDeleteSession = async (id: number) => {
    try {
      let headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
          headers = {
            ...headers,
            Authorization: `Bearer ${token}`,
          };
        }
      }
      const res = await fetch(`/api/chat/session?id=${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to delete chat.");
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sessionId === id) {
        handleNewChat();
      }
    } catch (e) {
      console.error("Failed to delete chat session", e);
    }
  };

  const handleSelectSession = async (id: number) => {
    try {
      setIsLoading(true);
      setError(null);
      let headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
          headers = {
            ...headers,
            Authorization: `Bearer ${token}`,
          };
        }
      }
      const res = await fetch(`/api/chat/session?id=${id}`, {
        method: "GET",
        headers,
        credentials: "include",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to load chat session.");
      }
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        setMessages(
          data.messages.map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        );
        setSessionId(data.id);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load chat session.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Navbar />

      <main className="flex-1 min-h-0 flex justify-center px-4 py-6 overflow-hidden">
        <div className="w-full max-w-5xl flex gap-4 min-h-0 h-full">
          {/* Sidebar with chat history */}
          <aside className="hidden sm:flex flex-col w-64 bg-white rounded-2xl shadow-md border p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">
                Chat history
              </h2>
              <button
                type="button"
                onClick={handleNewChat}
                className="text-xs px-2 py-1 rounded-md bg-purple-600 text-white hover:bg-purple-700"
              >
                New
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {isLoadingSessions && (
                <div className="text-xs text-gray-500">Loading chats...</div>
              )}
              {!isLoadingSessions && sessions.length === 0 && (
                <div className="text-xs text-gray-500">
                  No chats yet. Start a new conversation.
                </div>
              )}
              {!isLoadingSessions &&
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`w-full px-2 py-1.5 rounded-md text-xs flex items-center gap-1 ${
                      sessionId === s.id
                        ? "bg-purple-100 text-purple-800"
                        : "hover:bg-gray-100 text-gray-800"
                    }`}
                  >
                    {renamingId === s.id ? (
                      <input
                        className="flex-1 bg-white border border-purple-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSubmitRename(s.id);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            handleCancelRename();
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectSession(s.id)}
                        className="flex-1 text-left"
                      >
                        <span className="line-clamp-2">{s.title}</span>
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                      {renamingId === s.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSubmitRename(s.id)}
                            className="text-[10px] px-1 py-0.5 rounded bg-purple-600 text-white hover:bg-purple-700"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelRename}
                            className="text-[10px] px-1 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartRename(s.id, s.title)}
                            className="text-[11px] px-1 py-0.5 rounded hover:bg-gray-200"
                            title="Rename chat"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(s.id)}
                            className="text-[11px] px-1 py-0.5 rounded hover:bg-gray-200 text-red-600"
                            title="Delete chat"
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </aside>

          {/* Main chat panel */}
          <div className="flex-1 h-full bg-white rounded-2xl shadow-md border p-4 sm:p-6 flex flex-col min-h-0 overflow-hidden">
            <header className="mb-4">
              <h1 className="text-2xl font-semibold text-gray-900">
                Nutrition Chatbot
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Ask about your meals, goals, macros, or healthy habits. I’ll use
                your profile data when available.{" "}
                <span className="font-semibold">
                  This is not medical advice – always consult a doctor for
                  health conditions.
                </span>
              </p>
            </header>

            <div
              ref={chatContainerRef}
              className="flex-1 min-h-0 overflow-y-auto border rounded-xl p-3 space-y-3 bg-gray-50"
            >
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-purple-600 text-white rounded-br-sm"
                        : "bg-white border text-gray-900 rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-2 text-sm text-red-600">
                {typeof error === "string" ? error : "Something went wrong."}
              </div>
            )}

            {attachedRecipe && (
              <div className="mt-3 mb-1 flex items-center justify-between text-xs sm:text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <div>
                  <span className="font-medium text-green-800">
                    Attached recipe:
                  </span>{" "}
                  <span className="text-green-900">
                    {attachedRecipe.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedRecipe(null)}
                  className="text-green-700 hover:text-green-900 text-xs underline"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="mt-3 mb-1">
              <button
                type="button"
                onClick={() => setShowRecipePicker((prev) => !prev)}
                className="text-xs sm:text-sm px-3 py-1 rounded-full border border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                {showRecipePicker
                  ? "Hide recipes"
                  : "Attach recipe from My Recipes"}
              </button>
              {showRecipePicker && (
                <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg bg-white p-2 text-sm">
                  {isLoadingRecipes && (
                    <div className="text-gray-500 text-xs">
                      Loading recipes...
                    </div>
                  )}
                  {!isLoadingRecipes && recipes.length === 0 && (
                    <div className="text-gray-500 text-xs">
                      No saved recipes found. Save some recipes first.
                    </div>
                  )}
                  {!isLoadingRecipes &&
                    recipes.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setAttachedRecipe(r);
                          setShowRecipePicker(false);
                        }}
                        className="w-full text-left px-2 py-1 rounded hover:bg-purple-50 flex justify-between items-center"
                      >
                        <span className="font-medium text-gray-800 line-clamp-1">
                          {r.name}
                        </span>
                        {r.nutrition?.calories != null && (
                          <span className="text-xs text-gray-500 ml-2">
                            {r.nutrition.calories} kcal
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your question
              </label>
              <div className="flex gap-2">
                <textarea
                  className="flex-1 min-h-[60px] max-h-40 border rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Example: Is this breakfast okay for my goal to lose weight? Or: Can you help me adjust my dinner to be higher in protein?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="self-end px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}