import { createAdminClient } from "@/lib/supabase/admin";

export const MEMBER_ROLE = {
  OWNER: "owner",
  COLLABORATOR: "collaborator",
  VIEWER: "viewer",
};

export const JOIN_REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export function normalizeMemberRole(role) {
  if (!role) {
    return null;
  }

  const normalized = String(role).trim().toLowerCase();

  if (normalized === "editor") {
    return MEMBER_ROLE.COLLABORATOR;
  }

  if (Object.values(MEMBER_ROLE).includes(normalized)) {
    return normalized;
  }

  return null;
}

export function toDatabaseMemberRole(role) {
  const normalized = normalizeMemberRole(role);
  return normalized || MEMBER_ROLE.COLLABORATOR;
}

export function normalizeAccessType(accessType) {
  if (!accessType) {
    return null;
  }

  const normalized = String(accessType).trim().toLowerCase();

  if (normalized === "editor") {
    return MEMBER_ROLE.COLLABORATOR;
  }

  if (
    normalized === MEMBER_ROLE.COLLABORATOR ||
    normalized === MEMBER_ROLE.VIEWER
  ) {
    return normalized;
  }

  return null;
}

export function toDatabaseAccessType(accessType) {
  const normalized = normalizeAccessType(accessType);
  return normalized || MEMBER_ROLE.COLLABORATOR;
}

export function getRoleCapabilities(role) {
  const normalizedRole = normalizeMemberRole(role);
  const isOwner = normalizedRole === MEMBER_ROLE.OWNER;
  const isCollaborator = normalizedRole === MEMBER_ROLE.COLLABORATOR;
  const isViewer = normalizedRole === MEMBER_ROLE.VIEWER;

  return {
    role: normalizedRole || null,
    isOwner,
    isCollaborator,
    isViewer,
    isMember: Boolean(normalizedRole),
    canEdit: isOwner || isCollaborator,
    canView: isOwner || isCollaborator || isViewer,
  };
}

export async function getProjectMembership(projectId, userId) {
  if (!projectId || !userId) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("project_members")
    .select("id, role, joined_at")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    ...data,
    role: normalizeMemberRole(data.role),
  };
}

export async function getProjectContext(projectId, userId = null) {
  const admin = createAdminClient();

  const { data: project, error } = await admin
    .from("projects")
    .select("id, title, description, visibility, join_code, owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load project");
  }

  if (!project) {
    return null;
  }

  const membership = userId
    ? await getProjectMembership(projectId, userId)
    : null;

  const capabilities = getRoleCapabilities(
    membership?.role || (project.owner_id === userId ? MEMBER_ROLE.OWNER : null)
  );

  const canView = project.visibility === "public" || capabilities.canView;

  return {
    project,
    membership,
    permissions: {
      ...capabilities,
      canView,
    },
  };
}

export async function getNodeWithProject(nodeId) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("nodes")
    .select("*, projects!inner(id, title, owner_id, visibility)")
    .eq("id", nodeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load node");
  }

  return data;
}

export async function ensureProjectAccess({
  projectId,
  userId,
  requireView = true,
  requireEdit = false,
}) {
  const context = await getProjectContext(projectId, userId);

  if (!context) {
    return {
      ok: false,
      status: 404,
      error: "Project not found",
    };
  }

  if (requireEdit && !context.permissions.canEdit) {
    return {
      ok: false,
      status: context.permissions.canView ? 403 : 401,
      error: context.permissions.canView
        ? "You do not have permission to edit this project"
        : "You must be a project member to edit this project",
      context,
    };
  }

  if (requireView && !context.permissions.canView) {
    return {
      ok: false,
      status: 403,
      error: "You do not have permission to view this project",
      context,
    };
  }

  return {
    ok: true,
    context,
  };
}
