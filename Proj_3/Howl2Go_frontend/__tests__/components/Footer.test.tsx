import { render, screen } from '@testing-library/react'
import Footer from '@/components/Footer'
import { LanguageProvider } from '@/context/LanguageContext'

const renderWithLanguage = (ui: React.ReactElement) => render(ui, { wrapper: LanguageProvider })

describe('Footer Component', () => {
  it('renders the footer component', () => {
    renderWithLanguage(<Footer />)
    const footer = screen.getByRole('contentinfo')
    expect(footer).toBeInTheDocument()
  })

  it('has the correct height class', () => {
    renderWithLanguage(<Footer />)
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveClass('py-4')
  })

  it('renders without errors', () => {
    const { container } = renderWithLanguage(<Footer />)
    expect(container).toBeInTheDocument()
  })
})
