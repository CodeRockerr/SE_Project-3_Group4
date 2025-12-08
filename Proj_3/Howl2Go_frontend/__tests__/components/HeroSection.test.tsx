import { render, screen, fireEvent } from '@testing-library/react'
import HeroSection from '@/components/HeroSection'

// Mock child components
jest.mock('@/components/AnimatedHeadline', () => {
  return function MockAnimatedHeadline({ isSearchFocused }: any) {
    return <div data-testid="animated-headline">Headline {isSearchFocused ? 'Focused' : 'Normal'}</div>
  }
})

jest.mock('@/components/SearchBar', () => {
  return function MockSearchBar({
    isDemoMode,
    isSearchFocused,
    inputValue,
    onInputChange,
    onSearchFocus,
    onSearchBlur,
  }: any) {
    return (
      <div data-testid="search-bar">
        <input
          data-testid="search-input"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={onSearchFocus}
          onBlur={onSearchBlur}
          placeholder={isDemoMode ? 'Demo' : 'Live'}
        />
        <span data-testid="mode">{isDemoMode ? 'Demo' : 'Live'}</span>
        <span data-testid="focus-state">{isSearchFocused ? 'Focused' : 'Blurred'}</span>
      </div>
    )
  }
})

jest.mock('@/components/SearchResults', () => {
  return function MockSearchResults() {
    return <div data-testid="search-results">Search Results</div>
  }
})

describe('HeroSection Component', () => {
  const mockOnSearchFocusChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })


  describe('Initial State', () => {
    it('renders the hero section', () => {
      render(<HeroSection onSearchFocusChange={mockOnSearchFocusChange} />)
      expect(screen.getByTestId('animated-headline')).toBeInTheDocument()
      expect(screen.getByTestId('search-bar')).toBeInTheDocument()
    })

    it('starts in demo mode', () => {
      render(<HeroSection onSearchFocusChange={mockOnSearchFocusChange} />)
      expect(screen.getByTestId('mode')).toHaveTextContent('Demo')
    })

    it('starts with search not focused', () => {
      render(<HeroSection onSearchFocusChange={mockOnSearchFocusChange} />)
      expect(screen.getByTestId('focus-state')).toHaveTextContent('Blurred')
    })

    it('starts with empty input value', () => {
      render(<HeroSection onSearchFocusChange={mockOnSearchFocusChange} />)
      const input = screen.getByTestId('search-input') as HTMLInputElement
      expect(input.value).toBe('')
    })
  })

  describe('Mode Switching', () => {
    it('switches to live mode when search is focused', () => {
      render(<HeroSection onSearchFocusChange={mockOnSearchFocusChange} />)
      const input = screen.getByTestId('search-input')

      fireEvent.focus(input)

      expect(screen.getByTestId('mode')).toHaveTextContent('Live')
      expect(screen.getByTestId('focus-state')).toHaveTextContent('Focused')
    })

    it('returns to demo mode when input is blurred and empty', () => {
      render(<HeroSection onSearchFocusChange={mockOnSearchFocusChange} />)
      const input = screen.getByTestId('search-input')

      fireEvent.focus(input)
      fireEvent.blur(input)

      expect(screen.getByTestId('mode')).toHaveTextContent('Demo')
    })

    it('calls onSearchFocusChange when focus state changes', () => {
      render(<HeroSection onSearchFocusChange={mockOnSearchFocusChange} />)
      const input = screen.getByTestId('search-input')

      fireEvent.focus(input)
      expect(mockOnSearchFocusChange).toHaveBeenCalledWith(true)

      fireEvent.blur(input)
      expect(mockOnSearchFocusChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Component Structure', () => {
    it('renders within a section element', () => {
      const { container } = render(<HeroSection onSearchFocusChange={mockOnSearchFocusChange} />)
      const section = container.querySelector('section')
      expect(section).toBeInTheDocument()
    })

    it('renders all main child components', () => {
      render(<HeroSection onSearchFocusChange={mockOnSearchFocusChange} />)
      expect(screen.getByTestId('animated-headline')).toBeInTheDocument()
      expect(screen.getByTestId('search-bar')).toBeInTheDocument()
    })
  })
})
