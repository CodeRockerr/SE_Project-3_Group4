import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SmartMenuSearch from '../../app/search/page';

/**
 * Unit tests for frontend conversational refinement
 * Tests localStorage persistence and Clear context button
 */

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('q=test'),
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn()
  })
}));

// Mock fetch globally - will be configured in beforeEach

describe('Frontend - Conversational Refinement', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();

    // Mock successful API response
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        recommendations: [],
        criteria: {
          protein: { min: 30 },
          calories: { max: 500 }
        }
      })
    });
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('localStorage persistence', () => {
    it('should load lastCriteria from localStorage on mount', async () => {
      const mockCriteria = {
        protein: { min: 30 },
        calories: { max: 500 }
      };

      // Pre-populate localStorage
      localStorage.setItem('howl_lastCriteria', JSON.stringify(mockCriteria));

      render(<SmartMenuSearch />);

      // Wait for component to load from localStorage
      await waitFor(() => {
        expect(screen.getByText(/Refining previous search/i)).toBeInTheDocument();
      });
    });

    it('should save lastCriteria to localStorage when search completes', async () => {
      render(<SmartMenuSearch />);

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search for any craving/i)).toBeInTheDocument();
      });

      // Simulate search
      const searchInput = screen.getByPlaceholderText(/Search for any craving/i);
      fireEvent.change(searchInput, { target: { value: 'high protein' } });
      fireEvent.submit(searchInput.closest('form'));

      // Wait for API call to complete
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Check localStorage was updated
      await waitFor(() => {
        const stored = localStorage.getItem('howl_lastCriteria');
        expect(stored).toBeDefined();
        const parsed = JSON.parse(stored);
        expect(parsed.protein).toEqual({ min: 30 });
      });
    });

    it('should handle corrupted localStorage gracefully', async () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('howl_lastCriteria', 'invalid json {');

      // Should not throw, just warn
      const consoleSpy = jest.spyOn(console, 'warn');

      render(<SmartMenuSearch />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load lastCriteria'), expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should clear localStorage when lastCriteria is set to null', async () => {
      const mockCriteria = {
        protein: { min: 30 },
        calories: { max: 500 }
      };

      localStorage.setItem('howl_lastCriteria', JSON.stringify(mockCriteria));

      render(<SmartMenuSearch />);

      // Wait for "Refining previous search" to appear
      await waitFor(() => {
        expect(screen.getByText(/Refining previous search/i)).toBeInTheDocument();
      });

      // Click "Clear context" button
      const clearButton = screen.getByRole('button', { name: /Clear search context/i });
      fireEvent.click(clearButton);

      // Verify localStorage is cleared
      expect(localStorage.getItem('howl_lastCriteria')).toBeNull();
    });
  });

  describe('Clear context button', () => {
    it('should display "Clear context" button when lastCriteria is present', async () => {
      const mockCriteria = {
        protein: { min: 30 },
        calories: { max: 500 }
      };

      localStorage.setItem('howl_lastCriteria', JSON.stringify(mockCriteria));

      render(<SmartMenuSearch />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Clear search context/i })).toBeInTheDocument();
      });
    });

    it('should not display "Clear context" button when lastCriteria is null', async () => {
      // Mock useSearchParams to return empty query so no auto-submit happens
      jest.spyOn(require('next/navigation'), 'useSearchParams').mockReturnValue(new URLSearchParams(''));
      
      render(<SmartMenuSearch />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search for any craving/i)).toBeInTheDocument();
      });

      // Button should not be present initially
      expect(screen.queryByRole('button', { name: /Clear search context/i })).not.toBeInTheDocument();
    });

    it('should clear lastCriteria state when Clear context button is clicked', async () => {
      const mockCriteria = {
        protein: { min: 30 },
        calories: { max: 500 }
      };

      localStorage.setItem('howl_lastCriteria', JSON.stringify(mockCriteria));

      const { rerender } = render(<SmartMenuSearch />);

      await waitFor(() => {
        expect(screen.getByText(/Refining previous search/i)).toBeInTheDocument();
      });

      // Click Clear context
      const clearButton = screen.getByRole('button', { name: /Clear search context/i });
      fireEvent.click(clearButton);

      // Wait for button to disappear
      await waitFor(() => {
        expect(screen.queryByText(/Refining previous search/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Sending previousCriteria in requests', () => {
    it('should send previousCriteria in POST body on refinement search', async () => {
      const mockCriteria = {
        protein: { min: 30 },
        calories: { max: 500 }
      };

      localStorage.setItem('howl_lastCriteria', JSON.stringify(mockCriteria));

      render(<SmartMenuSearch />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search for any craving/i)).toBeInTheDocument();
      });

      // Perform search
      const searchInput = screen.getByPlaceholderText(/Search for any craving/i);
      fireEvent.change(searchInput, { target: { value: 'cheaper options' } });
      fireEvent.submit(searchInput.closest('form'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Verify fetch was called with previousCriteria
      const fetchCall = global.fetch.mock.calls[global.fetch.mock.calls.length - 1];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.previousCriteria).toEqual(mockCriteria);
      expect(requestBody.query).toBe('cheaper options');
    });

    it('should send null previousCriteria on initial search', async () => {
      // Mock useSearchParams to return empty query so no auto-submit happens
      jest.spyOn(require('next/navigation'), 'useSearchParams').mockReturnValue(new URLSearchParams(''));
      
      render(<SmartMenuSearch />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search for any craving/i)).toBeInTheDocument();
      });

      // Perform first search
      const searchInput = screen.getByPlaceholderText(/Search for any craving/i);
      fireEvent.change(searchInput, { target: { value: 'high protein' } });
      fireEvent.submit(searchInput.closest('form'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Find the search request 
      const searchCalls = (global.fetch as jest.Mock).mock.calls.filter(call =>
        call[1] && call[1].body && JSON.parse(call[1].body).query === 'high protein'
      );

      const requestBody = JSON.parse(searchCalls[searchCalls.length - 1][1].body);

      // previousCriteria should not be in the body initially (we only send it when it exists)
      expect(requestBody.previousCriteria).toBeUndefined();
    });
  });

  describe('UI affordance and messaging', () => {
    it('should display "Refining previous search" message when context exists', async () => {
      const mockCriteria = {
        protein: { min: 30 },
        calories: { max: 500 }
      };

      localStorage.setItem('howl_lastCriteria', JSON.stringify(mockCriteria));

      render(<SmartMenuSearch />);

      await waitFor(() => {
        expect(screen.getByText(/Refining previous search/i)).toBeInTheDocument();
      });
    });

    it('should not display context message when no previous search', async () => {
      // Mock useSearchParams to return empty query so no auto-submit happens
      jest.spyOn(require('next/navigation'), 'useSearchParams').mockReturnValue(new URLSearchParams(''));
      
      render(<SmartMenuSearch />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search for any craving/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/Refining previous search/i)).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should handle localStorage write errors silently', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');

      // Mock localStorage.setItem to throw
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      render(<SmartMenuSearch />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search for any craving/i)).toBeInTheDocument();
      });

      // Perform search
      const searchInput = screen.getByPlaceholderText(/Search for any craving/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.submit(searchInput.closest('form'));

      // Should warn but not crash
      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to persist lastCriteria', expect.any(Error));
      });

      consoleWarnSpy.mockRestore();
      setItemSpy.mockRestore();
    });
  });
});
