export interface IUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'bartender';
  // Campos de empleado (opcional para admins)
  document?: string;
  contact?: string;
  employeeRole?: 'bartender' | 'manager' | 'cashier';
  createdAt: string;
  updatedAt: string;
}

export interface IUserCreate {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'bartender'; // Por defecto, los usuarios se registran como 'bartender'
  document?: string;
  contact?: string;
  employeeRole?: 'bartender' | 'manager' | 'cashier';
}

export interface IUserUpdate {
  name?: string;
  role?: 'admin' | 'bartender';
}

export interface IUserLogin {
  email: string;
  password: string;
}

export interface IAuthResponse {
  token: string;
  user: Omit<IUser, 'password'>;
}
