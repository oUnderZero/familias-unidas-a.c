import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { PublicMemberView } from '../pages/PublicMemberView';
import { Member, Credential } from '../types';

vi.mock('../services/memberService', async (importOriginal) => {
  const actual = await importOriginal();

  const member: Member = {
    id: 'ABC123',
    firstName: 'Ana',
    lastName: 'Gomez',
    role: 'Presidente',
    joinDate: '2024-01-01',
    bloodType: 'O+',
    curp: 'GOZA800101HDFRBN01',
    postalCode: '58000',
    street: 'Calle Falsa 123', // <-- agregado para habilitar el bloque de dirección (C.P.)
    photoUrl: 'https://via.placeholder.com/120',
    status: 'ACTIVE',
    credentials: []
  };

  const credential: Credential = {
    id: 'cred1',
    token: 'tkn1',
    issueDate: '2024-01-01',
    expirationDate: '2099-01-01',
    status: 'ACTIVE'
  };

  return {
    ...actual,
    fetchPublicMember: vi.fn().mockResolvedValue({
      member,
      credential,
      errorType: null
    }),
    resolveMediaUrl: (url?: string | null) => url || null
  };
});

describe('PublicMemberView', () => {
  it('renderiza datos públicos del miembro', async () => {
    render(
      <MemoryRouter initialEntries={['/member/ABC123?token=tkn1']}>
        <Routes>
          <Route path="/member/:id" element={<PublicMemberView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Ana Gomez/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Vigencia/i).length).toBeGreaterThan(0);
      const cpTexts = screen.getAllByText((content) => content.includes('C.P.') || content.includes('C.P'));
      expect(cpTexts.length).toBeGreaterThan(0);
    });
  });
});
