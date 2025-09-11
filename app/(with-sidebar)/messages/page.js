"use client"

import { useState } from "react"

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

  return (
    <div className="flex h-full">
      {/* Sidebar list of chats */}
      <div className="w-1/3 border-r border-white/10 p-4 space-y-2">
        <h2 className="text-xl font-semibold mb-4">Chats</h2>
        {chats.map((chat) => (
          <button
            key={chat.id}
            className="w-full text-left p-3 rounded-lg hover:bg-[#161A38]"
          >
            <div className="font-medium">{chat.name}</div>
            <div className="text-sm text-gray-400 truncate">
              {chat.lastMessage}
            </div>
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Replace with live messages */}
          <div className="space-y-3">
            <div className="text-gray-300">
              <b>Shivani:</b> Let's finalize UI.
            </div>
            <div className="text-gray-300">
              <b>Ankit:</b> Sure, working on it.
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 p-3 flex">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 rounded-lg bg-[#0E1220] px-3 py-2 text-sm"
          />
          <button className="ml-2 px-4 py-2 bg-primary text-white rounded-lg">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
