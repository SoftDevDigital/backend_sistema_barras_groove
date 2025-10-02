export interface IUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'bar_user';
  createdAt: string;
  updatedAt: string;
}

export interface IUserCreate {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'bar_user';
}

export interface IUserLogin {
  email: string;
  password: string;
}

export interface IAuthResponse {
  token: string;
  user: Omit<IUser, 'password'>;
}
