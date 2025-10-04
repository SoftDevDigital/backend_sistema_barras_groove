import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  HttpCode,
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { EmployeeService } from '../services/employee.service';
import { 
  CreateEmployeeDto, 
  UpdateEmployeeDto, 
  EmployeeQueryDto,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignmentQueryDto
} from '../dto/employee.dto';
import { IEmployee, IEmployeeAssignment } from '../../shared/interfaces/employee.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RoleGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  // ===== EMPLEADOS =====

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  async create(@Body() createEmployeeDto: CreateEmployeeDto): Promise<IEmployee> {
    return this.employeeService.create(createEmployeeDto);
  }

  @Get()
  @Roles('admin')
  async findAll(@Query() query: EmployeeQueryDto): Promise<IEmployee[]> {
    return this.employeeService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'bartender')
  async findOne(@Param('id') id: string): Promise<IEmployee> {
    return this.employeeService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  async update(
    @Param('id') id: string, 
    @Body() updateEmployeeDto: UpdateEmployeeDto
  ): Promise<IEmployee> {
    return this.employeeService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  async remove(@Param('id') id: string): Promise<void> {
    return this.employeeService.remove(id);
  }

  // ===== RUTAS SIMPLIFICADAS AL MÁXIMO =====

  @Get('search')
  @Roles('admin', 'bartender')
  async searchEmployees(
    @Query('role') role?: string,
    @Query('eventId') eventId?: string,
    @Query('barId') barId?: string,
    @Query('status') status?: string
  ): Promise<IEmployee[] | IEmployeeAssignment[]> {
    // Búsqueda unificada: empleados o asignaciones según parámetros
    
    // Si se busca por eventId o barId, retornar asignaciones
    if (eventId || barId) {
      const assignments = await this.employeeService.findAssignments({ 
        eventId, 
        barId, 
        status: status as 'active' | 'completed'
      });
      
      // Si se especifica eventId o barId, retornar empleados completos
      if (eventId || barId) {
        const employeeIds = [...new Set(assignments.map(a => a.employeeId))];
        const employees: IEmployee[] = [];
        
        for (const employeeId of employeeIds) {
          try {
            const employee = await this.employeeService.findOne(employeeId);
            employees.push(employee);
          } catch (error) {
            console.warn(`Employee ${employeeId} not found`);
          }
        }
        return employees;
      }
      
      return assignments;
    }
    
    // Búsqueda normal de empleados por rol
    if (role && ['bartender'].includes(role)) {
      return this.employeeService.findAll({ role: role as 'bartender' });
    }
    
    // Sin parámetros = listar todos
    return this.employeeService.findAll();
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  async assignEmployee(
    @Param('id') employeeId: string,
    @Body() assignmentData: Omit<CreateAssignmentDto, 'employeeId'>
  ): Promise<IEmployeeAssignment> {
    const createAssignmentDto: CreateAssignmentDto = {
      ...assignmentData,
      employeeId
    };
    return this.employeeService.createAssignment(createAssignmentDto);
  }

  @Patch('assign/:assignmentId')
  @Roles('admin')
  async updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() updateAssignmentDto: UpdateAssignmentDto
  ): Promise<IEmployeeAssignment> {
    return this.employeeService.updateAssignment(assignmentId, updateAssignmentDto);
  }

  @Delete('assign/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  async removeAssignment(@Param('assignmentId') assignmentId: string): Promise<void> {
    return this.employeeService.removeAssignment(assignmentId);
  }
}
