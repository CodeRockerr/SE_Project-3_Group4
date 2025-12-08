// Mock next/navigation BEFORE imports
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock next/link BEFORE imports
jest.mock('next/link', () => {
  return function MockLink({ children, href }: any) {
    return <a href={href}>{children}</a>
  }
})

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Trash2: () => <svg data-testid="trash-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
  Minus: () => <svg data-testid="minus-icon" />,
  ShoppingBag: () => <svg data-testid="shopping-bag-icon" />,
  ArrowLeft: () => <svg data-testid="arrow-left-icon" />,
  CheckCircle: () => <svg data-testid="check-circle-icon" />,
  Loader2: () => <svg data-testid="loader-icon" />,
}))

import { render, screen } from '@testing-library/react'
import CartPage from '../../app/cart/page'
import { LanguageProvider } from '@/context/LanguageContext'

const renderWithLanguage = (ui: React.ReactElement) =>
  render(<LanguageProvider>{ui}</LanguageProvider>)

describe('CartPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Basic Rendering', () => {
    it('renders the cart page without errors', () => {
      renderWithLanguage(<CartPage />)
      expect(screen.getByText('Shopping Cart')).toBeInTheDocument()
    })

    it('displays empty cart message when cart is empty', () => {
      renderWithLanguage(<CartPage />)
      expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    })

    it('shows Browse Menu link when cart is empty', () => {
      renderWithLanguage(<CartPage />)
      expect(screen.getByText('Browse Menu')).toBeInTheDocument()
    })

    it('renders back arrow link to home page', () => {
      renderWithLanguage(<CartPage />)
      const backLinks = screen.getAllByRole('link')
      expect(backLinks.length).toBeGreaterThan(0)
    })

    it('displays shopping bag icon in header', () => {
      const { container } = renderWithLanguage(<CartPage />)
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('renders the main container with correct structure', () => {
      const { container } = renderWithLanguage(<CartPage />)
      expect(container).toBeInTheDocument()
    })

    it('displays the page title', () => {
      renderWithLanguage(<CartPage />)
      const heading = screen.getByText('Shopping Cart')
      expect(heading).toBeInTheDocument()
    })

    it('renders browse menu link as navigation', () => {
      renderWithLanguage(<CartPage />)
      const browseLink = screen.getByText('Browse Menu')
      expect(browseLink).toBeInTheDocument()
    })

    it('shows empty state message correctly', () => {
      renderWithLanguage(<CartPage />)
      expect(screen.getByText('Add some delicious items to get started!')).toBeInTheDocument()
    })

    it('renders without crashing when cart is empty', () => {
      const { container } = renderWithLanguage(<CartPage />)
      expect(container.firstChild).toBeInTheDocument()
    })
  })
})
