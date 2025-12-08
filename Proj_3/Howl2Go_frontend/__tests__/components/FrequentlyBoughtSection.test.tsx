import { render, screen, fireEvent } from '@testing-library/react'
import FrequentlyBoughtSection from '@/components/FrequentlyBoughtSection'
import { LanguageProvider } from '@/context/LanguageContext'

const renderWithLanguage = (ui: React.ReactElement) => render(ui, { wrapper: LanguageProvider })

// Mock DishCard component since we're testing FrequentlyBoughtSection in isolation
jest.mock('@/components/DishCard', () => {
  return function MockDishCard({ index }: { index: number }) {
    return <div data-testid={`dish-card-${index}`}>Dish {index}</div>
  }
})

describe('FrequentlyBoughtSection Component', () => {
  beforeEach(() => {
    // Mock scrollBy method on HTMLDivElement
    HTMLDivElement.prototype.scrollBy = jest.fn()
  })

  describe('Rendering', () => {
    it('renders the section', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      expect(screen.getByText('Frequently Bought')).toBeInTheDocument()
    })

    it('renders section heading', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const heading = screen.getByText('Frequently Bought')
      expect(heading.tagName).toBe('H2')
    })

    it('renders decorative underline', () => {
      const { container } = renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const underline = container.querySelector('.h-1.w-20.bg-\\[var\\(--howl-primary\\)\\]')
      expect(underline).toBeInTheDocument()
    })
  })

  describe('Scroll Buttons', () => {
    it('renders left scroll button', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const leftButton = screen.getByLabelText('Scroll left')
      expect(leftButton).toBeInTheDocument()
    })

    it('renders right scroll button', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const rightButton = screen.getByLabelText('Scroll right')
      expect(rightButton).toBeInTheDocument()
    })

    it('left button has chevron left icon', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const leftButton = screen.getByLabelText('Scroll left')
      const icon = leftButton.querySelector('[data-testid="chevron-left-icon"]')
      expect(icon).toBeInTheDocument()
    })

    it('right button has chevron right icon', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const rightButton = screen.getByLabelText('Scroll right')
      const icon = rightButton.querySelector('[data-testid="chevron-right-icon"]')
      expect(icon).toBeInTheDocument()
    })

    it('left scroll button calls scrollBy with negative value', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const leftButton = screen.getByLabelText('Scroll left')
      const scrollMock = jest.fn()

      // Find the carousel container and mock its scrollBy
      const carousel = screen.getByText('Dish 1').closest('.flex.gap-8') as HTMLElement
      if (carousel) {
        carousel.scrollBy = scrollMock
      }

      fireEvent.click(leftButton)

      expect(scrollMock).toHaveBeenCalledWith({
        left: -300,
        behavior: 'smooth',
      })
    })

    it('right scroll button calls scrollBy with positive value', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const rightButton = screen.getByLabelText('Scroll right')
      const scrollMock = jest.fn()

      // Find the carousel container and mock its scrollBy
      const carousel = screen.getByText('Dish 1').closest('.flex.gap-8') as HTMLElement
      if (carousel) {
        carousel.scrollBy = scrollMock
      }

      fireEvent.click(rightButton)

      expect(scrollMock).toHaveBeenCalledWith({
        left: 300,
        behavior: 'smooth',
      })
    })
  })

  describe('Dish Cards', () => {
    it('renders 10 dish cards', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByTestId(`dish-card-${i}`)).toBeInTheDocument()
      }
    })

    it('dish cards are in a scrollable container', () => {
      const { container } = renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const scrollContainer = container.querySelector('.overflow-x-auto')
      expect(scrollContainer).toBeInTheDocument()
    })

    it('each dish card is wrapped in a flex-none container', () => {
      const { container } = renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const flexNoneContainers = container.querySelectorAll('.flex-none')
      expect(flexNoneContainers.length).toBe(10)
    })
  })

  describe('Focus State', () => {
    it('renders correctly when search is not focused', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      expect(screen.getByText('Frequently Bought')).toBeInTheDocument()
    })

    it('renders correctly when search is focused', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={true} />)
      expect(screen.getByText('Frequently Bought')).toBeInTheDocument()
    })

    it('all content is still visible when focused', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={true} />)
      expect(screen.getByText('Frequently Bought')).toBeInTheDocument()
      expect(screen.getByTestId('dish-card-1')).toBeInTheDocument()
      expect(screen.getByLabelText('Scroll left')).toBeInTheDocument()
    })
  })

  describe('Layout Structure', () => {
    it('has header with title and scroll buttons in same row', () => {
      const { container } = renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const header = container.querySelector('.flex.items-center.justify-between')
      expect(header).toBeInTheDocument()
    })

    it('buttons are grouped together', () => {
      const { container } = renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const buttonGroup = container.querySelector('.flex.gap-2')
      expect(buttonGroup).toBeInTheDocument()
      const buttons = buttonGroup?.querySelectorAll('button')
      expect(buttons?.length).toBe(2)
    })
  })

  describe('Accessibility', () => {
    it('scroll buttons have descriptive aria-labels', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      expect(screen.getByLabelText('Scroll left')).toBeInTheDocument()
      expect(screen.getByLabelText('Scroll right')).toBeInTheDocument()
    })

    it('section is wrapped in a section tag', () => {
      const { container } = renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const section = container.querySelector('section')
      expect(section).toBeInTheDocument()
    })

    it('heading has appropriate heading level', () => {
      renderWithLanguage(<FrequentlyBoughtSection isSearchFocused={false} />)
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Frequently Bought')
    })
  })
})
