import { Member, Credential } from '../types';

// MOCK DATABASE SERVICE
const STORAGE_KEY = 'ong_members_db_v3'; // Version 3: Credential History

const generateToken = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

export const getMembers = (): Member[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getMemberById = (id: string): Member | undefined => {
  const members = getMembers();
  return members.find((m) => m.id === id);
};

export const getActiveCredential = (member: Member): Credential | undefined => {
  // Returns the credential that is marked ACTIVE (should only be one ideally)
  return member.credentials.find(c => c.status === 'ACTIVE');
};

export const saveMember = (member: Member): void => {
  const members = getMembers();
  const index = members.findIndex((m) => m.id === member.id);
  
  // Data integrity check
  if (!member.credentials) {
    member.credentials = [];
  }

  if (index >= 0) {
    members[index] = member;
  } else {
    members.push(member);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
};

export const deleteMember = (id: string): void => {
  const members = getMembers();
  const filtered = members.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

// Helper to seed data if empty
export const seedData = () => {
  if (getMembers().length === 0) {
    const demoMembers: Member[] = [
      {
        id: '1a2b3c',
        firstName: 'Roberto',
        lastName: 'Gómez',
        role: 'Presidente',
        joinDate: '2020-01-15',
        bloodType: 'O+',
        photoUrl: 'https://picsum.photos/200/200?random=1',
        status: 'ACTIVE',
        emergencyContact: '555-123-4567',
        street: 'Av. Principal',
        houseNumber: '123',
        colony: 'Centro',
        city: 'Ciudad de México',
        credentials: [
            {
                id: generateId(),
                token: generateToken(),
                issueDate: '2024-01-01',
                expirationDate: '2025-12-31',
                status: 'ACTIVE'
            },
            {
                id: generateId(),
                token: 'old_token_123', // Example old token
                issueDate: '2022-01-01',
                expirationDate: '2023-12-31',
                status: 'EXPIRED'
            }
        ]
      },
      {
        id: '4d5e6f',
        firstName: 'Maria',
        lastName: 'Fernández',
        role: 'Tesorera',
        joinDate: '2021-03-10',
        bloodType: 'A+',
        photoUrl: 'https://picsum.photos/200/200?random=2',
        status: 'ACTIVE',
        emergencyContact: '555-987-6543',
        street: 'Calle de las Flores',
        houseNumber: '45 Int 2',
        colony: 'Jardines del Sur',
        city: 'Monterrey',
        credentials: [
            {
                id: generateId(),
                token: generateToken(),
                issueDate: '2023-01-01',
                expirationDate: '2024-01-01', // Already expired
                status: 'EXPIRED' 
            }
        ]
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoMembers));
  }
};