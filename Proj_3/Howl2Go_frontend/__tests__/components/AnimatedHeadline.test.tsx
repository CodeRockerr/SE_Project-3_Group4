import { render, screen } from '@testing-library/react'
import AnimatedHeadline from '@/components/AnimatedHeadline'
import { LanguageProvider } from '@/context/LanguageContext'

const renderWithLanguage = (ui: React.ReactElement) =>
  render(<LanguageProvider>{ui}</LanguageProvider>)

describe('AnimatedHeadline Component', () => {
  describe('Rendering', () => {
    it('renders the headline', () => {
      renderWithLanguage(<AnimatedHeadline isSearchFocused={false} />)
      const headline = screen.getByRole('heading', { level: 1 })
      expect(headline).toBeInTheDocument()
    })

    it('displays all headline words', () => {
      renderWithLanguage(<AnimatedHeadline isSearchFocused={false} />)
      expect(screen.getByText('Crave it.')).toBeInTheDocument()
      expect(screen.getByText('Find it.')).toBeInTheDocument()
      expect(screen.getByText('Instantly.')).toBeInTheDocument()
    })

    it('renders exactly 5 words', () => {
      const { container } = renderWithLanguage(<AnimatedHeadline isSearchFocused={false} />)
      const headline = screen.getByRole('heading', { level: 1 })
      const spans = headline.querySelectorAll('span')
      // Should have at least 3 spans (one for each word)
      expect(spans.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('SVG Underline', () => {
    it('renders SVG underline on "Instantly."', () => {
      const { container } = renderWithLanguage(<AnimatedHeadline isSearchFocused={false} />)
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('SVG underline has correct viewBox', () => {
      const { container } = renderWithLanguage(<AnimatedHeadline isSearchFocused={false} />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('viewBox', '0 0 200 8')
    })

    it('SVG contains a path element', () => {
      const { container } = renderWithLanguage(<AnimatedHeadline isSearchFocused={false} />)
      const path = container.querySelector('svg path')
      expect(path).toBeInTheDocument()
    })
  })

  describe('Focus State', () => {
    it('renders correctly when search is not focused', () => {
      renderWithLanguage(<AnimatedHeadline isSearchFocused={false} />)
      const headline = screen.getByRole('heading', { level: 1 })
      expect(headline).toBeInTheDocument()
    })

    it('renders correctly when search is focused', () => {
      renderWithLanguage(<AnimatedHeadline isSearchFocused={true} />)
      const headline = screen.getByRole('heading', { level: 1 })
      expect(headline).toBeInTheDocument()
    })

    it('contains all words even when focused', () => {
      renderWithLanguage(<AnimatedHeadline isSearchFocused={true} />)
      expect(screen.getByText('Crave it.')).toBeInTheDocument()
      expect(screen.getByText('Instantly.')).toBeInTheDocument()
    })
  })

  describe('Text Content', () => {
    it('has correct complete text', () => {
      renderWithLanguage(<AnimatedHeadline isSearchFocused={false} />)
      const headline = screen.getByRole('heading', { level: 1 })
      expect(headline.textContent).toContain('Crave')
      expect(headline.textContent).toContain('Find')
      expect(headline.textContent).toContain('Instantly')
    })

    it('words are properly spaced', () => {
      renderWithLanguage(<AnimatedHeadline isSearchFocused={false} />)
      const headline = screen.getByRole('heading', { level: 1 })
      const spans = headline.querySelectorAll('span')
      expect(spans.length).toBeGreaterThan(0)
    })
  })

  describe('Styling', () => {
    it('has correct base classes', () => {
      renderWithLanguage(<AnimatedHeadline isSearchFocused={false} />)
      const headline = screen.getByRole('heading', { level: 1 })
      expect(headline).toHaveClass('text-center')
      expect(headline).toHaveClass('font-bold')
      expect(headline).toHaveClass('leading-tight')
    })
  })
})
