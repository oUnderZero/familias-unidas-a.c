export interface Credential {
  id: string;
  token: string;
  issueDate: string;
  expirationDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'; // REVOKED significa que fue reemplazada por una nueva antes de vencer
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  joinDate: string;
  bloodType?: string;
  curp?: string;
  emergencyContact?: string;
  photoUrl: string;
  status: 'ACTIVE' | 'INACTIVE'; // Estado general del miembro en la ONG
  postalCode?: string;
  
  // Address fields
  street?: string;
  houseNumber?: string;
  colony?: string;
  city?: string;

  // Security History
  credentials: Credential[];
}

export interface UserContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}
