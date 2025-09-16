# Unit Test Suite

This directory contains comprehensive unit tests for the AI-powered unit test generation pipeline.

## Test Structure

### Test Files

- **`main.test.ts`** - Tests for the main workflow orchestration
- **`createVariables.test.ts`** - Tests for GitHub repository variable/secret management
- **`generateTests.test.ts`** - Tests for the AI test generation pipeline
- **`environment.test.ts`** - Tests for environment variable loading and validation

### Supporting Files

- **`fixtures/testData.ts`** - Mock data factories and test fixtures
- **`setup.ts`** - Jest configuration and global test setup
- **`README.md`** - This documentation

## Running Tests

### Prerequisites

Install test dependencies:
```bash
npm install
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- main.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should handle"
```

## Test Coverage

The test suite aims for 80%+ coverage across:
- **Branches**: 80%
- **Functions**: 80% 
- **Lines**: 80%
- **Statements**: 80%

Current coverage includes:

### Main Module (`main.ts`)
- ✅ Report file parsing logic
- ✅ Model response processing 
- ✅ Error handling scenarios
- ✅ Confluence integration
- ✅ GitHub comment creation

### Create Variables Module (`createVariables.ts`)
- ✅ Environment variable validation
- ✅ GitHub API integration
- ✅ Secret encryption with libsodium
- ✅ User prompt interactions
- ✅ Error handling for API failures

### Generate Tests Module (`generateTests.ts`)
- ✅ Framework detection (React/Angular/Loopback)
- ✅ JIRA ticket analysis
- ✅ Confluence documentation fetching
- ✅ AI test generation pipeline
- ✅ Pull request creation
- ✅ Git operations

### Environment Module (`environment.ts`)
- ✅ Environment file loading
- ✅ Stage-specific configuration
- ✅ Variable validation
- ✅ Error handling for missing variables

## Test Data and Fixtures

The `fixtures/testData.ts` file provides:

### Mock Data
- **JIRA ticket data** - Valid tickets, bugs, minimal tickets
- **Confluence documentation** - Project docs, API docs, empty docs
- **GitHub data** - PR diffs, report files, empty states
- **Environment variables** - Valid, minimal, and invalid configs
- **Project structures** - React, Angular, and Loopback examples
- **AI responses** - Valid test generation, summaries, error cases

### Factory Functions
```typescript
import { TestDataFactory } from './fixtures/testData';

// Create JIRA ticket with overrides
const ticket = TestDataFactory.createJiraTicket({
    priority: 'Critical',
    issueType: 'Bug'
});

// Create project context for specific framework
const context = TestDataFactory.createProjectContext('Angular');

// Create environment configuration
const env = TestDataFactory.createEnvironment({
    JIRA_URL: 'https://custom.atlassian.net'
});
```

## Testing Patterns

### Mocking Strategy

The tests use comprehensive mocking for external dependencies:

```typescript
// File system operations
jest.mock('fs');

// External APIs
jest.mock('octokit');
jest.mock('../OpenRouterAICore/thirdPartyUtils');

// Environment and configuration
jest.mock('../OpenRouterAICore/environment');
```

### Test Structure

Each test file follows a consistent pattern:

```typescript
describe('ModuleName', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup mocks
    });
    
    describe('FunctionName', () => {
        it('should handle success case', () => {
            // Test successful execution
        });
        
        it('should handle error case', () => {
            // Test error scenarios
        });
        
        it('should validate inputs', () => {
            // Test input validation
        });
    });
});
```

### Error Testing

All tests include comprehensive error handling verification:
- Network failures
- Invalid inputs
- Missing environment variables
- File system errors
- API rate limiting

## Quality Standards

### Code Coverage
- Maintain 80%+ coverage across all metrics
- Test all public functions and methods
- Include edge cases and error scenarios

### Test Quality
- Clear, descriptive test names
- Independent test cases (no test dependencies)
- Proper setup and teardown
- Meaningful assertions

### Performance
- Tests complete in under 10 seconds total
- Efficient mocking to avoid network calls
- Minimal resource usage

## Contributing to Tests

### Adding New Tests

1. Create test file: `[module-name].test.ts`
2. Add imports and mock setup
3. Follow existing patterns and structure
4. Include positive, negative, and edge cases
5. Add mock data to `fixtures/testData.ts` if needed

### Best Practices

- **Isolate modules**: Use `jest.isolateModules()` when testing module-level code
- **Mock external dependencies**: Don't make real API calls in tests
- **Test error paths**: Include failure scenarios for better coverage
- **Use descriptive names**: Test names should explain what is being tested
- **Keep tests focused**: One assertion per test when possible

### Example Test Addition

```typescript
describe('NewFunction', () => {
    it('should process valid input correctly', () => {
        const input = TestDataFactory.createValidInput();
        
        const result = moduleUnderTest.newFunction(input);
        
        expect(result).toBeDefined();
        expect(result.status).toBe('success');
    });
    
    it('should handle invalid input with proper error', () => {
        const invalidInput = TestDataFactory.createInvalidInput();
        
        expect(() => {
            moduleUnderTest.newFunction(invalidInput);
        }).toThrow('Invalid input provided');
    });
});
```

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Check `moduleNameMapper` in `jest.config.js`
   - Verify import paths match file structure

2. **Mock not working**
   - Ensure mock is declared before imports
   - Use `jest.clearAllMocks()` in `beforeEach`

3. **Coverage not accurate**
   - Check `collectCoverageFrom` patterns
   - Exclude test files and node_modules

4. **Async tests failing**
   - Use `await` with async operations
   - Return promises or use done callback

### Debug Commands

```bash
# Run with debugging output
npm test -- --verbose

# Debug specific test
npm test -- --testNamePattern="specific test" --verbose

# Run single test file with debugging
npm test -- main.test.ts --verbose

# Check test coverage details
npm run test:coverage -- --verbose
```

## Integration with CI/CD

The test suite integrates with GitHub Actions:

```yaml
# In .github/workflows/test.yml
- name: Run Tests
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

This ensures all pull requests maintain code quality and test coverage standards.