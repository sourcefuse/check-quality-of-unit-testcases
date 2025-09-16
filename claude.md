# AI-Powered Unit Test Generation Workflow
*Automated Test Generation from JIRA Tickets and Project Documentation*

## Overview
This Claude.md file defines a comprehensive workflow for analyzing project documents, JIRA details, and generating high-quality unit test cases for React, Angular, and Loopback applications.

---

## Step 1: Project Framework Detection and Analysis

### Task: Analyze Project Structure
```
You are a Senior Full-Stack Developer with expertise in React, Angular, and Loopback frameworks. Your task is to analyze the current project structure and identify the primary framework being used.

**Instructions:**
1. Examine the project root directory for key framework indicators
2. Analyze package.json dependencies and devDependencies
3. Look for framework-specific configuration files
4. Identify the project's testing setup and patterns

**Framework Detection Criteria:**

**React Projects:**
- package.json contains: react, react-dom, @testing-library/react
- Configuration files: vite.config.js, webpack.config.js, craco.config.js
- Directory structure: src/components/, src/hooks/, src/utils/
- Test files: *.test.js, *.test.tsx, __tests__/ directories

**Angular Projects:**
- package.json contains: @angular/core, @angular/cli, @angular/common
- Configuration files: angular.json, tsconfig.json, karma.conf.js
- Directory structure: src/app/, src/environments/
- Test files: *.spec.ts files alongside components

**Loopback Projects:**
- package.json contains: @loopback/core, @loopback/rest, @loopback/repository
- Configuration files: tsconfig.json, .loopbackrc
- Directory structure: src/controllers/, src/models/, src/repositories/
- Test files: src/__tests__/, *.test.ts

**Output Required:**
1. Primary framework identified: [React|Angular|Loopback]
2. Version information
3. Testing framework in use: [Jest|Karma|Mocha|etc.]
4. Key dependencies and their purposes
5. Existing test patterns and structure
6. Project architecture overview (components, services, modules)
```

---

## Step 2: JIRA Document Analysis

### Task: Extract Requirements from JIRA Ticket
```
You are a Senior Business Analyst with expertise in translating JIRA tickets into comprehensive technical requirements. Analyze the provided JIRA ticket document and extract all relevant information for unit test generation.

**JIRA Document Input:** [JIRA_DOCUMENT_CONTENT]

**Analysis Framework:**

**1. Ticket Information Extraction:**
- Ticket ID and title
- Issue type (Story, Bug, Task, Sub-task)
- Priority and severity levels
- Reporter, assignee, and stakeholders
- Sprint/Epic associations

**2. Requirements Analysis:**
- **Functional Requirements:**
  - Core business logic to be implemented
  - User acceptance criteria
  - Expected input/output behavior
  - Data validation rules
  - Business rule implementations

- **Non-Functional Requirements:**
  - Performance expectations
  - Security considerations
  - Accessibility requirements
  - Browser/device compatibility

**3. Technical Specifications:**
- API endpoints to be created/modified
- Database schema changes
- Component interactions
- State management requirements
- External service integrations

**4. Edge Cases and Error Scenarios:**
- Invalid input handling
- Network failure scenarios
- Permission/authorization edge cases
- Data corruption/missing data scenarios
- Concurrent access situations

**5. Acceptance Criteria Breakdown:**
- Given/When/Then scenarios
- Test data requirements
- Expected outcomes for each scenario
- Boundary conditions
- Exception handling requirements

**Output Format:**
```json
{
  "ticketInfo": {
    "id": "PROJ-123",
    "title": "Feature Title",
    "type": "Story",
    "priority": "High"
  },
  "functionalRequirements": [
    "Requirement 1",
    "Requirement 2"
  ],
  "acceptanceCriteria": [
    {
      "given": "Condition",
      "when": "Action",
      "then": "Expected Result"
    }
  ],
  "technicalSpecs": {
    "endpoints": [],
    "components": [],
    "services": []
  },
  "edgeCases": [
    "Edge case 1",
    "Edge case 2"
  ],
  "testDataRequirements": [
    "Test data type 1",
    "Test data type 2"
  ]
}
```
```

---

## Step 3: Project Documentation Context Building

### Task: Analyze Project Documentation for Context
```
You are a Senior Technical Writer and Software Architect. Analyze the provided project documentation to build context for accurate unit test generation.

**Documentation Sources to Analyze:**
1. README.md files
2. API documentation
3. Architecture diagrams
4. Database schemas
5. Configuration files
6. Existing test examples

**Context Building Framework:**

**1. Architecture Understanding:**
- System design patterns used
- Layer separation (presentation, business, data)
- Dependency injection patterns
- State management approach
- Data flow architecture

**2. Code Conventions:**
- Naming conventions
- File organization patterns
- Import/export patterns
- Error handling strategies
- Logging and debugging approaches

**3. Testing Standards:**
- Existing test patterns and conventions
- Mock/stub strategies
- Test data management
- Assertion patterns
- Coverage requirements

**4. Framework-Specific Patterns:**
- Component lifecycle patterns
- Service/provider patterns
- Routing and navigation
- Form handling approaches
- Data binding strategies

**5. External Dependencies:**
- Third-party library usage patterns
- API client configurations
- Database connection patterns
- Authentication/authorization flows
- External service integrations

**Output Required:**
A comprehensive context document that includes:
- Project architecture overview
- Code and testing conventions
- Framework-specific implementation patterns
- Integration points and dependencies
- Best practices and standards to follow
```

---

## Step 4: Framework-Specific Unit Test Generation

### Task A: React Unit Test Generation
```
You are a Senior React Developer with expertise in modern React patterns, hooks, and testing best practices. Generate comprehensive unit tests for React components and hooks.

**Context:** [PROJECT_CONTEXT] [JIRA_REQUIREMENTS]

**React Testing Guidelines:**

**1. Component Testing Approach:**
- Use @testing-library/react for component testing
- Focus on user behavior and interactions
- Test component props, state, and event handlers
- Mock external dependencies appropriately
- Test accessibility features

**2. Hook Testing Strategy:**
- Use @testing-library/react-hooks for custom hooks
- Test hook return values and state changes
- Verify side effects and cleanup
- Test error scenarios and edge cases

**3. Test Structure:**
```javascript
describe('ComponentName', () => {
  // Setup and teardown
  beforeEach(() => {
    // Common setup
  });

  // Props testing
  describe('Props Testing', () => {
    it('should render with required props', () => {});
    it('should handle optional props correctly', () => {});
  });

  // User Interactions
  describe('User Interactions', () => {
    it('should handle click events', () => {});
    it('should handle form submissions', () => {});
  });

  // State Management
  describe('State Management', () => {
    it('should update state correctly', () => {});
    it('should handle state transitions', () => {});
  });

  // Error Scenarios
  describe('Error Scenarios', () => {
    it('should handle API errors', () => {});
    it('should display error messages', () => {});
  });
});
```

**4. Mock Strategies:**
- Mock external APIs using MSW or jest.mock
- Mock React Router navigation
- Mock context providers
- Mock third-party libraries

**Generate comprehensive unit tests that cover:**
- Component rendering with various props
- User interactions (clicks, form inputs, navigation)
- State updates and side effects
- Error handling and loading states
- Accessibility features
- Integration with external services
```

### Task B: Angular Unit Test Generation
```
You are a Senior Angular Developer with expertise in Angular testing patterns, TestBed configuration, and Jasmine/Karma testing frameworks.

**Context:** [PROJECT_CONTEXT] [JIRA_REQUIREMENTS]

**Angular Testing Guidelines:**

**1. Component Testing Setup:**
```typescript
describe('ComponentName', () => {
  let component: ComponentName;
  let fixture: ComponentFixture<ComponentName>;
  let mockService: jasmine.SpyObj<ServiceName>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ServiceName', ['method1', 'method2']);

    await TestBed.configureTestingModule({
      declarations: [ComponentName],
      imports: [CommonModule, ReactiveFormsModule],
      providers: [
        { provide: ServiceName, useValue: spy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentName);
    component = fixture.componentInstance;
    mockService = TestBed.inject(ServiceName) as jasmine.SpyObj<ServiceName>;
  });
});
```

**2. Testing Categories:**
- Component lifecycle (ngOnInit, ngOnDestroy)
- Input/Output property binding
- Template rendering and DOM manipulation
- Form validation and submission
- Service integration and dependency injection
- Route navigation and guards

**3. Service Testing:**
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ServiceName]
    });
    service = TestBed.inject(ServiceName);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should make HTTP requests correctly', () => {
    // Test HTTP service calls
  });
});
```

**Generate comprehensive unit tests covering:**
- Component initialization and destruction
- Template binding and event handling
- Form validation and reactive forms
- HTTP service calls and error handling
- Route navigation and parameter handling
- Directive behavior and template logic
```

### Task C: Loopback Unit Test Generation
```
You are a Senior Backend Developer with expertise in Loopback 4 framework, dependency injection, and API testing patterns.

**Context:** [PROJECT_CONTEXT] [JIRA_REQUIREMENTS]

**Loopback Testing Guidelines:**

**1. Controller Testing Setup:**
```typescript
describe('ControllerName', () => {
  let app: ApplicationName;
  let client: Client;

  before('setupApplication', async () => {
    ({ app, client } = await setupApplication());
  });

  after(async () => {
    await app.stop();
  });

  describe('API Endpoints', () => {
    it('should handle GET requests', async () => {
      const response = await client.get('/endpoint').expect(200);
      // Assertions
    });
  });
});
```

**2. Repository Testing:**
```typescript
describe('RepositoryName', () => {
  let repository: RepositoryName;
  let datasource: juggler.DataSource;

  before(async () => {
    datasource = new juggler.DataSource({
      name: 'db',
      connector: 'memory'
    });
    repository = new RepositoryName(datasource);
  });

  it('should create and retrieve entities', async () => {
    // Test repository operations
  });
});
```

**3. Service Testing Strategy:**
- Mock external dependencies
- Test business logic in isolation
- Verify error handling and validation
- Test transaction management
- Verify security and authorization

**Generate comprehensive unit tests covering:**
- REST API endpoints (CRUD operations)
- Request/response validation
- Authentication and authorization
- Business logic in services
- Repository operations and data access
- Model validation and relationships
- Error handling and exception scenarios
```

---

## Step 5: Test Data Generation and Management

### Task: Generate Realistic Test Data
```
You are a Test Data Specialist with expertise in creating realistic, comprehensive test datasets for automated testing.

**Based on the JIRA requirements and project context, generate:**

**1. Valid Test Data:**
- Realistic user profiles and entities
- Valid input combinations
- Proper data types and formats
- Relationship data (foreign keys, associations)

**2. Invalid Test Data:**
- Boundary value testing data
- Invalid formats and types
- Missing required fields
- Malformed input data

**3. Edge Case Data:**
- Empty/null values
- Maximum/minimum values
- Special characters and unicode
- Large datasets for performance testing

**4. Mock Data Patterns:**
```javascript
// Example factory patterns
const createMockUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  ...overrides
});

const createMockResponse = (data, status = 200) => ({
  data,
  status,
  headers: {},
  config: {}
});
```

**Output comprehensive test data factories and fixtures that support all generated test scenarios.**
```

---

## Step 6: Quality Validation and Review

### Task: Validate Generated Tests
```
You are a Senior QA Engineer and Code Review Specialist. Validate the generated unit tests for quality, completeness, and adherence to best practices.

**Validation Checklist:**

**1. Test Coverage Analysis:**
- [ ] All public methods/functions tested
- [ ] All conditional branches covered
- [ ] Error paths and exception handling tested
- [ ] Edge cases and boundary conditions covered

**2. Test Quality Standards:**
- [ ] Tests are independent and isolated
- [ ] Proper setup and teardown procedures
- [ ] Clear and descriptive test names
- [ ] Appropriate use of mocks and stubs
- [ ] Assertions are specific and meaningful

**3. Framework Best Practices:**
- [ ] Follows framework testing conventions
- [ ] Uses recommended testing utilities
- [ ] Proper async/await handling
- [ ] Correct mock implementation patterns

**4. Code Quality:**
- [ ] No code duplication
- [ ] Proper error handling
- [ ] TypeScript types are correct
- [ ] ESLint/TSLint rules followed

**5. Performance Considerations:**
- [ ] Tests run efficiently
- [ ] Proper cleanup to prevent memory leaks
- [ ] Appropriate test data sizes
- [ ] No unnecessary API calls or delays

**Generate a comprehensive quality report and suggest improvements where needed.**
```

---

## Step 7: Integration and Documentation

### Task: Create Implementation Plan
```
You are a Senior DevOps Engineer and Technical Lead. Create a comprehensive plan for integrating the generated tests into the existing CI/CD pipeline.

**Integration Plan:**

**1. File Organization:**
- Determine test file placement following project conventions
- Create/update test configuration files
- Organize test utilities and helpers

**2. CI/CD Integration:**
- Update GitHub Actions workflow
- Configure test coverage reporting
- Set up quality gates and failure conditions

**3. Documentation:**
- Create README for test execution
- Document test data setup procedures
- Provide troubleshooting guide

**4. Review Process:**
- Create pull request template for generated tests
- Define review criteria and checklist
- Establish feedback and iteration process

**Generate:**
- Complete file structure for generated tests
- Updated CI/CD configuration
- Developer documentation and guidelines
- Rollout and adoption plan
```

---

## Execution Order and Workflow

When implementing this workflow, execute the steps in the following order:

1. **Project Analysis** → Understand the framework and architecture
2. **JIRA Analysis** → Extract requirements and acceptance criteria  
3. **Context Building** → Gather project documentation and patterns
4. **Test Generation** → Generate framework-specific unit tests
5. **Data Generation** → Create comprehensive test data and fixtures
6. **Quality Validation** → Review and validate generated tests
7. **Integration Planning** → Plan deployment and CI/CD integration

Each step builds upon the previous ones, ensuring that the generated tests are contextually appropriate, comprehensive, and maintainable.

---

## Success Metrics

- **Coverage**: 90%+ code coverage on generated tests
- **Quality**: All tests pass initial execution
- **Completeness**: All JIRA acceptance criteria covered by tests
- **Maintainability**: Tests follow project conventions and patterns
- **Performance**: Test execution time under acceptable thresholds