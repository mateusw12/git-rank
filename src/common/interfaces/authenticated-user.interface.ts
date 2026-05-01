import { UserRole } from '../../auth/enums/user-role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
