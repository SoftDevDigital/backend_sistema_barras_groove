import { BaseModel } from './base.model';
import { IUser, IUserCreate } from '../interfaces/user.interface';

export class UserModel extends BaseModel implements IUser {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'bartender';

  constructor(data?: IUserCreate) {
    super();
    
    if (data) {
      this.email = data.email;
      this.password = data.password;
      this.name = data.name;
      this.role = data.role || 'bartender';
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
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): UserModel {
    const user = new UserModel();
    
    user.id = item.id;
    user.email = item.email;
    user.password = item.password;
    user.name = item.name;
    user.role = item.role;
    user.createdAt = item.createdAt;
    user.updatedAt = item.updatedAt;
    
    return user;
  }
}
