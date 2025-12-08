import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    logout: jest.fn(),
  }),
  AuthContext: React.createContext(null),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock CartContext
jest.mock('@/context/CartContext', () => ({
  useCart: () => ({
    cart: [],
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    summary: { count: 0, total: 0 },
  }),
  CartContext: React.createContext(null),
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Create a custom render function that wraps with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
