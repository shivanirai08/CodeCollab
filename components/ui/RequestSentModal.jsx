"use client";

import { CheckCircle2, Mail, LayoutDashboard, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RequestSentModal({
  isOpen,
  projectName,
  onStay,
  onDashboard,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/15 via-background to-background px-6 py-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            Request sent
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your request to join{" "}
            <span className="font-medium text-foreground">
              {projectName ? `"${projectName}"` : "this private project"}
            </span>{" "}
            has been sent successfully.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                We&apos;ll update you by email and in this browser as soon as
                the owner accepts your request.
              </p>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <Hourglass className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                You can stay here if you want to send another request or review
                the project code.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={onDashboard} className="flex-1">
              <LayoutDashboard className="h-4 w-4" />
              Move to Dashboard
            </Button>
            <Button onClick={onStay} variant="outline" className="flex-1">
              Stay on this page
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
