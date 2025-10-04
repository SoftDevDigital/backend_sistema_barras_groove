export interface IUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'bartender';
  createdAt: string;
  updatedAt: string;
}

export interface IUserCreate {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'bartender'; // Por defecto, los usuarios se registran como 'bartender'
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
