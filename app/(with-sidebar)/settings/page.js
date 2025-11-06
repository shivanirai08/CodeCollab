"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SettingsPage() {
  const [username, setUsername] = useState("shivani123")
  const [theme, setTheme] = useState("dark")

  const handleSave = () => {
    alert("Settings saved")
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile and preferences
        </p>
      </div>

      <div className="space-y-6 bg-card border border-border rounded-xl p-6 shadow-sm">
        {/* Profile */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Username</label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
        </div>

        {/* Theme */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Theme</label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger>
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4">
          <Button className="w-full sm:w-auto" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
