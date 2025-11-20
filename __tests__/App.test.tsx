import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renderiza la pantalla de login por defecto', () => {
    render(<App />);
    expect(screen.getByText(/Ingresar al Sistema/i)).toBeInTheDocument();
    expect(screen.getByText(/Bienvenido/i)).toBeInTheDocument();
  });
});
