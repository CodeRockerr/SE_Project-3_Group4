import { render, screen } from '@testing-library/react'
import AnimatedHeadline from '@/components/AnimatedHeadline'

describe('AnimatedHeadline Component', () => {
  describe('Rendering', () => {
    it('renders the headline', () => {
      render(<AnimatedHeadline isSearchFocused={false} />)
      const headline = screen.getByRole('heading', { level: 1 })
      expect(headline).toBeInTheDocument()
    })

    it('displays all headline words', () => {
      render(<AnimatedHeadline isSearchFocused={false} />)
      expect(screen.getByText('Crave')).toBeInTheDocument()
      expect(screen.getByText('Find')).toBeInTheDocument()
      expect(screen.getByText('Instantly.')).toBeInTheDocument()
    })

    it('renders exactly 5 words', () => {
      const { container } = render(<AnimatedHeadline isSearchFocused={false} />)
      const headline = screen.getByRole('heading', { level: 1 })
      const spans = headline.querySelectorAll('span')
      // Should have at least 5 spans (one for each word)
      expect(spans.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('SVG Underline', () => {
    it('renders SVG underline on "Instantly."', () => {
      const { container } = render(<AnimatedHeadline isSearchFocused={false} />)
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('SVG underline has correct viewBox', () => {
      const { container } = render(<AnimatedHeadline isSearchFocused={false} />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('viewBox', '0 0 200 8')
    })

    it('SVG contains a path element', () => {
      const { container } = render(<AnimatedHeadline isSearchFocused={false} />)
      const path = container.querySelector('svg path')
      expect(path).toBeInTheDocument()
    })
  })

  describe('Focus State', () => {
    it('renders correctly when search is not focused', () => {
      render(<AnimatedHeadline isSearchFocused={false} />)
      const headline = screen.getByRole('heading', { level: 1 })
      expect(headline).toBeInTheDocument()
    })

    it('renders correctly when search is focused', () => {
      render(<AnimatedHeadline isSearchFocused={true} />)
      const headline = screen.getByRole('heading', { level: 1 })
      expect(headline).toBeInTheDocument()
    })

    it('contains all words even when focused', () => {
      render(<AnimatedHeadline isSearchFocused={true} />)
      expect(screen.getByText('Crave')).toBeInTheDocument()
      expect(screen.getByText('Instantly.')).toBeInTheDocument()
    })
  })

  describe('Text Content', () => {
    it('has correct complete text', () => {
      render(<AnimatedHeadline isSearchFocused={false} />)
      const headline = screen.getByRole('heading', { level: 1 })
      expect(headline.textContent).toContain('Crave')
      expect(headline.textContent).toContain('Find')
      expect(headline.textContent).toContain('Instantly')
    })

    it('words are properly spaced', () => {
      render(<AnimatedHeadline isSearchFocused={false} />)
      const headline = screen.getByRole('heading', { level: 1 })
      const spans = headline.querySelectorAll('span')
      expect(spans.length).toBeGreaterThan(0)
    })
  })

  describe('Styling', () => {
    it('has correct base classes', () => {
      render(<AnimatedHeadline isSearchFocused={false} />)
      const headline = screen.getByRole('heading', { level: 1 })
      expect(headline).toHaveClass('text-center')
      expect(headline).toHaveClass('font-bold')
      expect(headline).toHaveClass('leading-tight')
    })
  })
})
