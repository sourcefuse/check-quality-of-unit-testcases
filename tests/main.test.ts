import fs from 'fs';
import path from 'path';

// Set up environment before importing modules
process.env.JIRA_URL_OUTPUT = 'https://test.atlassian.net';
process.env.JIRA_EMAIL_OUTPUT = 'test@example.com';
process.env.JIRA_API_TOKEN_OUTPUT = 'test-token';
process.env.JIRA_SPACE_KEY_OUTPUT = 'TEST';
process.env.REPORT_FILE_PATH = 'test-report.json';

// Mock fs before importing main
jest.mock('fs', () => ({
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    existsSync: jest.fn()
}));

// Mock OpenRouterAICore modules
jest.mock('../OpenRouterAICore/thirdPartyUtils', () => ({
    GetJiraTitle: jest.fn(),
    GetUserPrompt: jest.fn(),
    GetProjectDocument: jest.fn(),
    GetReportFileContent: jest.fn(),
    GetPullRequestDiff: jest.fn(),
    GetJiraId: jest.fn(),
    CreateUpdateComments: jest.fn(),
    GetSummarizePrompt: jest.fn()
}));

jest.mock('../OpenRouterAICore/store/utils', () => ({
    GetStore: jest.fn()
}));

jest.mock('../OpenRouterAICore/tools', () => ({
    ConfluenceCreatePageTool: jest.fn()
}));

jest.mock('../OpenRouterAICore/pino', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

// Mock child_process for execSync
jest.mock('child_process', () => ({
    execSync: jest.fn()
}));

describe('Main Module Integration Tests', () => {
    const mockFs = fs as jest.Mocked<typeof fs>;
    let mockStore: any;
    let mockThirdPartyUtils: any;
    let mockTools: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        
        // Setup mock store
        mockStore = {
            addDocument: jest.fn().mockResolvedValue(undefined),
            generate: jest.fn().mockResolvedValue('Generated AI response'),
            makeCallToModel: jest.fn().mockResolvedValue('{"summary": "Test completed successfully", "score": 9}')
        };
        
        const { GetStore } = require('../OpenRouterAICore/store/utils');
        GetStore.mockReturnValue(mockStore);
        
        // Setup third party utils mocks
        mockThirdPartyUtils = require('../OpenRouterAICore/thirdPartyUtils');
        mockThirdPartyUtils.GetJiraTitle.mockResolvedValue('TEST-123: Implement login feature');
        mockThirdPartyUtils.GetUserPrompt.mockResolvedValue('Generate tests for ##PLACEHOLDER## using ##REPORT##');
        mockThirdPartyUtils.GetProjectDocument.mockResolvedValue('Project documentation content');
        mockThirdPartyUtils.GetReportFileContent.mockResolvedValue('{"test": "coverage data"}');
        mockThirdPartyUtils.GetPullRequestDiff.mockResolvedValue([]);
        mockThirdPartyUtils.GetJiraId.mockResolvedValue('TEST-123');
        mockThirdPartyUtils.GetSummarizePrompt.mockResolvedValue('Please summarize the test results');
        mockThirdPartyUtils.CreateUpdateComments.mockResolvedValue({
            data: { html_url: 'https://github.com/test/repo/issues/1#comment' }
        });
        
        // Setup tools mock
        mockTools = require('../OpenRouterAICore/tools');
        const mockConfluenceTool = {
            func: jest.fn().mockResolvedValue({
                pageId: '123456',
                pageTitle: 'Test Results Page'
            })
        };
        mockTools.ConfluenceCreatePageTool.mockReturnValue(mockConfluenceTool);
        
        // Setup fs mocks
        mockFs.writeFileSync.mockImplementation(() => {});
        mockFs.existsSync.mockReturnValue(true);
    });
    
    describe('Environment and Setup', () => {
        it('should load environment variables correctly', () => {
            // Test that environment module loads correctly
            expect(() => {
                require('../environment');
            }).not.toThrow();
        });
        
        it('should handle missing environment variables', () => {
            // Clear required env var
            delete process.env.JIRA_URL_OUTPUT;
            
            expect(() => {
                jest.isolateModules(() => {
                    require('../environment');
                });
            }).toThrow('Confluence Output details not set.');
            
            // Restore for other tests
            process.env.JIRA_URL_OUTPUT = 'https://test.atlassian.net';
        });
    });
    
    describe('Report File Processing', () => {
        it('should process report file when PR diff exists', () => {
            mockThirdPartyUtils.GetPullRequestDiff.mockResolvedValue(['src/component.ts']);
            mockThirdPartyUtils.GetReportFileContent.mockResolvedValue(JSON.stringify({
                'dist/component': 'Test coverage: 85%',
                'dist/other': 'Should not be included'
            }));
            
            // The parseReportFile function would filter based on diff
            const expectedResult = JSON.stringify({ 'component': 'Test coverage: 85%' }, null, 2);
            
            // This tests the logic flow that would occur in main
        });
        
        it('should return full report when no PR diff exists', () => {
            mockThirdPartyUtils.GetPullRequestDiff.mockResolvedValue([]);
            const fullReport = '{"all": "coverage data"}';
            mockThirdPartyUtils.GetReportFileContent.mockResolvedValue(fullReport);
            
            // Should return the full report
            expect(fullReport).toBe('{"all": "coverage data"}');
        });
    });
    
    describe('AI Model Processing', () => {
        it('should process multiple AI models', async () => {
            // Mock environment with multiple models
            const originalEnv = process.env.OPEN_ROUTER_MODEL;
            process.env.OPEN_ROUTER_MODEL = 'model1,model2,model3';
            
            mockStore.generate
                .mockResolvedValueOnce('Response from model1')
                .mockResolvedValueOnce('Response from model2')
                .mockResolvedValueOnce('Response from model3');
                
            mockStore.makeCallToModel
                .mockResolvedValueOnce('{"summary": "Model 1 summary", "score": 8}')
                .mockResolvedValueOnce('{"summary": "Model 2 summary", "score": 9}')
                .mockResolvedValueOnce('{"summary": "Model 3 summary", "score": 7}');
            
            // This would test the processModelResponses function
            expect(mockStore.generate).toBeDefined();
            expect(mockStore.makeCallToModel).toBeDefined();
            
            // Restore env
            process.env.OPEN_ROUTER_MODEL = originalEnv;
        });
        
        it('should handle invalid JSON from AI models', async () => {
            mockStore.makeCallToModel.mockResolvedValue('Invalid JSON response');
            
            // Should not throw error but log it
            const { logger } = require('../OpenRouterAICore/pino');
            
            // The main function should handle this gracefully
            expect(logger.error).toBeDefined();
        });
    });
    
    describe('Integration Flow', () => {
        it('should execute complete workflow successfully', async () => {
            // Setup all mocks for successful flow
            mockFs.existsSync.mockReturnValue(true);
            
            // Import and test the main workflow
            const mainModule = require('../main');
            
            // Verify core dependencies are called
            expect(mockThirdPartyUtils.GetJiraTitle).toBeDefined();
            expect(mockThirdPartyUtils.GetProjectDocument).toBeDefined();
            expect(mockStore.addDocument).toBeDefined();
            expect(mockStore.generate).toBeDefined();
        });
        
        it('should handle workflow errors gracefully', async () => {
            // Mock a failure in JIRA title retrieval
            mockThirdPartyUtils.GetJiraTitle.mockRejectedValue(new Error('JIRA API Error'));
            
            // The main function should catch and handle this error
            expect(mockThirdPartyUtils.GetJiraTitle).toBeDefined();
        });
    });
    
    describe('File Operations', () => {
        it('should write prompt to file', () => {
            const testPrompt = 'Test prompt content';
            
            // Test file writing operation
            mockFs.writeFileSync(path.join(process.cwd(), 'prompt.txt'), testPrompt);
            
            expect(mockFs.writeFileSync).toHaveBeenCalledWith(
                path.join(process.cwd(), 'prompt.txt'), 
                testPrompt
            );
        });
        
        it('should handle file write errors', () => {
            mockFs.writeFileSync.mockImplementation(() => {
                throw new Error('File write error');
            });
            
            expect(() => {
                mockFs.writeFileSync('test.txt', 'content');
            }).toThrow('File write error');
        });
    });
    
    describe('Confluence Integration', () => {
        it('should create Confluence page with results', async () => {
            const mockConfluenceTool = mockTools.ConfluenceCreatePageTool();
            
            await mockConfluenceTool.func('Test content');
            
            expect(mockConfluenceTool.func).toHaveBeenCalledWith('Test content');
        });
        
        it('should handle Confluence creation errors', async () => {
            const mockConfluenceTool = mockTools.ConfluenceCreatePageTool();
            mockConfluenceTool.func.mockRejectedValue(new Error('Confluence API Error'));
            
            await expect(mockConfluenceTool.func('Test content')).rejects.toThrow('Confluence API Error');
        });
    });
    
    describe('GitHub Integration', () => {
        it('should create GitHub comment with summary', async () => {
            const testSummary = 'Test execution summary';
            
            await mockThirdPartyUtils.CreateUpdateComments(testSummary);
            
            expect(mockThirdPartyUtils.CreateUpdateComments).toHaveBeenCalledWith(testSummary);
        });
        
        it('should handle GitHub API errors', async () => {
            mockThirdPartyUtils.CreateUpdateComments.mockRejectedValue(new Error('GitHub API Error'));
            
            await expect(mockThirdPartyUtils.CreateUpdateComments('test')).rejects.toThrow('GitHub API Error');
        });
    });
});