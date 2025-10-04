import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Roles válidos del sistema
const VALID_ROLES = ['admin', 'bartender'];

export const Roles = (...roles: string[]) => {
  // Validar que todos los roles sean válidos
  const invalidRoles = roles.filter(role => !VALID_ROLES.includes(role));
  if (invalidRoles.length > 0) {
    throw new Error(`Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${VALID_ROLES.join(', ')}`);
  }
  
  return SetMetadata(ROLES_KEY, roles);
};
