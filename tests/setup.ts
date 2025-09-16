/**
 * Jest Test Setup File
 * Configures the test environment and global mocks
 */

// Suppress console output during tests unless explicitly needed
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// Mock fetch globally
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
    jest.restoreAllMocks();
});