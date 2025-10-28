"use client"

import { useState, useEffect, useRef } from "react"
import { HiOutlineFolder, HiOutlineDocumentText } from "react-icons/hi"

export default function InlineInput({ type, onSubmit, onCancel }) {
  const [value, setValue] = useState("")
  const [error, setError] = useState("")
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const validateFileName = (name) => {
    // File must have at least one character before extension
    // Can contain letters, numbers, underscores, hyphens, and dots
    // Must have an extension (at least one char before and after the last dot)
    const fileRegex = /^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*\.[a-zA-Z0-9]+$/
    
    if (!fileRegex.test(name)) {
      return "File name must contain at least one character before extension (e.g., file.txt)"
    }
    
    // Check for valid characters only
    if (!/^[a-zA-Z0-9_.\-]+$/.test(name)) {
      return "File name can only contain letters, numbers, underscores, hyphens, and dots"
    }
    
    // Ensure there's content before the last dot
    const lastDotIndex = name.lastIndexOf(".")
    if (lastDotIndex === 0 || lastDotIndex === name.length - 1) {
      return "Invalid file name format"
    }
    
    const beforeExtension = name.substring(0, lastDotIndex)
    if (beforeExtension.length === 0) {
      return "File name must have at least one character before the extension"
    }
    
    return null
  }

  const validateFolderName = (name) => {
    // Folder can contain letters, numbers, underscores, and hyphens
    // Must start with a letter, number, or underscore
    // Cannot contain dots, spaces, or special characters except underscore and hyphen
    const folderRegex = /^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/
    
    if (!folderRegex.test(name)) {
      return "Folder name must start with a letter, number, or underscore and can only contain letters, numbers, underscores, and hyphens"
    }
    
    if (name.length === 0) {
      return "Folder name cannot be empty"
    }
    
    if (name.length > 255) {
      return "Folder name is too long (max 255 characters)"
    }
    
    // Reserved names check
    const reserved = ["con", "prn", "aux", "nul", "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9", "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9"]
    if (reserved.includes(name.toLowerCase())) {
      return "This folder name is reserved by the system"
    }
    
    return null
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const trimmedValue = value.trim()
      
      if (!trimmedValue) {
        setError("Name cannot be empty")
        return
      }
      
      const validationError = type === "file" 
        ? validateFileName(trimmedValue) 
        : validateFolderName(trimmedValue)
      
      if (validationError) {
        setError(validationError)
        return
      }
      
      setError("")
      onSubmit(trimmedValue)
    } else if (e.key === "Escape") {
      onCancel()
    }
  }

  const handleChange = (e) => {
    setValue(e.target.value)
    if (error) setError("") // Clear error on change
  }

  const handleBlur = () => {
    const trimmedValue = value.trim()
    
    if (!trimmedValue) {
      onCancel()
      return
    }
    
    const validationError = type === "file" 
      ? validateFileName(trimmedValue) 
      : validateFolderName(trimmedValue)
    
    if (validationError) {
      setError(validationError)
      // Don't cancel on blur if there's an error, let user fix it
      inputRef.current?.focus()
      return
    }
    
    setError("")
    onSubmit(trimmedValue)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-2 py-1 bg-[#1A1A20] rounded">
        {type === "folder" ? (
          <HiOutlineFolder size={16} className="flex-shrink-0" />
        ) : (
          <HiOutlineDocumentText size={16} className="flex-shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={type === "folder" ? "folder_name" : "file_name.ext"}
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-[#8D8D98]"
        />
      </div>
      {error && (
        <div className="px-2 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}