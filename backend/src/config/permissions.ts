// 2-TIER ACCESS ARCHITECTURE:
// Tier 1: Super Admin / Builder Admin -> Full control (Uploads, Thresholds, PO Approvals, Checklist Creation, Settings)
// Tier 2: Normal User -> Standard Operational Read/Action (View docs, view drawings, submit daily reports, view inventory, query RAG)

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin': ['*'],
  'Builder Admin': ['*'],
  'Normal User': [
    'document.view',
    'drawing.view',
    'inventory.view',
    'flat.view',
    'customer.view',
    'demand.view',
    'payment.view',
    'collection.view',
    'reports.view',
    'contractor.view',
    'compliance.view',
    'compliance.edit',
    'po.view',
    'askproject.query',
  ],
};

export function hasPermission(userRole: string, requiredPermission: string): boolean {
  if (['Super Admin', 'Builder Admin'].includes(userRole)) return true;
  const permissions = ROLE_PERMISSIONS['Normal User'] || [];
  if (permissions.includes('*')) return true;
  return permissions.includes(requiredPermission);
}

export function isAdminRole(userRole: string): boolean {
  return ['Super Admin', 'Builder Admin'].includes(userRole);
}
