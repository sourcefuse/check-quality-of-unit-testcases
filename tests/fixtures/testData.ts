/**
 * Test Data Fixtures for Unit Tests
 * Provides mock data factories for consistent test scenarios
 */

export const MockJiraData = {
    validTicket: {
        id: 'TEST-123',
        title: 'Implement user authentication feature',
        description: 'As a user, I want to login securely so that I can access protected resources',
        acceptanceCriteria: [
            'Given user provides valid credentials When they submit login form Then they are authenticated',
            'Given user provides invalid credentials When they submit login form Then error is displayed',
            'Given user is not authenticated When they access protected route Then they are redirected to login'
        ],
        issueType: 'Story',
        priority: 'High',
        customFields: {
            storyPoints: 5,
            sprint: 'Sprint 23',
            epic: 'Authentication Epic'
        }
    },
    
    bugTicket: {
        id: 'BUG-456',
        title: 'Fix login form validation error',
        description: 'Login form allows submission with empty password field',
        acceptanceCriteria: [
            'Password field should be required',
            'Error message should display when password is empty'
        ],
        issueType: 'Bug',
        priority: 'Critical'
    },
    
    minimalTicket: {
        id: 'MIN-789',
        title: 'Simple task',
        description: '',
        acceptanceCriteria: [],
        issueType: 'Task',
        priority: 'Low'
    }
};

export const MockConfluenceData = {
    projectDocumentation: `
# Project Architecture
## Overview
This project follows a microservices architecture with the following components:
- Frontend: React application
- Backend: Node.js with Express
- Database: PostgreSQL
- Cache: Redis

## API Endpoints
### Authentication
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/verify

## Testing Standards
- Minimum 80% code coverage
- All public methods must have tests
- Use mocks for external dependencies
`,
    
    apiDocumentation: `
# API Documentation
## Authentication Endpoints

### POST /api/auth/login
Request:
{
  "email": "string",
  "password": "string"
}

Response:
{
  "token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string"
  }
}

Error Responses:
- 401: Invalid credentials
- 400: Missing required fields
- 500: Server error
`,
    
    emptyDocumentation: ''
};

export const MockGitHubData = {
    pullRequestDiff: [
        'src/components/LoginForm.tsx',
        'src/services/authService.ts',
        'src/utils/validators.ts'
    ],
    
    reportFile: {
        'dist/components/LoginForm': 'Component test report content',
        'dist/services/authService': 'Service test report content',
        'dist/utils/validators': 'Validators test report content',
        'dist/unrelated/file': 'Should not be included'
    },
    
    emptyDiff: [],
    
    emptyReport: {}
};

export const MockEnvironmentVariables = {
    valid: {
        GITHUB_TOKEN: 'ghp_test_token_123',
        GITHUB_OWNER: 'test-owner',
        GITHUB_REPO: 'test-repo',
        GITHUB_ISSUE_NUMBER: '42',
        JIRA_URL: 'https://test.atlassian.net',
        JIRA_EMAIL: 'test@example.com',
        JIRA_API_TOKEN: 'jira_token_123',
        JIRA_PROJECT_KEY: 'TEST',
        JIRA_SPACE_KEY_OUTPUT: 'TEST_SPACE',
        OPEN_ROUTER_API_URL: 'https://api.openrouter.ai',
        OPEN_ROUTER_API_KEY: 'or_test_key_123',
        OPEN_ROUTER_MODEL: 'gpt-4,claude-2',
        PROJECT_DOCUMENT_PATH: '/wiki/project-docs',
        USE_FOR: 'unit-testing',
        REPORT_FILE_PATH: 'coverage/report.json',
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY: 'AKIA_TEST',
        AWS_SECRET_KEY: 'secret_test',
        S3_BUCKET_NAME: 'test-bucket',
        DOCKER_USERNAME: 'testuser',
        DOCKER_PASSWORD: 'testpass'
    },
    
    minimal: {
        GITHUB_TOKEN: 'token',
        GITHUB_OWNER: 'owner',
        GITHUB_REPO: 'repo',
        JIRA_URL_OUTPUT: 'https://jira.test.com',
        JIRA_EMAIL_OUTPUT: 'test@test.com',
        JIRA_API_TOKEN_OUTPUT: 'token',
        JIRA_SPACE_KEY_OUTPUT: 'SPACE',
        REPORT_FILE_PATH: 'report.json'
    },
    
    invalid: {
        // Missing required fields
        GITHUB_OWNER: 'owner',
        GITHUB_REPO: 'repo'
    }
};

export const MockProjectStructures = {
    reactProject: {
        packageJson: {
            name: 'react-app',
            version: '1.0.0',
            dependencies: {
                'react': '^18.2.0',
                'react-dom': '^18.2.0',
                'react-router-dom': '^6.8.0'
            },
            devDependencies: {
                '@testing-library/react': '^14.0.0',
                '@testing-library/jest-dom': '^5.16.5',
                'jest': '^29.5.0'
            }
        },
        structure: [
            'src/',
            'src/components/',
            'src/hooks/',
            'src/services/',
            'src/utils/',
            'src/__tests__/'
        ]
    },
    
    angularProject: {
        packageJson: {
            name: 'angular-app',
            version: '1.0.0',
            dependencies: {
                '@angular/animations': '^15.2.0',
                '@angular/common': '^15.2.0',
                '@angular/core': '^15.2.0',
                '@angular/forms': '^15.2.0',
                '@angular/platform-browser': '^15.2.0'
            },
            devDependencies: {
                'karma': '^6.4.1',
                'karma-jasmine': '^5.1.0',
                'jasmine-core': '^4.5.0',
                '@angular/cli': '^15.2.0'
            }
        },
        structure: [
            'src/',
            'src/app/',
            'src/app/components/',
            'src/app/services/',
            'src/app/models/',
            'src/environments/'
        ]
    },
    
    loopbackProject: {
        packageJson: {
            name: 'loopback-app',
            version: '1.0.0',
            dependencies: {
                '@loopback/boot': '^5.0.0',
                '@loopback/core': '^4.0.0',
                '@loopback/repository': '^5.0.0',
                '@loopback/rest': '^12.0.0',
                '@loopback/rest-explorer': '^5.0.0',
                '@loopback/service-proxy': '^5.0.0'
            },
            devDependencies: {
                '@loopback/testlab': '^5.0.0',
                'mocha': '^10.2.0',
                'source-map-support': '^0.5.21'
            }
        },
        structure: [
            'src/',
            'src/controllers/',
            'src/models/',
            'src/repositories/',
            'src/services/',
            'src/__tests__/'
        ]
    }
};

export const MockAIResponses = {
    validTestGeneration: `
Here are the generated unit tests:

\`\`\`typescript
// File: LoginForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';
import { authService } from '../services/authService';

jest.mock('../services/authService');

describe('LoginForm Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    it('should render login form with email and password fields', () => {
        render(<LoginForm />);
        
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });
    
    it('should handle successful login', async () => {
        const mockLogin = authService.login as jest.Mock;
        mockLogin.mockResolvedValue({ token: 'test-token', user: { id: '1' }});
        
        render(<LoginForm />);
        
        fireEvent.change(screen.getByLabelText(/email/i), { 
            target: { value: 'test@example.com' }
        });
        fireEvent.change(screen.getByLabelText(/password/i), { 
            target: { value: 'password123' }
        });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));
        
        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
        });
    });
    
    it('should display error on failed login', async () => {
        const mockLogin = authService.login as jest.Mock;
        mockLogin.mockRejectedValue(new Error('Invalid credentials'));
        
        render(<LoginForm />);
        
        fireEvent.click(screen.getByRole('button', { name: /login/i }));
        
        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });
    });
});
\`\`\`

\`\`\`typescript
// File: authService.test.ts
import { authService } from './authService';
import { apiClient } from '../utils/apiClient';

jest.mock('../utils/apiClient');

describe('AuthService', () => {
    describe('login', () => {
        it('should return user data on successful login', async () => {
            const mockResponse = {
                token: 'jwt-token',
                user: { id: '1', email: 'test@example.com' }
            };
            
            (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });
            
            const result = await authService.login('test@example.com', 'password');
            
            expect(result).toEqual(mockResponse);
            expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
                email: 'test@example.com',
                password: 'password'
            });
        });
    });
});
\`\`\`
`,
    
    summarizedTestReport: {
        summary: 'Successfully generated 2 test files covering LoginForm component and authService with 90% coverage',
        score: 9,
        details: {
            filesGenerated: 2,
            testCases: 5,
            coverage: '90%'
        }
    },
    
    invalidResponse: 'This is not a valid test generation response',
    
    emptyCodeBlocks: 'No tests could be generated for the given requirements'
};

export const MockStoreResponses = {
    generate: MockAIResponses.validTestGeneration,
    makeCallToModel: JSON.stringify(MockAIResponses.summarizedTestReport)
};

/**
 * Factory functions for creating test data
 */
export const TestDataFactory = {
    createJiraTicket: (overrides = {}) => ({
        ...MockJiraData.validTicket,
        ...overrides
    }),
    
    createProjectContext: (framework: 'React' | 'Angular' | 'Loopback' = 'React') => {
        const projects = {
            React: MockProjectStructures.reactProject,
            Angular: MockProjectStructures.angularProject,
            Loopback: MockProjectStructures.loopbackProject
        };
        
        return {
            framework,
            testingFramework: framework === 'Angular' ? 'karma/jasmine' : 
                             framework === 'Loopback' ? 'mocha' : 'jest',
            projectStructure: projects[framework].structure,
            dependencies: projects[framework].packageJson.dependencies,
            existingPatterns: []
        };
    },
    
    createEnvironment: (overrides = {}) => ({
        ...MockEnvironmentVariables.valid,
        ...overrides
    }),
    
    createGeneratedTest: (overrides = {}) => ({
        fileName: 'generated.test.ts',
        content: 'describe("Test", () => { it("should pass", () => {}); });',
        framework: 'React',
        coverage: ['Component tests'],
        ...overrides
    })
};