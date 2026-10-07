export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin': ['*'],
  'Builder Admin': [
    'document.view', 'document.upload', 'document.delete',
    'drawing.view', 'drawing.upload',
    'contractor.view', 'contractor.edit',
    'inventory.view', 'inventory.edit',
    'po.create', 'po.approve', 'po.verify',
    'compliance.view', 'compliance.edit',
    'flat.view', 'flat.edit',
    'customer.view', 'customer.edit',
    'demand.view', 'demand.create', 'demand.remind',
    'payment.view', 'payment.create',
    'sales.view', 'sales.edit',
    'collection.view', 'collection.edit',
    'reports.view',
    'meeting.view', 'meeting.edit',
    'issue.view', 'issue.edit',
    'askproject.query',
    'admin.access'
  ],
  'Project Manager': [
    'document.view', 'document.upload',
    'drawing.view', 'drawing.upload',
    'contractor.view', 'contractor.edit',
    'inventory.view',
    'po.create', 'po.approve', 'po.verify',
    'compliance.view', 'compliance.edit',
    'flat.view',
    'customer.view',
    'demand.view',
    'reports.view',
    'meeting.view', 'meeting.edit',
    'issue.view', 'issue.edit',
    'askproject.query'
  ],
  'Site Engineer': [
    'document.view', 'document.upload',
    'drawing.view',
    'contractor.view',
    'inventory.view', 'inventory.edit',
    'compliance.view',
    'reports.view',
    'meeting.view',
    'issue.view', 'issue.edit',
    'askproject.query'
  ],
  'Procurement': [
    'inventory.view', 'inventory.edit',
    'po.create', 'po.approve', 'po.verify',
    'contractor.view',
    'reports.view',
    'askproject.query'
  ],
  'Inventory Manager': [
    'inventory.view', 'inventory.edit',
    'po.create', 'po.verify',
    'reports.view',
    'askproject.query'
  ],
  'Finance': [
    'flat.view',
    'customer.view',
    'demand.view', 'demand.create', 'demand.remind',
    'payment.view', 'payment.create',
    'collection.view', 'collection.edit',
    'reports.view',
    'po.verify',
    'askproject.query'
  ],
  'Sales': [
    'flat.view', 'flat.edit',
    'customer.view', 'customer.edit',
    'sales.view', 'sales.edit',
    'demand.view',
    'payment.view',
    'reports.view',
    'askproject.query'
  ],
  'CRM/Collections Manager': [
    'flat.view',
    'customer.view', 'customer.edit',
    'demand.view', 'demand.create', 'demand.remind',
    'payment.view', 'payment.create',
    'collection.view', 'collection.edit',
    'reports.view',
    'askproject.query'
  ],
  'Compliance Manager': [
    'compliance.view', 'compliance.edit',
    'document.view', 'document.upload',
    'reports.view',
    'askproject.query'
  ],
  'Contractor': [
    'drawing.view',
    'contractor.view',
    'issue.view', 'issue.edit',
    'meeting.view'
  ],
  'Management': [
    'document.view',
    'drawing.view',
    'contractor.view',
    'inventory.view',
    'po.verify',
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
    'sales.view'
  ]
};

export function hasPermission(userRole: string, requiredPermission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  if (permissions.includes('*')) return true;
  return permissions.includes(requiredPermission);
}
