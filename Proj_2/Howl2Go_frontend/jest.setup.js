// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => {
    return <a href={href}>{children}</a>
  },
}))

// Mock Framer Motion
jest.mock('framer-motion', () => {
  const removeMotionProps = (props) => {
    const {
      initial,
      animate,
      exit,
      variants,
      transition,
      whileHover,
      whileTap,
      whileFocus,
      whileInView,
      drag,
      dragConstraints,
      dragElastic,
      dragMomentum,
      layout,
      layoutId,
      style,
      onAnimationStart,
      onAnimationComplete,
      ...rest
    } = props
    return rest
  }

  return {
    motion: {
      div: ({ children, ...props }) => <div {...removeMotionProps(props)}>{children}</div>,
      span: ({ children, ...props }) => <span {...removeMotionProps(props)}>{children}</span>,
      button: ({ children, ...props }) => <button {...removeMotionProps(props)}>{children}</button>,
      p: ({ children, ...props }) => <p {...removeMotionProps(props)}>{children}</p>,
      h1: ({ children, ...props }) => <h1 {...removeMotionProps(props)}>{children}</h1>,
      header: ({ children, ...props }) => <header {...removeMotionProps(props)}>{children}</header>,
      section: ({ children, ...props }) => <section {...removeMotionProps(props)}>{children}</section>,
      svg: ({ children, ...props }) => <svg {...removeMotionProps(props)}>{children}</svg>,
      path: ({ children, ...props }) => <path {...removeMotionProps(props)}>{children}</path>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
  }
})

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Search: () => <span data-testid="search-icon">Search Icon</span>,
  Menu: () => <span data-testid="menu-icon">Menu Icon</span>,
  ChevronLeft: () => <span data-testid="chevron-left-icon">ChevronLeft Icon</span>,
  ChevronRight: () => <span data-testid="chevron-right-icon">ChevronRight Icon</span>,
  ArrowLeft: () => <span data-testid="arrow-left-icon">ArrowLeft Icon</span>,
  Loader2: () => <span data-testid="loader-icon">Loader Icon</span>,
  Star: () => <span data-testid="star-icon">Star Icon</span>,
  Heart: () => <span data-testid="heart-icon">Heart Icon</span>,
}))

// Mock useRouter
const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
  usePathname: () => '/',
}))

// Make mock functions available globally for tests
global.mockRouterPush = mockPush
global.mockRouterReplace = mockReplace

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Mock fetch globally with a safe default implementation so tests that don't override it
// A small URL-aware fetch mock so tests that don't override fetch get sensible shapes
global.fetch = jest.fn(async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url || ''

  // Orders list should be an array
  if (url.includes('/api/orders/me')) {
    return {
      ok: true,
      status: 200,
      json: async () => ([]),
      text: async () => '[]'
    }
  }

  // Food recommendations should be an object with recommendations array
  if (url.includes('/api/food/recommend')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ recommendations: [] }),
      text: async () => JSON.stringify({ recommendations: [] })
    }
  }

  // Auth endpoints return a simple object by default
  if (url.includes('/api/auth') || url.includes('/api/users')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '{}'
    }
  }

  // Fallback safe shape
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '{}'
  }
})

// Do not redefine `window.location` globally here; let individual tests stub it if needed.
// Make window.location configurable in jsdom so tests can stub/modify it safely
try {
  const currentLocation = window.location
  try {
    // Attempt to delete then redefine; some environments may not allow deletion
    // eslint-disable-next-line no-undef
    delete window.location
  } catch (e) {
    // ignore
  }

  Object.defineProperty(window, 'location', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: {
      href: currentLocation?.href || 'http://localhost',
      assign: jest.fn(),
      replace: jest.fn(),
      toString: () => currentLocation?.href || 'http://localhost'
    }
  })
} catch (e) {
  // ignore if jsdom doesn't allow reconfiguring location
}
