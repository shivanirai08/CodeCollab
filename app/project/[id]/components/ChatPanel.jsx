"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X, Maximize2, Minimize2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import DeleteModal from "@/components/ui/DeleteModal";

export default function ChatPanel({ isChatOpen, onClose, projectId, realtimeEnabled }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, messageId: null,});
  const messagesEndRef = useRef(null);
  const hasLoadedMessages = useRef(false);
  const processedMessageIds = useRef(new Set());
  const isChatOpenRef = useRef(isChatOpen);

  // Keep chat open state in sync with ref
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  // Get current user from Redux
  const currentUser = useSelector((state) => ({
    id: state.user.id,
    username: state.user.userName,
    avatar_url: state.user.avatar_url,
  }));

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /**
   * Handle new message from real-time subscription
   * Prevents duplicate message processing using a Set of processed IDs
   * Auto-scrolls to bottom when chat is open
   */
  const handleNewMessage = useCallback((newMessage) => {
    // Prevent duplicate processing (important for avoiding duplicate toasts/renders)
    if (processedMessageIds.current.has(newMessage.id)) {
      return;
    }

    processedMessageIds.current.add(newMessage.id);

    // Add message to state if not already present
    setMessages((prev) => {
      if (prev.some(msg => msg.id === newMessage.id)) {
        return prev;
      }
      return [...prev, newMessage];
    });

    // Show toast notification for messages from other users
    if (newMessage.user_id !== currentUser.id) {
      toast.info(`New message from ${newMessage.username}`, {
        description: newMessage.message.length > 50 
          ? newMessage.message.substring(0, 50) + '...' 
          : newMessage.message,
        duration: 3000,
      });
    }

    // Auto-scroll to bottom on new message if chat is open
    if (isChatOpenRef.current) {
      setTimeout(scrollToBottom, 100);
    }
  }, [currentUser.id]);

  // Initialize realtime chat hook
  const { fetchMessages, sendMessage, deleteMessage } = useRealtimeChat(
    projectId,
    realtimeEnabled,
    handleNewMessage
  );

  /**
   * Load initial chat messages when chat panel opens
   * Fetches all existing messages from database only once
   * Marks fetched messages as processed to prevent duplicate handling
   */
  useEffect(() => {
    if (isChatOpen && projectId && realtimeEnabled && !hasLoadedMessages.current) {
      setIsLoading(true);
      fetchMessages().then((data) => {
        // Mark all fetched messages as processed to prevent duplicate real-time events
        data.forEach(msg => {
          processedMessageIds.current.add(msg.id);
        });

        setMessages(data);
        hasLoadedMessages.current = true;
        setIsLoading(false);
        setTimeout(scrollToBottom, 100);
      });
    } else if (isChatOpen && hasLoadedMessages.current) {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChatOpen, projectId, realtimeEnabled]); // fetchMessages intentionally excluded - it's stable and we only want to fetch once

  // Cleanup processed IDs when component unmounts
  useEffect(() => {
    return () => {
      processedMessageIds.current.clear();
    };
  }, []);

  const handleSendMessage = async () => {
    const message = inputValue.trim();
    if (!message || !currentUser.id) {
      return;
    }

    setInputValue("");

    const result = await sendMessage(
      message,
      currentUser.id,
      currentUser.username || 'Anonymous',
      currentUser.avatar_url
    );

    if (!result.success) {
      toast.error('Failed to send message', {
        description: result.error,
      });
      setInputValue(message);
    }
  };

  const handleDeleteClick = (messageId) => {
    setDeleteModal({
      isOpen: true,
      messageId: messageId,
    });
  };

  const handleConfirmDelete = async () => {
    const messageId = deleteModal.messageId;
    
    if (!messageId) return;

    const result = await deleteMessage(messageId);

    if (result.success) {
      setMessages((prev) => prev.filter(msg => msg.id !== messageId));
      toast.success('Message deleted');
    } else {
      toast.error('Failed to delete message', {
        description: result.error,
      });
    }

    setDeleteModal({
      isOpen: false,
      messageId: null,
    });
  };

  const handleCancelDelete = () => {
    setDeleteModal({
      isOpen: false,
      messageId: null,
    });
  };

  return (
    <>
      {/* Mobile Overlay - Only show when expanded */}
      {isChatOpen && isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Chat Panel */}
      <div
        className={cn(
          "flex flex-col overflow-hidden bg-[#19191F] transition-all duration-300 shrink-0 rounded-t-3xl lg:rounded-sm",
          "hidden lg:flex h-full",  // Desktop behavior
          isChatOpen ? "lg:w-72" : "lg:w-0",
          "fixed lg:relative z-50 lg:inset-auto bottom-0 left-0 right-0",     // Mobile behavior - hidden by default
          isChatOpen ? "flex" : "hidden lg:flex",
          isExpanded ? "h-[90vh]" : "h-[50vh] md:h-full"    // Height based on expansion state
        )}
      >
        {/* Header with drag indicator for mobile */}
        <div className="flex flex-col">
          <div className="lg:hidden flex justify-center pt-2 pb-1">
            <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#36363E] px-4 py-3">
            <div className="text-sm font-semibold text-[#E1E1E6]">Chats</div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>

              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-sm text-gray-400 text-center mt-8">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-gray-400 text-center mt-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOwnMessage = msg.user_id === currentUser.id;
                const messageTime = new Date(msg.created_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "group flex gap-2",
                      isOwnMessage ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {msg.avatar_url ? (
                        <img
                          src={msg.avatar_url}
                          alt={msg.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                          {msg.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={cn("flex flex-col gap-1 max-w-[75%]", isOwnMessage ? "items-end" : "items-start")}>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="font-medium">{msg.username}</span>
                        <span>{messageTime}</span>
                      </div>
                      <div
                        className={cn(
                          "relative px-3 py-2 rounded-lg text-sm break-words",
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-[#2A2A30] text-[#E1E1E6]"
                        )}
                      >
                        {msg.message}

                        {/* Delete button for own messages */}
                        {isOwnMessage && (
                          <button
                            onClick={() => handleDeleteClick(msg.id)}
                            className="absolute -right-8 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded cursor-pointer"
                            title="Delete message"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex gap-2 border-t border-[#36363E] p-3">
          <Input
            type="text"
            placeholder="Type message.."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="shrink-0"
          >
            Send
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        message="Are you sure you want to delete this message? This action cannot be undone."
      />
    </>
  );
}
