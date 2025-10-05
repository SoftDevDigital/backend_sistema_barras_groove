import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Query, 
  Body, 
  UseGuards, 
  Logger,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { AdminService } from '../services/admin.service';
import { 
  DashboardQueryDto, 
  ReportQueryDto, 
  AuditQueryDto, 
  SettingsQueryDto, 
  UpdateSettingsDto, 
  CreateBackupDto, 
  RestoreBackupDto, 
  CreateNotificationDto, 
  ExportDataDto 
} from '../dto/admin.dto';
import { 
  IDashboardMetrics, 
  IReport, 
  IAuditLog, 
  ISystemSettings, 
  IBackupInfo, 
  INotification, 
  IExportRequest
} from '../../shared/interfaces/admin.interface';
import { SystemHealthDto } from '../dto/admin.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  // Dashboard - Panel principal con métricas
  @Get('dashboard')
  @Roles('admin')
  async getDashboard(@Query() query: DashboardQueryDto): Promise<IDashboardMetrics> {
    this.logger.log('Getting dashboard metrics', 'AdminController.getDashboard');
    try {
      const result = await this.adminService.getDashboardMetrics(query);
      this.logger.log(`Dashboard metrics retrieved successfully`, 'AdminController.getDashboard');
      return result;
    } catch (error) {
      this.logger.error(`Error in dashboard controller:`, error.stack, 'AdminController.getDashboard');
      throw error;
    }
  }

  // Reports - Reportes con query params para diferentes tipos
  @Get('reports')
  @Roles('admin')
  async generateReport(
    @Query('type') type?: string,
    @Query('format') format?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('eventId') eventId?: string
  ): Promise<IReport> {
    this.logger.log(`Generating ${type || 'sales'} report`, 'AdminController.generateReport');
    try {
      const query = { type, format, dateFrom, dateTo, eventId };
      const result = await this.adminService.generateReport(query as any);
      this.logger.log(`Report ${result.id} generated successfully`, 'AdminController.generateReport');
      return result;
    } catch (error) {
      this.logger.error(`Error in reports controller:`, error.stack, 'AdminController.generateReport');
      throw error;
    }
  }

  // Audit - Logs de auditoría con filtros
  @Get('audit')
  @Roles('admin')
  async getAuditLogs(@Query() query: AuditQueryDto): Promise<IAuditLog[]> {
    this.logger.log('Getting audit logs', 'AdminController.getAuditLogs');
    try {
      const result = await this.adminService.getAuditLogs(query);
      this.logger.log(`Retrieved ${result.length} audit logs`, 'AdminController.getAuditLogs');
      return result;
    } catch (error) {
      this.logger.error(`Error in audit controller:`, error.stack, 'AdminController.getAuditLogs');
      throw error;
    }
  }

  // Settings - Configuraciones del sistema
  @Get('settings')
  @Roles('admin')
  async getSystemSettings(@Query() query: SettingsQueryDto): Promise<ISystemSettings[]> {
    this.logger.log('Getting system settings', 'AdminController.getSystemSettings');
    try {
      const result = await this.adminService.getSystemSettings(query);
      this.logger.log(`Retrieved ${result.length} system settings`, 'AdminController.getSystemSettings');
      return result;
    } catch (error) {
      this.logger.error(`Error in settings controller:`, error.stack, 'AdminController.getSystemSettings');
      throw error;
    }
  }

  @Patch('settings')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  async updateSystemSettings(@Body() updateDto: UpdateSettingsDto): Promise<ISystemSettings> {
    this.logger.log(`Updating system setting: ${updateDto.key}`, 'AdminController.updateSystemSettings');
    try {
      const result = await this.adminService.updateSystemSettings(updateDto);
      this.logger.log(`Setting ${updateDto.key} updated successfully`, 'AdminController.updateSystemSettings');
      return result;
    } catch (error) {
      this.logger.error(`Error in settings update controller:`, error.stack, 'AdminController.updateSystemSettings');
      throw error;
    }
  }

  // Backup - Crear y restaurar backups
  @Post('backup')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  async createBackup(@Body() createDto: CreateBackupDto): Promise<IBackupInfo> {
    this.logger.log('Creating backup', 'AdminController.createBackup');
    try {
      const result = await this.adminService.createBackup(createDto);
      this.logger.log(`Backup ${result.id} creation initiated`, 'AdminController.createBackup');
      return result;
    } catch (error) {
      this.logger.error(`Error in backup controller:`, error.stack, 'AdminController.createBackup');
      throw error;
    }
  }

  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  async restoreBackup(@Body() restoreDto: RestoreBackupDto): Promise<{ message: string }> {
    this.logger.log(`Restoring backup: ${restoreDto.backupId}`, 'AdminController.restoreBackup');
    try {
      const result = await this.adminService.restoreBackup(restoreDto);
      this.logger.log(`Backup ${restoreDto.backupId} restored successfully`, 'AdminController.restoreBackup');
      return result;
    } catch (error) {
      this.logger.error(`Error in restore controller:`, error.stack, 'AdminController.restoreBackup');
      throw error;
    }
  }

  // Export - Exportar datos en diferentes formatos
  @Post('export')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  async exportData(@Body() exportDto: ExportDataDto): Promise<IExportRequest> {
    this.logger.log(`Exporting ${exportDto.entity} data to ${exportDto.format}`, 'AdminController.exportData');
    try {
      const result = await this.adminService.exportData(exportDto);
      this.logger.log(`Export ${result.id} initiated successfully`, 'AdminController.exportData');
      return result;
    } catch (error) {
      this.logger.error(`Error in export controller:`, error.stack, 'AdminController.exportData');
      throw error;
    }
  }

  // Notify - Enviar notificaciones
  @Post('notify')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  async createNotification(@Body() createDto: CreateNotificationDto): Promise<INotification> {
    this.logger.log(`Creating ${createDto.type} notification`, 'AdminController.createNotification');
    try {
      const result = await this.adminService.createNotification(createDto);
      this.logger.log(`Notification ${result.id} created successfully`, 'AdminController.createNotification');
      return result;
    } catch (error) {
      this.logger.error(`Error in notification controller:`, error.stack, 'AdminController.createNotification');
      throw error;
    }
  }

  // Health - Estado del sistema (accesible para bartenders también)
  @Get('health')
  @Roles('admin', 'bartender')
  async getSystemHealth(): Promise<SystemHealthDto> {
    this.logger.log('Getting system health', 'AdminController.getSystemHealth');
    try {
      const result = await this.adminService.getSystemHealth();
      this.logger.log('System health retrieved successfully', 'AdminController.getSystemHealth');
      return result;
    } catch (error) {
      this.logger.error(`Error in health controller:`, error.stack, 'AdminController.getSystemHealth');
      throw error;
    }
  }
}
