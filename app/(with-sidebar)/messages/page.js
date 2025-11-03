"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"

export default function MessagesPage() {
  const [chats, setChats] = useState([
    {
      id: "p1",
      name: "AI Research Tool (Project Chat)",
      lastMessage: "Shivani: Let's push the changes today",
    },
    {
      id: "u1",
      name: "Personal Chat – Ankit",
      lastMessage: "Ankit: Can you review my PR?",
    },
  ])

  const [selectedChat, setSelectedChat] = useState(null)

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Sidebar list of chats */}
      <div
        className={`${
          selectedChat ? "hidden md:flex" : "flex"
        } w-full md:w-1/3 border-r border-white/10 p-3 md:p-4 space-y-2 flex-col`}
      >
        <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Chats</h2>
        {chats.map((chat) => (
          <button
            key={chat.id}
            className="w-full text-left p-3 rounded-lg hover:bg-[#161A38] transition-colors"
            onClick={() => setSelectedChat(chat)}
          >
            <div className="font-medium text-sm md:text-base">{chat.name}</div>
            <div className="text-xs md:text-sm text-gray-400 truncate">
              {chat.lastMessage}
            </div>
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div
        className={`${
          selectedChat ? "flex" : "hidden md:flex"
        } flex-1 flex-col`}
      >
        {selectedChat ? (
          <>
            {/* Chat Header - Mobile Only */}
            <div className="md:hidden flex items-center gap-3 p-3 border-b border-white/10">
              <button
                onClick={() => setSelectedChat(null)}
                className="p-2 hover:bg-[#161A38] rounded-lg transition-colors"
              >
                <ArrowLeft className="size-5" />
              </button>
              <h3 className="font-semibold text-base truncate">{selectedChat.name}</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 p-3 md:p-4 overflow-y-auto">
              <div className="space-y-3">
                <div className="text-gray-300 text-sm md:text-base">
                  <b>Shivani:</b> Let&apos;s finalize UI.
                </div>
                <div className="text-gray-300 text-sm md:text-base">
                  <b>Ankit:</b> Sure, working on it.
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-white/10 p-3 flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 rounded-lg bg-[#0E1220] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button className="px-3 md:px-4 py-2 bg-primary text-white rounded-lg text-sm md:text-base hover:opacity-90 transition-opacity">
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-gray-400">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  )
}
