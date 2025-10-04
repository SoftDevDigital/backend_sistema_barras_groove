import { BaseModel } from './base.model';
import { IEmployee, IEmployeeCreate, IEmployeeAssignment, IEmployeeAssignmentCreate } from '../interfaces/employee.interface';

export class EmployeeModel extends BaseModel implements IEmployee {
  name: string;
  document: string;
  contact: string;
  role: 'bartender' | 'manager' | 'cashier';

  constructor(data: IEmployeeCreate) {
    super();
    this.name = data.name;
    this.document = data.document;
    this.contact = data.contact;
    this.role = data.role;
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      ...super.toDynamoDBItem(),
      name: this.name,
      document: this.document,
      contact: this.contact,
      role: this.role,
      // GSI1 para búsquedas por documento
      GSI1PK: `EMPLOYEE#${this.document}`,
      GSI1SK: `EMPLOYEE#${this.id}`,
      // GSI2 para búsquedas por rol
      GSI2PK: `ROLE#${this.role}`,
      GSI2SK: `EMPLOYEE#${this.id}`,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): IEmployee {
    return {
      id: item.id,
      name: item.name,
      document: item.document,
      contact: item.contact,
      role: item.role,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export class EmployeeAssignmentModel extends BaseModel implements IEmployeeAssignment {
  employeeId: string;
  eventId: string;
  barId: string;
  shift: 'morning' | 'afternoon' | 'night';
  assignedAt: string;
  status: 'active' | 'completed';

  constructor(data: IEmployeeAssignmentCreate) {
    super();
    this.employeeId = data.employeeId;
    this.eventId = data.eventId;
    this.barId = data.barId;
    this.shift = data.shift;
    this.assignedAt = new Date().toISOString();
    this.status = 'active';
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      ...super.toDynamoDBItem(),
      employeeId: this.employeeId,
      eventId: this.eventId,
      barId: this.barId,
      shift: this.shift,
      assignedAt: this.assignedAt,
      status: this.status,
      // GSI1 para búsquedas por empleado
      GSI1PK: `EMPLOYEE#${this.employeeId}`,
      GSI1SK: `ASSIGNMENT#${this.eventId}#${this.barId}`,
      // GSI2 para búsquedas por evento
      GSI2PK: `EVENT#${this.eventId}`,
      GSI2SK: `ASSIGNMENT#${this.barId}#${this.employeeId}`,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): IEmployeeAssignment {
    return {
      id: item.id,
      employeeId: item.employeeId,
      eventId: item.eventId,
      barId: item.barId,
      shift: item.shift,
      assignedAt: item.assignedAt,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
