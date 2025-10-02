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
  employeeId: string;
  eventId: string;
  barId: string;
  shift: 'morning' | 'afternoon' | 'night';
  assignedAt: string;
  status: 'active' | 'completed';
}

export interface IEmployeeAssignmentCreate {
  employeeId: string;
  eventId: string;
  barId: string;
  shift: 'morning' | 'afternoon' | 'night';
}

export interface IEmployeeAssignmentUpdate {
  barId?: string;
  shift?: 'morning' | 'afternoon' | 'night';
  status?: 'active' | 'completed';
}
