export interface IDashboardMetrics {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  totalTickets: number;
  activeEvents: number;
  totalEmployees: number;
  lowStockProducts: number;
  recentActivity: IRecentActivity[];
}

export interface IRecentActivity {
  id: string;
  type: 'ticket' | 'expense' | 'employee' | 'product' | 'stock';
  action: 'created' | 'updated' | 'deleted';
  description: string;
  timestamp: string;
  userId: string;
  userName: string;
}

export interface IReport {
  id: string;
  type: 'sales' | 'expenses' | 'staff' | 'inventory' | 'events';
  title: string;
  description: string;
  data: any[];
  summary: IReportSummary;
  generatedAt: string;
  generatedBy: string;
  period: {
    from: string;
    to: string;
  };
}

export interface IReportSummary {
  totalRecords: number;
  totalAmount?: number;
  averageAmount?: number;
  topItems?: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

export interface IAuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: {
    before: any;
    after: any;
  };
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export interface ISystemSettings {
  id: string;
  category: 'general' | 'notifications' | 'backup' | 'security' | 'business';
  key: string;
  value: any;
  description: string;
  isEditable: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface IBackupInfo {
  id: string;
  filename: string;
  size: number;
  type: 'full' | 'incremental';
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  createdBy: string;
  downloadUrl?: string;
}

export interface INotification {
  id: string;
  type: 'email' | 'sms' | 'push' | 'system';
  recipient: string;
  subject: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  createdBy: string;
}

export interface IExportRequest {
  id: string;
  type: 'excel' | 'pdf' | 'csv' | 'json';
  entity: 'tickets' | 'expenses' | 'employees' | 'products' | 'events' | 'audit';
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    eventId?: string;
    userId?: string;
    status?: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  createdAt: string;
  createdBy: string;
  completedAt?: string;
}
