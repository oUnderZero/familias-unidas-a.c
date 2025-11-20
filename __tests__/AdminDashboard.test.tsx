import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AdminDashboard } from '../pages/AdminDashboard';
import { Member } from '../types';

vi.mock('../services/memberService', async (importOriginal) => {
  const actual = await importOriginal();
  const mockMembers: Member[] = [
    {
      id: 'ABC123',
      firstName: 'Ana',
      lastName: 'Gomez',
      role: 'Presidente',
      joinDate: '2024-01-01',
      bloodType: 'O+',
      curp: 'GOZA800101HDFRBN01',
      postalCode: '58000',
      photoUrl: 'https://via.placeholder.com/100',
      status: 'ACTIVE',
      credentials: [
        {
          id: 'cred1',
          token: 'tkn1',
          issueDate: '2024-01-01',
          expirationDate: '2099-01-01',
          status: 'ACTIVE'
        }
      ],
      street: 'Av. Principal',
      houseNumber: '123',
      colony: 'Centro',
      city: 'Morelia',
      emergencyContact: '555-000-0000'
    }
  ];

  return {
    ...actual,
    getMembers: vi.fn().mockResolvedValue(mockMembers),
    deleteMember: vi.fn().mockResolvedValue(undefined),
    getActiveCredential: (member: Member) => member.credentials.find((c) => c.status === 'ACTIVE'),
    resolveMediaUrl: (url?: string | null) => url || ''
  };
});

describe('AdminDashboard', () => {
  it('muestra la lista de miembros obtenida de la API', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Directorio de Miembros/i)).toBeInTheDocument();
      expect(screen.getByText(/Ana Gomez/i)).toBeInTheDocument();
    });
  });
});
