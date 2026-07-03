"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileDiff,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

function getFileStatusMeta(file) {
  if (file.status === "untracked") {
    return { letter: "U", className: "text-sky-400" };
  }
  if (file.status === "conflicted") {
    return { letter: "!", className: "text-rose-400" };
  }
  if (file.indexStatus === "A" || file.workingTreeStatus === "A") {
    return { letter: "A", className: "text-emerald-400" };
  }
  if (file.indexStatus === "D" || file.workingTreeStatus === "D") {
    return { letter: "D", className: "text-rose-400" };
  }
  if (file.indexStatus === "R" || file.workingTreeStatus === "R") {
    return { letter: "R", className: "text-violet-400" };
  }
  return { letter: "M", className: "text-amber-400" };
}

function IconActionButton({
  title,
  onClick,
  disabled,
  loading,
  destructive = false,
  children,
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={title}
      aria-label={title}
      className={`h-6 w-6 ${
        destructive
          ? "text-[#8B909A] hover:bg-[#2A171B] hover:text-rose-300"
          : "text-[#8B909A] hover:bg-[#1E1E24] hover:text-white"
      }`}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : children}
    </Button>
  );
}

function SourceSectionHeader({
  title,
  count,
  expanded,
  onToggle,
  actions,
  workingTreeActionKey,
}) {
  const [headerActive, setHeaderActive] = useState(false);
  const showActions = headerActive;

  return (
    <div
      tabIndex={-1}
      className={`flex cursor-pointer items-center gap-1 border-b border-[#1F1F24] bg-[#101014] px-2 py-1.5 transition-colors ${
        headerActive ? "bg-[#16161C]" : "hover:bg-[#16161C]"
      }`}
      onMouseEnter={() => setHeaderActive(true)}
      onMouseLeave={() => setHeaderActive(false)}
      onFocus={() => setHeaderActive(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setHeaderActive(false);
        }
      }}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-[#6B7280]" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-[#6B7280]" />
        )}
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9BA0AA]">
          {title}
        </span>
        <span className="text-[11px] text-[#6B7280]">({count})</span>
      </button>
      {actions?.length ? (
        <div
          className={`flex shrink-0 items-center gap-0.5 transition-opacity ${
            showActions ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {actions.map((action) => (
            <IconActionButton
              key={action.key}
              title={action.title}
              onClick={action.onClick}
              disabled={Boolean(workingTreeActionKey) || action.disabled}
              loading={workingTreeActionKey === action.loadingKey}
              destructive={action.destructive}
            >
              {action.icon}
            </IconActionButton>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SourceFileRow({
  file,
  variant,
  canEdit,
  workingTreeActionKey,
  onOpen,
  onStage,
  onUnstage,
  onDiscard,
}) {
  const statusMeta = getFileStatusMeta(file);
  const fileKey = `file:${file.path}`;
  const isStaging = workingTreeActionKey === `${fileKey}:stage`;
  const isUnstaging = workingTreeActionKey === `${fileKey}:unstage`;
  const isDiscarding = workingTreeActionKey === `${fileKey}:discard`;

  return (
    <div className="group flex items-center gap-1 px-2 py-1 text-sm hover:bg-[#17171D]">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={`w-3 shrink-0 text-center text-[11px] font-semibold ${statusMeta.className}`}
        >
          {statusMeta.letter}
        </span>
        <span className="truncate text-[#E5E7EB]" title={file.path}>
          {file.path}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <IconActionButton
          title="Open diff"
          onClick={() => onOpen(file.path)}
          disabled={Boolean(workingTreeActionKey)}
        >
          <FileDiff className="size-3.5" />
        </IconActionButton>

        {canEdit && variant === "staged" ? (
          <>
            <IconActionButton
              title="Unstage"
              onClick={() => onUnstage(file.path)}
              disabled={Boolean(workingTreeActionKey)}
              loading={isUnstaging}
            >
              <Minus className="size-3.5" />
            </IconActionButton>
            <IconActionButton
              title="Discard changes"
              onClick={() => onDiscard(file.path)}
              disabled={Boolean(workingTreeActionKey)}
              loading={isDiscarding}
              destructive
            >
              <RotateCcw className="size-3.5" />
            </IconActionButton>
          </>
        ) : null}

        {canEdit && variant === "changes" ? (
          <>
            <IconActionButton
              title="Stage"
              onClick={() => onStage(file.path)}
              disabled={Boolean(workingTreeActionKey) || file.status === "conflicted"}
              loading={isStaging}
            >
              <Plus className="size-3.5" />
            </IconActionButton>
            <IconActionButton
              title="Discard changes"
              onClick={() => onDiscard(file.path)}
              disabled={Boolean(workingTreeActionKey)}
              loading={isDiscarding}
              destructive
            >
              <RotateCcw className="size-3.5" />
            </IconActionButton>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function GitSourceControlList({
  stagedFiles,
  unstagedFiles,
  canEdit,
  workingTreeActionKey,
  onOpen,
  onStageFile,
  onUnstageFile,
  onDiscardFile,
  onStageAll,
  onUnstageAll,
  onDiscardAllChanges,
  onDiscardAllStaged,
}) {
  const [stagedExpanded, setStagedExpanded] = useState(true);
  const [changesExpanded, setChangesExpanded] = useState(true);
  const [confirmState, setConfirmState] = useState(null);

  const requestConfirm = (config) => {
    setConfirmState(config);
  };

  const stagedSectionActions =
    canEdit && stagedFiles.length > 0
      ? [
          {
            key: "unstage-all",
            title: "Unstage all",
            loadingKey: "bulk:unstage-all",
            icon: <Minus className="size-3.5" />,
            onClick: () => onUnstageAll(),
          },
          {
            key: "discard-all-staged",
            title: "Discard all staged",
            loadingKey: "bulk:discard-all-staged",
            icon: <RotateCcw className="size-3.5" />,
            destructive: true,
            onClick: () =>
              requestConfirm({
                title: "Discard all staged changes?",
                message:
                  "This will remove every staged file from the index and restore them to the last commit.",
                confirmLabel: "Discard staged",
                onConfirm: () => {
                  setConfirmState(null);
                  onDiscardAllStaged();
                },
              }),
          },
        ]
      : [];

  const changesSectionActions =
    canEdit && unstagedFiles.length > 0
      ? [
          {
            key: "stage-all",
            title: "Stage all",
            loadingKey: "bulk:stage-all",
            icon: <Plus className="size-3.5" />,
            onClick: () => onStageAll(),
          },
          {
            key: "discard-all",
            title: "Discard all changes",
            loadingKey: "bulk:discard-all-changes",
            icon: <RotateCcw className="size-3.5" />,
            destructive: true,
            onClick: () =>
              requestConfirm({
                title: "Discard all changes?",
                message:
                  "This will permanently revert every unstaged change and remove untracked files.",
                confirmLabel: "Discard all",
                onConfirm: () => {
                  setConfirmState(null);
                  onDiscardAllChanges();
                },
              }),
          },
        ]
      : [];

  return (
    <>
      <ConfirmDialog
        isOpen={Boolean(confirmState)}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel || "Confirm"}
        confirmClassName="bg-rose-600 hover:bg-rose-500"
        loading={Boolean(workingTreeActionKey?.startsWith("bulk:"))}
      />

      <div className="border-t border-[#24242A]">
        <div>
          <SourceSectionHeader
            title="Staged Changes"
            count={stagedFiles.length}
            expanded={stagedExpanded}
            onToggle={() => setStagedExpanded((value) => !value)}
            actions={stagedSectionActions}
            workingTreeActionKey={workingTreeActionKey}
          />
          {stagedExpanded ? (
            stagedFiles.length > 0 ? (
              <div className="py-0.5">
                {stagedFiles.map((file) => (
                  <SourceFileRow
                    key={`staged-${file.path}`}
                    file={file}
                    variant="staged"
                    canEdit={canEdit}
                    workingTreeActionKey={workingTreeActionKey}
                    onOpen={onOpen}
                    onStage={onStageFile}
                    onUnstage={onUnstageFile}
                    onDiscard={(path) =>
                      requestConfirm({
                        title: "Discard staged changes?",
                        message: `This will restore "${path}" to the last commit and remove it from staging.`,
                        confirmLabel: "Discard",
                        onConfirm: () => {
                          setConfirmState(null);
                          onDiscardFile(path);
                        },
                      })
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="px-3 py-2 text-xs text-[#6B7280]">No staged changes</p>
            )
          ) : null}
        </div>

        <div>
          <SourceSectionHeader
            title="Changes"
            count={unstagedFiles.length}
            expanded={changesExpanded}
            onToggle={() => setChangesExpanded((value) => !value)}
            actions={changesSectionActions}
            workingTreeActionKey={workingTreeActionKey}
          />
          {changesExpanded ? (
            unstagedFiles.length > 0 ? (
              <div className="py-0.5 pb-2">
                {unstagedFiles.map((file) => (
                  <SourceFileRow
                    key={`changes-${file.path}`}
                    file={file}
                    variant="changes"
                    canEdit={canEdit}
                    workingTreeActionKey={workingTreeActionKey}
                    onOpen={onOpen}
                    onStage={onStageFile}
                    onUnstage={onUnstageFile}
                    onDiscard={(path) =>
                      requestConfirm({
                        title: "Discard changes?",
                        message: `This will permanently revert changes in "${path}".`,
                        confirmLabel: "Discard",
                        onConfirm: () => {
                          setConfirmState(null);
                          onDiscardFile(path);
                        },
                      })
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="px-3 py-2 text-xs text-[#6B7280]">No changes</p>
            )
          ) : null}
        </div>
      </div>
    </>
  );
}
