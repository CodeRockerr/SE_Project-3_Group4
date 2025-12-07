import '@testing-library/jest-dom'
import React, { useState, useEffect } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LanguageProvider, useLanguage } from '@/context/LanguageContext'

// Mock Cart component for cart page tests
const MockCartPage = () => {
  const { t, language, setLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div>Loading...</div>

  return (
    <div>
      <h1 data-testid="cart-title">{t('cart.title', 'Shopping Cart')}</h1>
      <div data-testid="cart-empty">{t('cart.emptyCart', 'Your cart is empty')}</div>
      <div data-testid="cart-order-summary">{t('cart.orderSummary', 'Order Summary')}</div>
      <div data-testid="cart-subtotal">{t('cart.subtotal', 'Subtotal')}</div>
      <div data-testid="cart-tax">{t('cart.tax', 'Tax')}</div>
      <div data-testid="cart-delivery">{t('cart.deliveryFee', 'Delivery Fee')}</div>
      <div data-testid="cart-total">{t('cart.total', 'Total')}</div>
      <button onClick={() => setLanguage(language === 'en' ? 'es' : 'en')} data-testid="toggle-lang">
        Toggle Language
      </button>
      <div data-testid="current-lang">{language}</div>
    </div>
  )
}

// Mock Orders component for orders page tests
const MockOrdersPage = () => {
  const { t, language, setLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div>Loading...</div>

  return (
    <div>
      <h1 data-testid="orders-title">{t('orders.title', 'Order History')}</h1>
      <div data-testid="orders-empty">{t('orders.noOrders', 'No Orders Yet')}</div>
      <div data-testid="orders-nutrition">{t('orders.nutritionPatterns', 'Nutrition Patterns')}</div>
      <div data-testid="orders-trends">{t('orders.trends', 'Trends')}</div>
      <div data-testid="orders-recommendations">{t('orders.recommendations', 'Recommendations')}</div>
      <div data-testid="orders-avg-calories">{t('orders.avgCalories', 'Average Calories')}</div>
      <div data-testid="orders-avg-protein">{t('orders.avgProtein', 'Average Protein')}</div>
      <button onClick={() => setLanguage(language === 'en' ? 'es' : 'en')} data-testid="toggle-lang">
        Toggle Language
      </button>
      <div data-testid="current-lang">{language}</div>
    </div>
  )
}

// Mock Recommendations component for ingredient matches page tests
const MockRecommendationsPage = () => {
  const { t, language, setLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div>Loading...</div>

  return (
    <div>
      <h1 data-testid="rec-title">{t('recommendations.title', 'Ingredient Matches')}</h1>
      <div data-testid="rec-subtitle">{t('recommendations.subtitle', 'Build your Plate')}</div>
      <div data-testid="rec-include">{t('recommendations.include', 'Include Ingredients')}</div>
      <div data-testid="rec-exclude">{t('recommendations.exclude', 'Exclude Ingredients')}</div>
      <div data-testid="rec-get-matches">{t('recommendations.getMatches', 'Get Matches')}</div>
      <div data-testid="rec-sort-matches">{t('recommendations.sortMatches', 'Sort: Matches')}</div>
      <div data-testid="rec-sort-calories">{t('recommendations.sortCalories', 'Sort: Calories')}</div>
      <button onClick={() => setLanguage(language === 'en' ? 'es' : 'en')} data-testid="toggle-lang">
        Toggle Language
      </button>
      <div data-testid="current-lang">{language}</div>
    </div>
  )
}

describe('Multi-Language Support - Pages', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Shopping Cart Page Translations', () => {
    it('renders all cart page text in English', () => {
      render(
        <LanguageProvider>
          <MockCartPage />
        </LanguageProvider>
      )

      expect(screen.getByTestId('cart-title')).toHaveTextContent('Shopping Cart')
      expect(screen.getByTestId('cart-empty')).toHaveTextContent('Your cart is empty')
      expect(screen.getByTestId('cart-order-summary')).toHaveTextContent('Order Summary')
      expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('Subtotal')
      expect(screen.getByTestId('cart-tax')).toHaveTextContent('Tax')
      expect(screen.getByTestId('cart-delivery')).toHaveTextContent('Delivery Fee')
      expect(screen.getByTestId('cart-total')).toHaveTextContent('Total')
    })

    it('translates all cart page text to Spanish', async () => {
      render(
        <LanguageProvider>
          <MockCartPage />
        </LanguageProvider>
      )

      const toggleButton = screen.getByTestId('toggle-lang')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('current-lang')).toHaveTextContent('es')
      })

      expect(screen.getByTestId('cart-title')).toHaveTextContent('Carrito de compras')
      expect(screen.getByTestId('cart-empty')).toHaveTextContent('Tu carrito esta vacio')
      expect(screen.getByTestId('cart-order-summary')).toHaveTextContent('Resumen del pedido')
      expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('Subtotal')
      expect(screen.getByTestId('cart-tax')).toHaveTextContent('Impuesto')
      expect(screen.getByTestId('cart-delivery')).toHaveTextContent('Tarifa de entrega')
      expect(screen.getByTestId('cart-total')).toHaveTextContent('Total')
    })

    it('toggles between English and Spanish cart translations', async () => {
      render(
        <LanguageProvider>
          <MockCartPage />
        </LanguageProvider>
      )

      expect(screen.getByTestId('cart-title')).toHaveTextContent('Shopping Cart')

      const toggleButton = screen.getByTestId('toggle-lang')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('cart-title')).toHaveTextContent('Carrito de compras')
      })

      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('cart-title')).toHaveTextContent('Shopping Cart')
      })
    })
  })

  describe('Orders Page Translations', () => {
    it('renders all orders page text in English', () => {
      render(
        <LanguageProvider>
          <MockOrdersPage />
        </LanguageProvider>
      )

      expect(screen.getByTestId('orders-title')).toHaveTextContent('Order History')
      expect(screen.getByTestId('orders-empty')).toHaveTextContent('No Orders Yet')
      expect(screen.getByTestId('orders-nutrition')).toHaveTextContent('Nutrition Patterns')
      expect(screen.getByTestId('orders-trends')).toHaveTextContent('Trends')
      expect(screen.getByTestId('orders-recommendations')).toHaveTextContent('Recommendations')
      expect(screen.getByTestId('orders-avg-calories')).toHaveTextContent('Average Calories')
      expect(screen.getByTestId('orders-avg-protein')).toHaveTextContent('Average Protein')
    })

    it('translates all orders page text to Spanish', async () => {
      render(
        <LanguageProvider>
          <MockOrdersPage />
        </LanguageProvider>
      )

      const toggleButton = screen.getByTestId('toggle-lang')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('current-lang')).toHaveTextContent('es')
      })

      expect(screen.getByTestId('orders-title')).toHaveTextContent('Historial de pedidos')
      expect(screen.getByTestId('orders-empty')).toHaveTextContent('Sin pedidos aun')
      expect(screen.getByTestId('orders-nutrition')).toHaveTextContent('Patrones de nutricion')
      expect(screen.getByTestId('orders-trends')).toHaveTextContent('Tendencias')
      expect(screen.getByTestId('orders-recommendations')).toHaveTextContent('Recomendaciones')
      expect(screen.getByTestId('orders-avg-calories')).toHaveTextContent('Calorias promedio')
      expect(screen.getByTestId('orders-avg-protein')).toHaveTextContent('Proteina promedio')
    })

    it('preserves nutrition data while changing language', async () => {
      render(
        <LanguageProvider>
          <MockOrdersPage />
        </LanguageProvider>
      )

      const nutritionElement = screen.getByTestId('orders-nutrition')
      const initialText = nutritionElement.textContent

      const toggleButton = screen.getByTestId('toggle-lang')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('orders-nutrition')).toHaveTextContent('Patrones de nutricion')
      })

      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(nutritionElement).toHaveTextContent(initialText)
      })
    })
  })

  describe('Recommendations Page Translations', () => {
    it('renders all recommendations page text in English', () => {
      render(
        <LanguageProvider>
          <MockRecommendationsPage />
        </LanguageProvider>
      )

      expect(screen.getByTestId('rec-title')).toHaveTextContent('Ingredient Matches')
      expect(screen.getByTestId('rec-subtitle')).toHaveTextContent('Build your Plate')
      expect(screen.getByTestId('rec-include')).toHaveTextContent('Include Ingredients')
      expect(screen.getByTestId('rec-exclude')).toHaveTextContent('Exclude Ingredients')
      expect(screen.getByTestId('rec-get-matches')).toHaveTextContent('Get Matches')
      expect(screen.getByTestId('rec-sort-matches')).toHaveTextContent('Sort: Matches')
      expect(screen.getByTestId('rec-sort-calories')).toHaveTextContent('Sort: Calories')
    })

    it('translates all recommendations page text to Spanish', async () => {
      render(
        <LanguageProvider>
          <MockRecommendationsPage />
        </LanguageProvider>
      )

      const toggleButton = screen.getByTestId('toggle-lang')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('current-lang')).toHaveTextContent('es')
      })

      expect(screen.getByTestId('rec-title')).toHaveTextContent('Coincidencias por ingredientes')
      expect(screen.getByTestId('rec-include')).toHaveTextContent('Incluir ingredientes')
      expect(screen.getByTestId('rec-exclude')).toHaveTextContent('Excluir ingredientes')
      expect(screen.getByTestId('rec-get-matches')).toHaveTextContent('Obtener coincidencias')
      expect(screen.getByTestId('rec-sort-matches')).toHaveTextContent('Ordenar: coincidencias')
      expect(screen.getByTestId('rec-sort-calories')).toHaveTextContent('Ordenar: calorias')
    })

    it('provides sorting options in selected language', async () => {
      render(
        <LanguageProvider>
          <MockRecommendationsPage />
        </LanguageProvider>
      )

      expect(screen.getByTestId('rec-sort-calories')).toHaveTextContent('Sort: Calories')

      const toggleButton = screen.getByTestId('toggle-lang')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('rec-sort-calories')).toHaveTextContent('Ordenar: calorias')
      })
    })
  })

  describe('Cross-Page Language Consistency', () => {
    it('maintains language state across multiple page renders', async () => {
      const { rerender } = render(
        <LanguageProvider>
          <MockCartPage />
        </LanguageProvider>
      )

      const toggleButton = screen.getByTestId('toggle-lang')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('current-lang')).toHaveTextContent('es')
      })

      // Simulate navigation to orders page
      rerender(
        <LanguageProvider>
          <MockOrdersPage />
        </LanguageProvider>
      )

      // Language should still be Spanish because of localStorage
      await waitFor(() => {
        expect(screen.getByTestId('current-lang')).toHaveTextContent('es')
      })
    })

    it('applies language consistently across all pages', async () => {
      const { rerender } = render(
        <LanguageProvider>
          <MockCartPage />
        </LanguageProvider>
      )

      fireEvent.click(screen.getByTestId('toggle-lang'))

      await waitFor(() => {
        expect(localStorage.getItem('howl2go-language')).toBe('es')
      })

      rerender(
        <LanguageProvider>
          <MockOrdersPage />
        </LanguageProvider>
      )

      expect(screen.getByTestId('orders-title')).toHaveTextContent('Historial de pedidos')

      rerender(
        <LanguageProvider>
          <MockRecommendationsPage />
        </LanguageProvider>
      )

      expect(screen.getByTestId('rec-title')).toHaveTextContent('Coincidencias por ingredientes')
    })
  })

  describe('Language Persistence', () => {
    it('restores Spanish language on page reload', () => {
      localStorage.setItem('howl2go-language', 'es')

      render(
        <LanguageProvider>
          <MockCartPage />
        </LanguageProvider>
      )

      expect(screen.getByTestId('current-lang')).toHaveTextContent('es')
      expect(screen.getByTestId('cart-title')).toHaveTextContent('Carrito de compras')
    })

    it('defaults to English when no preference is set', () => {
      render(
        <LanguageProvider>
          <MockCartPage />
        </LanguageProvider>
      )

      expect(screen.getByTestId('current-lang')).toHaveTextContent('en')
      expect(screen.getByTestId('cart-title')).toHaveTextContent('Shopping Cart')
    })
  })
})
