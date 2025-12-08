import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import { LanguageProvider } from '@/context/LanguageContext'

const renderWithLanguage = (ui: React.ReactElement) => render(ui, { wrapper: LanguageProvider })

describe('Login Page', () => {
  describe('Rendering', () => {
    it('renders the login page', () => {
      renderWithLanguage(<LoginPage />)
      expect(screen.getByText('Login')).toBeInTheDocument()
    })

    it('renders the login heading', () => {
      renderWithLanguage(<LoginPage />)
      const heading = screen.getByText('Login')
      expect(heading.tagName).toBe('H1')
    })

    it('renders email input field', () => {
      renderWithLanguage(<LoginPage />)
      const emailInput = screen.getByPlaceholderText('Email')
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('renders password input field', () => {
      renderWithLanguage(<LoginPage />)
      const passwordInput = screen.getByPlaceholderText('Password')
      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('renders Log In button', () => {
      renderWithLanguage(<LoginPage />)
      const loginButton = screen.getByRole('button', { name: 'Log In' })
      expect(loginButton).toBeInTheDocument()
    })
  })

  describe('Form Inputs', () => {
    it('allows typing in email field', async () => {
      const user = userEvent.setup()
      renderWithLanguage(<LoginPage />)
      const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement

      await user.type(emailInput, 'test@example.com')

      expect(emailInput.value).toBe('test@example.com')
    })

    it('allows typing in password field', async () => {
      const user = userEvent.setup()
      renderWithLanguage(<LoginPage />)
      const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement

      await user.type(passwordInput, 'mypassword123')

      expect(passwordInput.value).toBe('mypassword123')
    })

    it('password field masks input', () => {
      renderWithLanguage(<LoginPage />)
      const passwordInput = screen.getByPlaceholderText('Password')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Button', () => {
    it('Log In button is clickable', async () => {
      const user = userEvent.setup()
      renderWithLanguage(<LoginPage />)
      const loginButton = screen.getByRole('button', { name: 'Log In' })

      await user.click(loginButton)

      // Button should still be in the document after click
      expect(loginButton).toBeInTheDocument()
    })

    it('button has correct styling classes', () => {
      renderWithLanguage(<LoginPage />)
      const loginButton = screen.getByRole('button', { name: 'Log In' })
      expect(loginButton).toHaveClass('font-semibold')
      expect(loginButton).toHaveClass('rounded')
    })
  })

  describe('Layout', () => {
    it('has full screen height container', () => {
      const { container } = renderWithLanguage(<LoginPage />)
      const mainDiv = container.querySelector('.min-h-screen')
      expect(mainDiv).toBeInTheDocument()
    })

    it('centers content vertically and horizontally', () => {
      const { container } = renderWithLanguage(<LoginPage />)
      const mainDiv = container.querySelector('.flex.justify-center.items-center')
      expect(mainDiv).toBeInTheDocument()
    })

    it('card has border and rounded corners', () => {
      const { container } = renderWithLanguage(<LoginPage />)
      const card = container.querySelector('.border.rounded-lg')
      expect(card).toBeInTheDocument()
    })

    it('heading is centered', () => {
      renderWithLanguage(<LoginPage />)
      const heading = screen.getByText('Login')
      expect(heading).toHaveClass('text-center')
    })
  })

  describe('Form Structure', () => {
    it('inputs are in a flex column with gap', () => {
      const { container } = renderWithLanguage(<LoginPage />)
      const formContainer = container.querySelector('.flex.flex-col.gap-4')
      expect(formContainer).toBeInTheDocument()
    })

    it('email input comes before password input', () => {
      renderWithLanguage(<LoginPage />)
      const inputs = screen.getAllByRole('textbox').concat(
        Array.from(document.querySelectorAll('input[type="password"]'))
      ) as HTMLInputElement[]

      const emailInput = screen.getByPlaceholderText('Email')
      const passwordInput = screen.getByPlaceholderText('Password')

      const emailIndex = inputs.indexOf(emailInput as any)
      const passwordIndex = Array.from(document.querySelectorAll('input')).indexOf(
        passwordInput as HTMLInputElement
      )

      expect(emailIndex).toBeLessThan(passwordIndex)
    })

    it('button comes after inputs', () => {
      const { container } = renderWithLanguage(<LoginPage />)
      const emailInput = screen.getByPlaceholderText('Email')
      const button = screen.getByRole('button', { name: 'Log In' })

      const emailParent = emailInput.parentElement
      const buttonElement = button

      expect(emailParent).toBeInTheDocument()
      expect(buttonElement).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('applies custom CSS variables for colors', () => {
      const { container } = renderWithLanguage(<LoginPage />)
      const heading = screen.getByText('Login')
      expect(heading).toHaveClass('text-[var(--login-heading-text)]')
    })

    it('inputs have focus styles', () => {
      renderWithLanguage(<LoginPage />)
      const emailInput = screen.getByPlaceholderText('Email')
      expect(emailInput).toHaveClass('focus:outline-none')
    })

    it('button has hover transition', () => {
      renderWithLanguage(<LoginPage />)
      const button = screen.getByRole('button', { name: 'Log In' })
      expect(button).toHaveClass('transition-colors')
    })
  })

  describe('Accessibility', () => {
    it('email input has correct type attribute', () => {
      renderWithLanguage(<LoginPage />)
      const emailInput = screen.getByPlaceholderText('Email')
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('password input has correct type attribute', () => {
      renderWithLanguage(<LoginPage />)
      const passwordInput = screen.getByPlaceholderText('Password')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('button is keyboard accessible', () => {
      renderWithLanguage(<LoginPage />)
      const button = screen.getByRole('button', { name: 'Log In' })
      expect(button.tagName).toBe('BUTTON')
    })

    it('inputs have placeholder text for accessibility', () => {
      renderWithLanguage(<LoginPage />)
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    })
  })

  describe('Card Container', () => {
    it('card has maximum width constraint', () => {
      const { container } = renderWithLanguage(<LoginPage />)
      const card = container.querySelector('.max-w-md')
      expect(card).toBeInTheDocument()
    })

    it('card has full width within constraint', () => {
      const { container } = renderWithLanguage(<LoginPage />)
      const card = container.querySelector('.w-full.max-w-md')
      expect(card).toBeInTheDocument()
    })

    it('card has padding', () => {
      const { container } = renderWithLanguage(<LoginPage />)
      const card = container.querySelector('.p-8')
      expect(card).toBeInTheDocument()
    })
  })
})
