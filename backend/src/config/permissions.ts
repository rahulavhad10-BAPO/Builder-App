// 2-TIER ACCESS ARCHITECTURE:
// Tier 1: ADMIN (Super Admin, Builder Admin) -> Full access (Uploads, Thresholds, POs, Approvals, Milestone Assignments, CSV Import)
// Tier 2: STANDARD / OPERATIONAL (Finance, Contractor, Site Engineer, Procurement, Sales, Management, Broker) -> Restricted

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // --- TIER 1: ADMIN (Full Control) ---
  'Super Admin': ['*'],
  'Builder Admin': ['*'],

  // --- TIER 2: STANDARD / OPERATIONAL (Restricted from Uploads, Threshold edits, PO creation/approval) ---
  'Finance': [
    'document.view',
    'drawing.view',
    'inventory.view',
    'flat.view',
    'customer.view',
    'demand.view',
    'payment.view',
    'payment.create',
    'collection.view',
    'reports.view',
    'po.view',
    'askproject.query'
  ],
  'Contractor': [
    'document.view',
    'drawing.view',
    'contractor.view',
    'reports.view',
    'meeting.view',
    'issue.view',
    'issue.edit',
    'askproject.query'
  ],
  'Site Engineer': [
    'document.view',
    'drawing.view',
    'inventory.view',
    'contractor.view',
    'compliance.view',
    'reports.view',
    'meeting.view',
    'issue.view',
    'issue.edit',
    'askproject.query'
  ],
  'Procurement': [
    'inventory.view',
    'po.view',
    'contractor.view',
    'reports.view',
    'askproject.query'
  ],
  'Inventory Manager': [
    'inventory.view',
    'po.view',
    'reports.view',
    'askproject.query'
  ],
  'Sales': [
    'flat.view',
    'customer.view',
    'sales.view',
    'demand.view',
    'reports.view',
    'askproject.query'
  ],
  'CRM/Collections Manager': [
    'flat.view',
    'customer.view',
    'demand.view',
    'payment.view',
    'collection.view',
    'reports.view',
    'askproject.query'
  ],
  'Compliance Manager': [
    'compliance.view',
    'compliance.edit',
    'document.view',
    'reports.view',
    'askproject.query'
  ],
  'Management': [
    'document.view',
    'drawing.view',
    'contractor.view',
    'inventory.view',
    'compliance.view',
    'flat.view',
    'customer.view',
    'demand.view',
    'payment.view',
    'sales.view',
    'collection.view',
    'reports.view',
    'meeting.view',
    'issue.view',
    'askproject.query'
  ],
  'Broker': [
    'flat.view',
    'sales.view',
    'customer.view'
  ]
};

export function hasPermission(userRole: string, requiredPermission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  if (permissions.includes('*')) return true;
  return permissions.includes(requiredPermission);
}

export function isAdminRole(userRole: string): boolean {
  return ['Super Admin', 'Builder Admin'].includes(userRole);
}
