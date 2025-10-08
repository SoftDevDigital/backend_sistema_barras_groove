import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DynamoDBService } from '../../shared/services/dynamodb.service';
import { EmployeeModel, EmployeeAssignmentModel } from '../../shared/models/employee.model';
import { 
  CreateEmployeeDto, 
  UpdateEmployeeDto, 
  EmployeeQueryDto,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignmentQueryDto
} from '../dto/employee.dto';
import { 
  IEmployee, 
  IEmployeeCreate, 
  IEmployeeAssignment 
} from '../../shared/interfaces/employee.interface';
import { TABLE_NAMES } from '../../shared/config/dynamodb.config';

@Injectable()
export class EmployeeService {
  constructor(private readonly dynamoDBService: DynamoDBService) {}

  // ===== EMPLEADOS =====

  async create(createEmployeeDto: CreateEmployeeDto): Promise<IEmployee> {
    try {
      // Validar entrada
      if (!createEmployeeDto.name || !createEmployeeDto.document || !createEmployeeDto.contact || !createEmployeeDto.role) {
        throw new BadRequestException('Name, document, contact, and role are required');
      }

      // Verificar si ya existe un empleado con el mismo documento usando scan
      const existingEmployees = await this.dynamoDBService.scan(
        TABLE_NAMES.EMPLOYEES,
        'document = :document',
        { ':document': createEmployeeDto.document }
      );
      
      if (existingEmployees && existingEmployees.length > 0) {
        throw new ConflictException(`Employee with document '${createEmployeeDto.document}' already exists. Please use a different document.`);
      }

      // Crear nuevo empleado
      const employeeModel = new EmployeeModel(createEmployeeDto);
      await this.dynamoDBService.put(TABLE_NAMES.EMPLOYEES, employeeModel.toDynamoDBItem());

      return {
        id: employeeModel.id,
        name: employeeModel.name,
        document: employeeModel.document,
        contact: employeeModel.contact,
        role: employeeModel.role,
        createdAt: employeeModel.createdAt,
        updatedAt: employeeModel.updatedAt,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      console.error('Error creating employee:', error);
      throw new BadRequestException('Failed to create employee. Please try again.');
    }
  }

  async findAll(query: EmployeeQueryDto = {}): Promise<IEmployee[]> {
    try {
      let items: any[] = [];

      if (query.role) {
        // Buscar por rol usando GSI2
        items = await this.dynamoDBService.query(
          TABLE_NAMES.EMPLOYEES,
          'GSI2PK = :gsi2pk',
          { ':gsi2pk': `ROLE#${query.role}` },
          undefined,
          'GSI2'
        );
      } else if (query.search) {
        // Buscar por nombre o documento usando scan
        items = await this.dynamoDBService.scan(
          TABLE_NAMES.EMPLOYEES,
          'contains(name, :search) OR contains(document, :search)',
          { ':search': query.search }
        );
      } else {
        // Obtener todos los empleados
        items = await this.dynamoDBService.scan(TABLE_NAMES.EMPLOYEES);
      }

      return items.map(item => EmployeeModel.fromDynamoDBItem(item));
    } catch (error) {
      console.error('Error finding employees:', error);
      throw new BadRequestException('Failed to retrieve employees. Please try again.');
    }
  }

  async findOne(id: string): Promise<IEmployee> {
    try {
      if (!id) {
        throw new BadRequestException('Employee ID is required');
      }

      // Intentar buscar por PK/SK primero
      try {
        const item = await this.dynamoDBService.get(TABLE_NAMES.EMPLOYEES, { 
          PK: `EMPLOYEE#${id}`, 
          SK: `EMPLOYEE#${id}` 
        });
        if (item) {
          return EmployeeModel.fromDynamoDBItem(item);
        }
      } catch (getError) {
        // Si falla el GET, intentar con scan
        console.warn('GET by PK/SK failed, trying scan by id:', getError.message);
      }

      // Fallback: buscar por id usando scan
      const items = await this.dynamoDBService.scan(
        TABLE_NAMES.EMPLOYEES,
        'id = :id',
        { ':id': id }
      );

      if (!items || items.length === 0) {
        throw new NotFoundException(`Employee with ID '${id}' not found`);
      }

      return EmployeeModel.fromDynamoDBItem(items[0]);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error finding employee:', error);
      throw new BadRequestException('Failed to retrieve employee. Please try again.');
    }
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<IEmployee> {
    try {
      if (!id) {
        throw new BadRequestException('Employee ID is required');
      }

      // Verificar que el empleado existe
      const existingEmployee = await this.findOne(id);

      // Si se está actualizando el documento, verificar que no exista otro empleado con ese documento
      if (updateEmployeeDto.document && updateEmployeeDto.document !== existingEmployee.document) {
        const employeeWithSameDocument = await this.findByDocument(updateEmployeeDto.document);
        if (employeeWithSameDocument) {
          throw new ConflictException(`Employee with document '${updateEmployeeDto.document}' already exists. Please use a different document.`);
        }
      }

      // Preparar datos de actualización
      const updateData: any = {};
      if (updateEmployeeDto.name) updateData.name = updateEmployeeDto.name;
      if (updateEmployeeDto.document) updateData.document = updateEmployeeDto.document;
      if (updateEmployeeDto.contact) updateData.contact = updateEmployeeDto.contact;
      if (updateEmployeeDto.role) updateData.role = updateEmployeeDto.role;
      updateData.updatedAt = new Date().toISOString();

      // Actualizar GSI si es necesario
      if (updateEmployeeDto.document) {
        updateData.GSI1PK = `EMPLOYEE#${updateEmployeeDto.document}`;
      }
      if (updateEmployeeDto.role) {
        updateData.GSI2PK = `ROLE#${updateEmployeeDto.role}`;
      }

      await this.dynamoDBService.update(
        TABLE_NAMES.EMPLOYEES, 
        { id }, 
        'SET ' + Object.keys(updateData).map(key => `#${key} = :${key}`).join(', '),
        Object.keys(updateData).reduce((acc, key) => {
          acc[`:${key}`] = updateData[key];
          return acc;
        }, {} as Record<string, any>),
        Object.keys(updateData).reduce((acc, key) => {
          acc[`#${key}`] = key;
          return acc;
        }, {} as Record<string, string>)
      );

      // Retornar empleado actualizado
      return await this.findOne(id);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      console.error('Error updating employee:', error);
      throw new BadRequestException('Failed to update employee. Please try again.');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      if (!id) {
        throw new BadRequestException('Employee ID is required');
      }

      // Verificar que el empleado existe
      await this.findOne(id);

      // Verificar si tiene asignaciones activas
      const activeAssignments = await this.findAssignmentsByEmployee(id, { status: 'active' });
      if (activeAssignments.length > 0) {
        throw new ConflictException('Cannot delete employee with active assignments. Please complete or remove assignments first.');
      }

      await this.dynamoDBService.delete(TABLE_NAMES.EMPLOYEES, { id });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      console.error('Error removing employee:', error);
      throw new BadRequestException('Failed to remove employee. Please try again.');
    }
  }

  // Métodos auxiliares para empleados
  private async findByDocument(document: string): Promise<IEmployee | null> {
    try {
      const items = await this.dynamoDBService.query(
        TABLE_NAMES.EMPLOYEES,
        'GSI1PK = :gsi1pk',
        { ':gsi1pk': `EMPLOYEE#${document}` },
        undefined,
        'GSI1'
      );
      
      return items.length > 0 ? EmployeeModel.fromDynamoDBItem(items[0]) : null;
    } catch (error) {
      console.error('Error finding employee by document:', error);
      return null;
    }
  }

  // ===== ASIGNACIONES =====

  async createAssignment(createAssignmentDto: CreateAssignmentDto): Promise<IEmployeeAssignment> {
    try {
      // Validar entrada
      if (!createAssignmentDto.userId || !createAssignmentDto.eventId || !createAssignmentDto.barId || !createAssignmentDto.shift) {
        throw new BadRequestException('User ID, Event ID, Bar ID, and shift are required');
      }

      // Ya no necesitamos verificar que el usuario existe (viene del JWT)

      // Verificar que no tenga asignación activa en el mismo turno
      const existingAssignment = await this.findActiveAssignment(
        createAssignmentDto.userId,
        createAssignmentDto.eventId,
        createAssignmentDto.shift
      );
      if (existingAssignment) {
        throw new ConflictException(`User already has an active assignment for ${createAssignmentDto.shift} shift in this event`);
      }

      // Crear nueva asignación
      const assignmentModel = new EmployeeAssignmentModel(createAssignmentDto);
      await this.dynamoDBService.put(TABLE_NAMES.EMPLOYEE_ASSIGNMENTS, assignmentModel.toDynamoDBItem());

      return {
        id: assignmentModel.id,
        userId: assignmentModel.userId,
        eventId: assignmentModel.eventId,
        barId: assignmentModel.barId,
        shift: assignmentModel.shift,
        assignedAt: assignmentModel.assignedAt,
        status: assignmentModel.status,
        createdAt: assignmentModel.createdAt,
        updatedAt: assignmentModel.updatedAt,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      console.error('Error creating assignment:', error);
      throw new BadRequestException('Failed to create assignment. Please try again.');
    }
  }

  async findAssignments(query: AssignmentQueryDto = {}): Promise<IEmployeeAssignment[]> {
    try {
      let items: any[] = [];

      if (query.eventId) {
        // Buscar por evento usando GSI2
        items = await this.dynamoDBService.query(
          TABLE_NAMES.EMPLOYEE_ASSIGNMENTS,
          'GSI2PK = :gsi2pk',
          { ':gsi2pk': `EVENT#${query.eventId}` },
          undefined,
          'GSI2'
        );
      } else if (query.userId) {
        // Buscar por usuario usando GSI1
        items = await this.dynamoDBService.query(
          TABLE_NAMES.EMPLOYEE_ASSIGNMENTS,
          'GSI1PK = :gsi1pk',
          { ':gsi1pk': `USER#${query.userId}` }, // Cambiado de EMPLOYEE a USER
          undefined,
          'GSI1'
        );
      } else {
        // Obtener todas las asignaciones
        items = await this.dynamoDBService.scan(TABLE_NAMES.EMPLOYEE_ASSIGNMENTS);
      }

      // Aplicar filtros adicionales
      if (query.barId) {
        items = items.filter(item => item.barId === query.barId);
      }
      if (query.shift) {
        items = items.filter(item => item.shift === query.shift);
      }
      if (query.status) {
        items = items.filter(item => item.status === query.status);
      }

      return items.map(item => EmployeeAssignmentModel.fromDynamoDBItem(item));
    } catch (error) {
      console.error('Error finding assignments:', error);
      throw new BadRequestException('Failed to retrieve assignments. Please try again.');
    }
  }

  async findAssignmentsByEmployee(userId: string, query: AssignmentQueryDto = {}): Promise<IEmployeeAssignment[]> {
    return this.findAssignments({ ...query, userId });
  }

  async updateAssignment(id: string, updateAssignmentDto: UpdateAssignmentDto): Promise<IEmployeeAssignment> {
    try {
      if (!id) {
        throw new BadRequestException('Assignment ID is required');
      }

      // Verificar que la asignación existe
      const existingAssignment = await this.findOneAssignment(id);

      // Preparar datos de actualización
      const updateData: any = {};
      if (updateAssignmentDto.barId) updateData.barId = updateAssignmentDto.barId;
      if (updateAssignmentDto.shift) updateAssignmentDto.shift = updateAssignmentDto.shift;
      if (updateAssignmentDto.status) updateData.status = updateAssignmentDto.status;
      updateData.updatedAt = new Date().toISOString();

      // Actualizar GSI si es necesario
      if (updateAssignmentDto.barId && updateAssignmentDto.shift) {
        updateData.GSI1SK = `ASSIGNMENT#${existingAssignment.eventId}#${updateAssignmentDto.barId}`;
        updateData.GSI2SK = `ASSIGNMENT#${updateAssignmentDto.barId}#${existingAssignment.userId}`;
      }

      await this.dynamoDBService.update(
        TABLE_NAMES.EMPLOYEE_ASSIGNMENTS, 
        { id }, 
        'SET ' + Object.keys(updateData).map(key => `#${key} = :${key}`).join(', '),
        Object.keys(updateData).reduce((acc, key) => {
          acc[`:${key}`] = updateData[key];
          return acc;
        }, {} as Record<string, any>),
        Object.keys(updateData).reduce((acc, key) => {
          acc[`#${key}`] = key;
          return acc;
        }, {} as Record<string, string>)
      );

      // Retornar asignación actualizada
      return await this.findOneAssignment(id);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating assignment:', error);
      throw new BadRequestException('Failed to update assignment. Please try again.');
    }
  }

  async removeAssignment(id: string): Promise<void> {
    try {
      if (!id) {
        throw new BadRequestException('Assignment ID is required');
      }

      // Verificar que la asignación existe
      await this.findOneAssignment(id);

      await this.dynamoDBService.delete(TABLE_NAMES.EMPLOYEE_ASSIGNMENTS, { id });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error removing assignment:', error);
      throw new BadRequestException('Failed to remove assignment. Please try again.');
    }
  }

  // Métodos auxiliares para asignaciones
  private async findOneAssignment(id: string): Promise<IEmployeeAssignment> {
    const item = await this.dynamoDBService.get(TABLE_NAMES.EMPLOYEE_ASSIGNMENTS, { id });
    if (!item) {
      throw new NotFoundException(`Assignment with ID '${id}' not found`);
    }
    return EmployeeAssignmentModel.fromDynamoDBItem(item);
  }

  private async findActiveAssignment(userId: string, eventId: string, shift: string): Promise<IEmployeeAssignment | null> {
    try {
      const items = await this.dynamoDBService.query(
        TABLE_NAMES.EMPLOYEE_ASSIGNMENTS,
        'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)',
        { 
          ':gsi1pk': `USER#${userId}`, // Cambiado de EMPLOYEE a USER
          ':gsi1sk': `ASSIGNMENT#${eventId}`
        },
        undefined,
        'GSI1'
      );
      
      const activeAssignment = items.find(item => item.status === 'active' && item.shift === shift);
      return activeAssignment ? EmployeeAssignmentModel.fromDynamoDBItem(activeAssignment) : null;
    } catch (error) {
      console.error('Error finding active assignment:', error);
      return null;
    }
  }
}
