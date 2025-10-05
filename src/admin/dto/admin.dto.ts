import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsArray, IsBoolean, IsEmail } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional()
  @IsEnum(['today', 'week', 'month', 'quarter', 'year'])
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year';

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  eventId?: string;
}

export class ReportQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class AuditQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class SettingsQueryDto {
  @IsOptional()
  @IsEnum(['general', 'notifications', 'backup', 'security', 'business'])
  category?: 'general' | 'notifications' | 'backup' | 'security' | 'business';

  @IsOptional()
  @IsString()
  key?: string;
}

export class UpdateSettingsDto {
  @IsString()
  key: string;

  @IsOptional()
  value?: any;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateBackupDto {
  @IsOptional()
  @IsEnum(['full', 'incremental'])
  type?: 'full' | 'incremental';

  @IsOptional()
  @IsString()
  description?: string;
}

export class RestoreBackupDto {
  @IsString()
  backupId: string;

  @IsOptional()
  @IsBoolean()
  confirmRestore?: boolean;
}

export class CreateNotificationDto {
  @IsEnum(['email', 'sms', 'push', 'system'])
  type: 'email' | 'sms' | 'push' | 'system';

  @IsString()
  recipient: string;

  @IsString()
  subject: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class ExportDataDto {
  @IsEnum(['excel', 'pdf', 'csv', 'json'])
  format: 'excel' | 'pdf' | 'csv' | 'json';

  @IsEnum(['tickets', 'expenses', 'employees', 'products', 'events', 'audit'])
  entity: 'tickets' | 'expenses' | 'employees' | 'products' | 'events' | 'audit';

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];
}

export class SystemHealthDto {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
  };
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'warning';
    responseTime?: number;
  }>;
  lastBackup?: string;
  activeUsers: number;
  timestamp: string;
}
