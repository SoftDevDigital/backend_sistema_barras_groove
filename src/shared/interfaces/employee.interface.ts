export interface IEmployee {
  id: string;
  name: string;
  document: string;
  contact: string;
  role: 'bartender' | 'manager' | 'cashier';
  createdAt: string;
  updatedAt: string;
}

export interface IEmployeeCreate {
  name: string;
  document: string;
  contact: string;
  role: 'bartender' | 'manager' | 'cashier';
}

export interface IEmployeeUpdate {
  name?: string;
  document?: string;
  contact?: string;
  role?: 'bartender' | 'manager' | 'cashier';
}

export interface IEmployeeAssignment {
  id: string;
  userId: string; // ID del usuario (antes employeeId)
  eventId: string;
  barId: string;
  shift: 'morning' | 'afternoon' | 'night';
  assignedAt: string;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface IEmployeeAssignmentCreate {
  userId: string; // ID del usuario (antes employeeId)
  eventId: string;
  barId: string;
  shift: 'morning' | 'afternoon' | 'night';
}

export interface IEmployeeAssignmentUpdate {
  barId?: string;
  shift?: 'morning' | 'afternoon' | 'night';
  status?: 'active' | 'completed';
}
