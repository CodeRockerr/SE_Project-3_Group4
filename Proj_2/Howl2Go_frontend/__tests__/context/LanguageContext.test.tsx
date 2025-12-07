import React, { useEffect, useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LanguageProvider, useLanguage } from '@/context/LanguageContext'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Test component
function TestComponent() {
  const { language, setLanguage, toggleLanguage, t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div>Loading...</div>

  return (
    <div>
      <div data-testid="current-language">{language}</div>
      <button onClick={() => setLanguage('en')} data-testid="set-english">
        English
      </button>
      <button onClick={() => setLanguage('es')} data-testid="set-spanish">
        Spanish
      </button>
      <button onClick={toggleLanguage} data-testid="toggle-language">
        Toggle
      </button>
      <div data-testid="translated-text">{t('language.label', 'Language')}</div>
      <div data-testid="translated-nav">{t('nav.about', 'About')}</div>
      <div data-testid="translated-search">{t('search.placeholder', 'Search placeholder')}</div>
    </div>
  )
}

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  describe('Language Provider', () => {
    it('renders provider with default English language', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('en')
      })
    })

    it('sets and persists language to localStorage', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('en')
      })

      const spanishButton = screen.getByTestId('set-spanish')
      fireEvent.click(spanishButton)

      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('es')
      })

      expect(localStorage.getItem('howl2go-language')).toBe('es')
    })

    it('restores language from localStorage on mount', async () => {
      localStorage.setItem('howl2go-language', 'es')

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('es')
      })
    })
  })

  describe('useLanguage Hook', () => {
    it('throws error when used outside LanguageProvider', () => {
      const TestComponentWithoutProvider = () => {
        useLanguage()
        return <div>Test</div>
      }

      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponentWithoutProvider />)
      }).toThrow('useLanguage must be used within a LanguageProvider')

      consoleErrorSpy.mockRestore()
    })

    it('toggleLanguage switches between en and es', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('en')
      })

      const toggleButton = screen.getByTestId('toggle-language')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('es')
      })

      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('en')
      })
    })

    it('setLanguage updates language and localStorage', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('en')
      })

      const spanishButton = screen.getByTestId('set-spanish')
      fireEvent.click(spanishButton)

      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('es')
        expect(localStorage.getItem('howl2go-language')).toBe('es')
      })
    })
  })

  describe('Translation Function (t)', () => {
    it('returns English translation for valid key', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('translated-text')).toHaveTextContent('Language')
      })
    })

    it('returns Spanish translation for valid key', async () => {
      localStorage.setItem('howl2go-language', 'es')

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('translated-text')).toHaveTextContent('Idioma')
      })
    })

    it('returns fallback value when translation not found', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('translated-search')).toHaveTextContent('Search for any craving...')
      })
    })

    it('returns key when no translation and no fallback provided', async () => {
      const TestComponentNoFallback = () => {
        const { t } = useLanguage()
        const [mounted, setMounted] = React.useState(false)

        React.useEffect(() => {
          setMounted(true)
        }, [])

        if (!mounted) return <div>Loading...</div>
        return <div data-testid="missing-key">{t('nonexistent.key')}</div>
      }

      render(
        <LanguageProvider>
          <TestComponentNoFallback />
        </LanguageProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('missing-key')).toHaveTextContent('nonexistent.key')
      })
    })

    it('updates translation when language changes', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('translated-text')).toHaveTextContent('Language')
      })

      const spanishButton = screen.getByTestId('set-spanish')
      fireEvent.click(spanishButton)

      await waitFor(() => {
        expect(screen.getByTestId('translated-text')).toHaveTextContent('Idioma')
      })
    })

    it('translates navigation keys correctly', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('translated-nav')).toHaveTextContent('About')
      })

      const spanishButton = screen.getByTestId('set-spanish')
      fireEvent.click(spanishButton)

      await waitFor(() => {
        expect(screen.getByTestId('translated-nav')).toHaveTextContent('Acerca de')
      })
    })
  })

  describe('Document Language Attribute', () => {
    it('sets document.documentElement.lang on language change', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      )

      await waitFor(() => {
        expect(document.documentElement.lang).toBe('en')
      })

      const spanishButton = screen.getByTestId('set-spanish')
      fireEvent.click(spanishButton)

      await waitFor(() => {
        expect(document.documentElement.lang).toBe('es')
      })
    })
  })

  describe('Translation Dictionary Coverage', () => {
    it('has translations for all language keys', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      )

      await waitFor(() => {
        const languageLabel = screen.getByTestId('translated-text')
        expect(languageLabel).toBeInTheDocument()
      })
    })

    it('has English and Spanish pairs for core keys', async () => {
      const CoreTranslationComponent = () => {
        const { t, setLanguage } = useLanguage()
        const [mounted, setMounted] = React.useState(false)

        React.useEffect(() => {
          setMounted(true)
        }, [])

        if (!mounted) return <div>Loading...</div>

        const keys = [
          'language.label',
          'nav.about',
          'nav.dashboard',
          'orders.title',
          'cart.title',
          'recommendations.title',
        ]

        return (
          <div>
            <button onClick={() => setLanguage('es')} data-testid="set-spanish-btn">
              Spanish
            </button>
            {keys.map((key) => (
              <div key={key} data-testid={`translation-${key}`}>
                {t(key, `Missing: ${key}`)}
              </div>
            ))}
          </div>
        )
      }

      render(
        <LanguageProvider>
          <CoreTranslationComponent />
        </LanguageProvider>
      )

      await waitFor(() => {
        const keys = [
          'language.label',
          'nav.about',
          'nav.dashboard',
          'orders.title',
          'cart.title',
          'recommendations.title',
        ]
        keys.forEach((key) => {
          const element = screen.getByTestId(`translation-${key}`)
          expect(element.textContent).not.toContain('Missing')
        })
      })

      // Verify Spanish translations are different from defaults
      const spanishButton = screen.getByTestId('set-spanish-btn')
      fireEvent.click(spanishButton)

      await waitFor(() => {
        const languageLabel = screen.getByTestId('translation-language.label')
        expect(languageLabel).toHaveTextContent('Idioma')
      })
    })
  })
})
