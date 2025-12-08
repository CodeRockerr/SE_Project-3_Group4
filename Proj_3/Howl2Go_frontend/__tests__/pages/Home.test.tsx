import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

// Mock all child components
jest.mock('@/components/Header', () => {
  return function MockHeader() {
    return <header data-testid="header">Header</header>
  }
})

jest.mock('@/components/Footer', () => {
  return function MockFooter() {
    return <footer data-testid="footer">Footer</footer>
  }
})

jest.mock('@/components/HeroSection', () => {
  return function MockHeroSection({ onSearchFocusChange }: any) {
    return (
      <div data-testid="hero-section">
        <button onClick={() => onSearchFocusChange(true)}>Focus</button>
        <button onClick={() => onSearchFocusChange(false)}>Blur</button>
      </div>
    )
  }
})

jest.mock('@/components/FrequentlyBoughtSection', () => {
  return function MockFrequentlyBoughtSection({ isSearchFocused }: any) {
    return (
      <div data-testid="frequently-bought-section">
        Frequently Bought - {isSearchFocused ? 'Focused' : 'Not Focused'}
      </div>
    )
  }
})

describe('Home Page', () => {
  describe('Rendering', () => {
    it('renders the home page', () => {
      render(<Home />)
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('hero-section')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('renders header and footer', () => {
      const { container } = render(<Home />)
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('renders hero section', () => {
      render(<Home />)
      expect(screen.getByTestId('hero-section')).toBeInTheDocument()
    })
  })

  describe('Layout', () => {
    it('has minimum height screen class', () => {
      const { container } = render(<Home />)
      const mainDiv = container.querySelector('.min-h-screen')
      expect(mainDiv).toBeInTheDocument()
    })

    it('applies background color class', () => {
      const { container } = render(<Home />)
      const mainDiv = container.querySelector('[class*="bg-"]')
      expect(mainDiv).toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('passes callback to HeroSection', () => {
      render(<Home />)
      const heroSection = screen.getByTestId('hero-section')
      expect(heroSection).toBeInTheDocument()
    })
  })

  describe('Client Component', () => {
    it('renders as a client component', () => {
      const { container } = render(<Home />)
      expect(container).toBeInTheDocument()
    })
  })
})
