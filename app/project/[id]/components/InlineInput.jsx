"use client"

import { useState, useEffect, useRef } from "react"
import { HiOutlineFolder, HiOutlineDocumentText } from "react-icons/hi"

export default function InlineInput({ type, onSubmit, onCancel, initialValue }) {
  const [value, setValue] = useState(initialValue || "")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const validateFileName = (name) => {
    const fileRegex = /^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*\.[a-zA-Z0-9]+$/
    
    if (!fileRegex.test(name)) {
      return "File name must include text before the extension (e.g. file.txt)."
    }
    
    if (name.length > 20) {
      return "File name is too long (max 20 characters)"
    }

    // Check for valid characters only
    if (!/^[a-zA-Z0-9_.\-]+$/.test(name)) {
      return "File name must include only A–Z, 0–9, _, -, or ."
    }
    
    // extension checks
    const lastDotIndex = name.lastIndexOf(".")
    if (lastDotIndex === 0 || lastDotIndex === name.length - 1) {
      return "Invalid file name format"
    }
    
    const beforeExtension = name.substring(0, lastDotIndex)
    if (beforeExtension.length === 0) {
      return "File name must include text before the extension"
    }
    
    return null
  }

  const validateFolderName = (name) => {
    const folderRegex = /^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/
    
    if (!folderRegex.test(name)) {
      return "Folder name must start with A–Z, 0–9, or _ and use only letters, digits, _, or -."
    }
    
    if (name.length === 0) {
      return "Folder name cannot be empty"
    }
    
    if (name.length > 20) {
      return "Folder name is too long (max 20 characters)"
    }
    
    // Reserved names check
    const reserved = ["con", "prn", "aux", "nul", "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9", "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9"]
    if (reserved.includes(name.toLowerCase())) {
      return "This folder name is reserved by the system"
    }
    
    return null
  }

  const handleSubmit = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    const trimmedValue = value.trim();
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

    if (trimmedValue) {
      setIsSubmitting(true);
      try {
        await onSubmit(trimmedValue);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      onCancel();
    }
  };

  
  const handleKeyDown = (e) => {
    if (isSubmitting) {
      e.preventDefault();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel()
    }
  }

  const handleChange = (e) => {
    setValue(e.target.value)
    if (error) setError("") // Clear error on change
  }

  const handleBlur = () => {
    if (isSubmitting) {
      return;
    }

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

    // Small delay to allow click events to register
    setTimeout(() => {
      const trimmedValue = value.trim();
      if (trimmedValue && !isSubmitting) {
        handleSubmit();
      } else if (!isSubmitting) {
        onCancel();
      }
    }, 150);
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