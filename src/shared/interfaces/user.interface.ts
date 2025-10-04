export interface IUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin' | 'bartender' | 'manager' | 'cashier';
  createdAt: string;
  updatedAt: string;
}

export interface IUserCreate {
  email: string;
  password: string;
  name: string;
  role?: 'user'; // Por defecto, los usuarios se registran como 'user'
}

export interface IUserUpdate {
  name?: string;
  role?: 'user' | 'admin' | 'bartender' | 'manager' | 'cashier';
}

export interface IUserLogin {
  email: string;
  password: string;
}

export interface IAuthResponse {
  token: string;
  user: Omit<IUser, 'password'>;
}
