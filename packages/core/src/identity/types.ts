import type { OrganizationRole, ProviderStatus } from "@app/db";

export interface ViewerProvider {
  slug: string;
  displayName: string;
  status: ProviderStatus;
}

export interface ViewerOrganization {
  slug: string;
  name: string;
  role: OrganizationRole;
}

export interface AccountViewer {
  kind: "account";
  userId: string;
  name: string;
  ageConfirmed: boolean;
  provider: ViewerProvider | null;
  organizations: ViewerOrganization[];
}

export type Viewer = { kind: "visitor" } | AccountViewer;

export const VISITOR: Viewer = { kind: "visitor" };
