import { BaseModel } from './base.model';
import { IUser, IUserCreate } from '../interfaces/user.interface';

export class UserModel extends BaseModel implements IUser {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'bartender';
  document?: string;
  contact?: string;
  employeeRole?: 'bartender' | 'manager' | 'cashier';

  constructor(data?: IUserCreate) {
    super();
    
    if (data) {
      this.email = data.email;
      this.password = data.password;
      this.name = data.name;
      this.role = data.role || 'bartender';
      this.document = data.document;
      this.contact = data.contact || data.email; // Si no se proporciona contact, usar email
      this.employeeRole = data.employeeRole || 'bartender'; // Por defecto bartender
    } else {
      this.email = '';
      this.password = '';
      this.name = '';
      this.role = 'bartender';
    }
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      PK: `USER#${this.email}`,
      SK: `USER#${this.email}`,
      GSI1PK: `ROLE#${this.role}`,
      GSI1SK: this.email,
      ...super.toDynamoDBItem(),
      email: this.email,
      password: this.password,
      name: this.name,
      role: this.role,
      document: this.document,
      contact: this.contact,
      employeeRole: this.employeeRole,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): UserModel {
    const user = new UserModel();
    
    user.id = item.id;
    user.email = item.email;
    user.password = item.password;
    user.name = item.name;
    user.role = item.role;
    user.document = item.document;
    user.contact = item.contact;
    user.employeeRole = item.employeeRole;
    user.createdAt = item.createdAt;
    user.updatedAt = item.updatedAt;
    
    return user;
  }
}
