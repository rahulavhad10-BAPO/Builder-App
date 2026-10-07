export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  organizationName?: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  location?: string;
  targetDate?: string;
  status?: string;
}

export interface Flat {
  id: string;
  unitNumber: string;
  projectId: string;
  project?: { name: string; code: string };
  buildingId: string;
  building?: { name: string; code: string };
  floorNumber: number;
  configuration: string;
  carpetArea: number;
  saleableArea: number;
  parking?: string | null;
  basePrice: number;
  otherCharges: number;
  agreementValue: number;
  totalConsideration: number;
  status: string;
  customerId?: string | null;
  customer?: { id: string; name: string; email: string; phone: string } | null;
  salesExecutiveName?: string | null;
  brokerId?: string | null;
  broker?: { id: string; name: string; company: string } | null;
  bookingDate?: string | null;
  agreementDate?: string | null;
  notes?: string | null;
  amountPaid: number;
  outstanding: number;
  collectionPercentage: number;
  overdueAmount: number;
  lastDemand?: {
    id: string;
    demandNumber: string;
    demandType: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    dueDate: string;
    status: string;
    daysOverdue: number;
    lastReminder?: any;
  } | null;
  nextDemand?: {
    id: string;
    demandNumber: string;
    demandType: string;
    totalAmount: number;
    balanceAmount: number;
    dueDate: string;
  } | null;
  next3Demands?: any[];
  totalFutureDemandValue?: number;
  lastPayment?: {
    receiptNumber: string;
    amount: number;
    paymentDate: string;
    paymentMode: string;
  } | null;
  computedPaymentStatus?: string;
}

export interface PaymentDemand {
  id: string;
  demandNumber: string;
  flatId: string;
  customerId: string;
  projectId: string;
  demandType: string;
  demandDate: string;
  dueDate: string;
  demandAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  daysOverdue: number;
  flat?: Flat;
  customer?: any;
  reminders?: any[];
}

export interface Payment {
  id: string;
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  transactionRef: string;
  status: string;
  flatId: string;
  customerId: string;
  notes?: string;
  flat?: { id: string; unitNumber: string };
  customer?: { id: string; name: string; phone: string };
  allocations?: any[];
}

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  category: string;
  version: number;
  fileType: string;
  storageReference: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  permissions: string;
  status: string;
  ragEnabled: boolean;
  ragStatus: string;
  project?: { name: string; code: string };
  building?: { name: string };
  versions?: any[];
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  reorderLevel: number;
  currentStock: number;
  location: string;
  isLowStock: boolean;
  isCritical: boolean;
  stockStatus: string;
  transactions?: any[];
}

export interface MaterialDemand {
  id: string;
  demandNumber: string;
  itemId: string;
  item: InventoryItem;
  quantity: number;
  projectId: string;
  requesterName: string;
  requestDate: string;
  requiredDate: string;
  ownerName: string;
  procurementPerson: string;
  priority: string;
  status: string;
  isOverdue: boolean;
  lastEmailSentAt?: string | null;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: { name: string; code: string };
  totalAmount: number;
  status: string;
  poDate: string;
  deliveryDate: string;
  lineItems: any[];
  exceptions: any[];
}

export interface ComplianceItem {
  id: string;
  name: string;
  category: string;
  description: string;
  ownerName: string;
  dueDate: string;
  frequency: string;
  status: string;
  remarks?: string;
  evidence?: string;
}

export interface Contractor {
  id: string;
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  email: string;
  scope: string;
  rating: number;
  performanceScore: number;
  status: string;
  metrics?: {
    totalContracts: number;
    totalContractsValue: number;
    totalIssues: number;
    resolvedIssues: number;
    openIssues: number;
    issueResolutionRate: number;
    calculatedScore: number;
  };
}
