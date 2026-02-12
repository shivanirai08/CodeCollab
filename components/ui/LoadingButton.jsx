"use client";

import { useState } from "react";
import { Button } from "./button";
import { Loader2 } from "lucide-react";

function LoadingButton({
  onClick,
  children,
  loading: externalLoading = false,
  loadingText,
  disabled = false,
  className = "",
  type,
  ...props
}) {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = externalLoading || internalLoading;

  const handleClick = async (e) => {
    // If it's a submit button, let the form handle it
    if (type === "submit") {
      return;
    }
    
    if (!onClick || isLoading || disabled) return;

    setInternalLoading(true);
    try {
      const result = onClick(e);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      console.error("Button action error:", error);
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Button
      {...props}
      type={type}
      onClick={handleClick}
      disabled={isLoading || disabled}
      className={`${className} ${isLoading ? "opacity-80" : ""}`}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText && <span>{loadingText}</span>}
        </div>
      ) : (
        children
      )}
    </Button>
  );
}

export default LoadingButton;
export { LoadingButton };
