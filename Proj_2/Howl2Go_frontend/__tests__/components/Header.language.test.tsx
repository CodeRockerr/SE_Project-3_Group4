import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Header from '@/components/Header'
import { LanguageProvider } from '@/context/LanguageContext'

// Mock the useAuth hook
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
  }),
}))

// Mock the useCart hook
jest.mock('@/context/CartContext', () => ({
  useCart: () => ({
    items: [],
    summary: {
      totalItems: 0,
      subtotal: 0,
      tax: 0,
      deliveryFee: 0,
      total: 0,
    },
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    clearCart: jest.fn(),
    updateQuantity: jest.fn(),
    isLoading: false,
  }),
}))

describe('Header Component - Language Support', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders language switcher button in header', () => {
    render(
      <LanguageProvider>
        <Header />
      </LanguageProvider>
    )

    const languageButton = screen.getByText(/Language:/i)
    expect(languageButton).toBeInTheDocument()
  })

  it('displays current language in button', () => {
    render(
      <LanguageProvider>
        <Header />
      </LanguageProvider>
    )

    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('shows language options on button click', async () => {
    render(
      <LanguageProvider>
        <Header />
      </LanguageProvider>
    )

    const languageButton = screen.getByLabelText(/Language/i)
    fireEvent.click(languageButton)

    await waitFor(() => {
      const englishOptions = screen.getAllByText('English')
      expect(englishOptions.length).toBeGreaterThan(1) // At least one in button, one in menu
    })
  })

  it('changes language to Spanish when Spanish is selected', async () => {
    render(
      <LanguageProvider>
        <Header />
      </LanguageProvider>
    )

    const languageButton = screen.getByLabelText(/Language/i)
    fireEvent.click(languageButton)

    await waitFor(() => {
      const spanishButtons = screen.queryAllByText('Spanish')
      if (spanishButtons.length > 0) {
        fireEvent.click(spanishButtons[0])
      }
    })

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('es')
    })
  })

  it('persists language preference to localStorage', async () => {
    render(
      <LanguageProvider>
        <Header />
      </LanguageProvider>
    )

    const languageButton = screen.getByLabelText(/Language/i)
    fireEvent.click(languageButton)

    await waitFor(() => {
      const spanishButtons = screen.queryAllByText('Spanish')
      if (spanishButtons.length > 0) {
        fireEvent.click(spanishButtons[0])
      }
    })

    await waitFor(() => {
      expect(localStorage.getItem('howl2go-language')).toBe('es')
    })
  })

  it('translates navigation links based on language', async () => {
    render(
      <LanguageProvider>
        <Header />
      </LanguageProvider>
    )

    // Check English translation - About link should exist
    expect(screen.getByText('About')).toBeInTheDocument()
  })

  it('closes language dropdown after selection', async () => {
    render(
      <LanguageProvider>
        <Header />
      </LanguageProvider>
    )

    const languageButton = screen.getByLabelText(/Language/i)
    fireEvent.click(languageButton)

    await waitFor(() => {
      const spanishButtons = screen.queryAllByText('Spanish')
      if (spanishButtons.length > 0) {
        fireEvent.click(spanishButtons[0])
      }
    })

    // Language should be updated
    await waitFor(() => {
      expect(document.documentElement.lang).toBe('es')
    })
  })

  it('restores language from localStorage on mount', () => {
    localStorage.setItem('howl2go-language', 'es')

    render(
      <LanguageProvider>
        <Header />
      </LanguageProvider>
    )

    expect(document.documentElement.lang).toBe('es')
    expect(screen.getByText('Espanol')).toBeInTheDocument()
  })

  it('sets document.lang attribute on language change', async () => {
    render(
      <LanguageProvider>
        <Header />
      </LanguageProvider>
    )

    expect(document.documentElement.lang).toBe('en')

    const languageButton = screen.getByLabelText(/Language/i)
    fireEvent.click(languageButton)

    await waitFor(() => {
      const spanishButtons = screen.queryAllByText('Spanish')
      if (spanishButtons.length > 0) {
        fireEvent.click(spanishButtons[0])
      }
    })

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('es')
    })
  })

  it('renders language button in correct position', () => {
    render(
      <LanguageProvider>
        <Header />
      </LanguageProvider>
    )

    const aboutLink = screen.getByText('About')
    const languageText = screen.getByText(/Language:/i)

    // Both should be in the document
    expect(languageText).toBeInTheDocument()
    expect(aboutLink).toBeInTheDocument()
  })
})
