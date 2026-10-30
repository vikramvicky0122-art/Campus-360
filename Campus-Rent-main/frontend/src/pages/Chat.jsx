import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useChat } from "../context/ChatContext.jsx";
import { sendMessage, joinConversation, leaveConversation, emitTypingStart, emitTypingStop, getSocket } from "../services/chat.js";

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

// Debounce threshold for emitting typing:start (don't re-emit within this window)
const TYPING_DEBOUNCE_MS = 2000;
// Inactivity timeout for auto-stopping typing on the client side
const TYPING_INACTIVITY_MS = 3000;

function Chat() {
  const { user } = useAuth();

  const {
    conversations,
    activeConversation,
    activeConversationId,
    messages,
    isLoading,
    hasMore,
    isFetchingConversations,
    unreadCounts,
    typingUsers,
    onlineUsers,
    selectConversation,
    loadOlderMessages
  } = useChat();

  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const sendErrorTimerRef = useRef(null);
  const endRef = useRef(null);
  const threadRef = useRef(null);
  const joinedRef = useRef(false);

  // Typing debounce refs
  const lastTypingEmitRef = useRef(0);
  const typingInactivityRef = useRef(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(typingInactivityRef.current);
      clearTimeout(sendErrorTimerRef.current);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Join conversation room on selection; re-join on socket (re)connection
  useEffect(() => {
    if (!activeConversationId) return;

    const doJoin = () => {
      joinedRef.current = true;
      joinConversation(activeConversationId).catch((err) => {
        // Benign if socket not yet connected — retried on 'connect' event below
        console.error("Failed to join conversation:", err);
      });
    };

    const socket = getSocket();

    // If socket is already connected, join immediately
    if (socket?.connected) {
      doJoin();
    }

    // Re-join whenever the socket connects (initial connect AND reconnection)
    const handleConnect = () => doJoin();
    socket?.on('connect', handleConnect);

    return () => {
      socket?.off('connect', handleConnect);
      if (joinedRef.current) {
        leaveConversation(activeConversationId).catch(() => {});
        joinedRef.current = false;
      }
    };
  }, [activeConversationId]);

  const handleScroll = useCallback(() => {
    if (!threadRef.current || !hasMore || isLoading) return;
    const { scrollTop } = threadRef.current;
    if (scrollTop < 100) {
      loadOlderMessages();
    }
  }, [hasMore, isLoading, loadOlderMessages]);

  // Emit typing:start with debounce: only once per TYPING_DEBOUNCE_MS window
  // Auto-stops after TYPING_INACTIVITY_MS of inactivity
  const handleTyping = useCallback(() => {
    if (!activeConversationId) return;

    const now = Date.now();
    if (now - lastTypingEmitRef.current > TYPING_DEBOUNCE_MS) {
      lastTypingEmitRef.current = now;
      emitTypingStart(activeConversationId).catch(() => {});
    }

    // Reset inactivity timeout
    if (typingInactivityRef.current) {
      clearTimeout(typingInactivityRef.current);
    }
    typingInactivityRef.current = setTimeout(() => {
      emitTypingStop(activeConversationId).catch(() => {});
    }, TYPING_INACTIVITY_MS);
  }, [activeConversationId]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !activeConversationId || sending) return;

    // Stop typing before sending
    await emitTypingStop(activeConversationId).catch(() => {});
    if (typingInactivityRef.current) {
      clearTimeout(typingInactivityRef.current);
    }
    lastTypingEmitRef.current = 0;

    setSending(true);
    setSendError(null);
    try {
      await sendMessage(activeConversationId, text);
      setDraft("");
    } catch (err) {
      console.error("Failed to send message:", err);
      setSendError(err.message || "Failed to send message. Check your connection.");
      // Auto-clear error after 5 seconds; clear any previous timer first
      clearTimeout(sendErrorTimerRef.current);
      sendErrorTimerRef.current = setTimeout(() => setSendError(null), 5000);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setDraft(e.target.value);
    handleTyping();
  };

  const handleSelect = (conversationId) => {
    selectConversation(conversationId);
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!search) return true;
    const name = conv.otherUser?.fullName?.toLowerCase() || "";
    const title = conv.booking?.listing?.title?.toLowerCase() || "";
    const q = search.toLowerCase();
    return name.includes(q) || title.includes(q);
  });

  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;
    for (const msg of messages) {
      const msgDate = formatDate(msg.createdAt);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: "date", label: msgDate });
      }
      groups.push({ type: "message", data: msg });
    }
    return groups;
  }, [messages]);

  // Determine if the other user is typing in the active conversation
  // Compare against otherUser.id so the current user never sees themselves as typing
  const isOtherTyping = activeConversationId &&
    typingUsers[activeConversationId] &&
    typingUsers[activeConversationId] === activeConversation?.otherUser?.id;

  return (
    <section className="chat-layout" aria-label="Chat area">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-head">
          <div>
            <p className="eyebrow">Messages</p>
            <h3>Campus Chat</h3>
          </div>
        </div>
        <div className="chat-search">
          <input
            type="text"
            placeholder="Search conversations..."
            aria-label="Search conversations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="chat-list">
          {isFetchingConversations ? (
            <div className="chat-empty">
              <span style={{ opacity: 0.5 }}>Loading conversations...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="chat-empty">
              {search
                ? "No conversations match your search."
                : "No conversations yet. Start a booking to begin chatting."}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const lastMsg = conv.lastMessage;
              const preview = lastMsg
                ? lastMsg.content.length > 42
                  ? `${lastMsg.content.slice(0, 42)}...`
                  : lastMsg.content
                : "No messages yet";
              const otherUser = conv.otherUser;
              const unread = unreadCounts[conv.id] || 0;

              return (
                <button
                  key={conv.id}
                  type="button"
                  className={`chat-list-item ${conv.id === activeConversationId ? "active" : ""}`}
                  onClick={() => handleSelect(conv.id)}
                >
                  <span className="chat-avatar">
                    {otherUser?.fullName?.[0] || "?"}
                  </span>
                  <div className="chat-list-meta">
                    <strong>{otherUser?.fullName || "Unknown User"}</strong>
                    <span className="chat-list-preview">{preview}</span>
                  </div>
                  <div className="chat-list-right">
                    {unread > 0 && (
                      <span className="chat-unread-badge">{unread}</span>
                    )}
                    {conv.booking?.listing?.title && (
                      <span className="chat-list-item-label" title={conv.booking.listing.title}>
                        {conv.booking.listing.title}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div className="chat-main">
        <header className="chat-header">
          {activeConversation ? (
            <div className="chat-user">
              <span className="chat-avatar large">
                {activeConversation.otherUser?.fullName?.[0] || "?"}
              </span>
              <div>
                <strong>{activeConversation.otherUser?.fullName || "Unknown User"}</strong>
                <span className={`chat-presence ${onlineUsers[activeConversation.otherUser?.id] ? "online" : "offline"}`}>
                  <span className="chat-presence-dot" />
                  {onlineUsers[activeConversation.otherUser?.id] ? "Online" : "Offline"}
                </span>
                {activeConversation.booking?.listing?.title && (
                  <span className="chat-status">
                    Renting: {activeConversation.booking.listing.title}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="chat-user">
              <div>
                <strong>No conversation selected</strong>
              </div>
            </div>
          )}
        </header>

        <div
          className="chat-thread"
          ref={threadRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
        >
          {isLoading && messages.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
              Loading messages...
            </div>
          )}

          {hasMore && (
            <div style={{ textAlign: "center", padding: "10px" }}>
              <button
                type="button"
                className="chat-link"
                onClick={loadOlderMessages}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Load older messages"}
              </button>
            </div>
          )}

          {!isLoading && messages.length === 0 && activeConversation && (
            <div className="chat-thread-empty">
              <span className="chat-thread-empty-icon" aria-hidden="true">↔</span>
              <p>No messages yet. Say hello!</p>
            </div>
          )}

          {groupedMessages.map((item, idx) =>
            item.type === "date" ? (
              <div key={`date-${idx}`} className="chat-day">
                {item.label}
              </div>
            ) : (
              <div
                key={item.data.id}
                className={`chat-message ${item.data.senderId === user?.id ? "me" : "them"}`}
              >
                <div className="chat-bubble">
                  <p>{item.data.content}</p>
                  <span className="chat-time">{formatTime(item.data.createdAt)}</span>
                </div>
              </div>
            )
          )}

          {isOtherTyping && (
            <div className="chat-typing-indicator" data-testid="typing-indicator">
              {activeConversation?.otherUser?.fullName || "User"} is typing...
            </div>
          )}

          <div ref={endRef} />
        </div>

        {activeConversationId ? (
          <footer className="chat-input-area">
            {sendError && (
              <div className="chat-send-error">
                ⚠️ {sendError}
              </div>
            )}
            <input
              type="text"
              placeholder="Type a message..."
              aria-label="Message input"
              value={draft}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button
              type="button"
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              aria-label="Send message"
            >
              {sending ? "..." : "Send"}
            </button>
          </footer>
        ) : (
          <footer className="chat-input-area chat-input-area-empty">
            <div className="chat-empty-state">
              <span className="chat-empty-icon" aria-hidden="true">✦</span>
              <p>Select a conversation to start messaging</p>
            </div>
          </footer>
        )}
      </div>
    </section>
  );
}

export default Chat;
