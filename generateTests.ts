/**
 * AI-Powered Unit Test Generation Pipeline
 * 
 * This module orchestrates the automated generation of unit tests by:
 * 1. Extracting requirements from JIRA tickets
 * 2. Fetching project documentation from Confluence
 * 3. Analyzing the project structure and framework
 * 4. Generating comprehensive unit tests using AI
 * 5. Creating pull requests with generated tests
 */

import fs from 'fs';
import path from 'path';
import {
    GetJiraTitle,
    GetJiraId,
    GetProjectDocument,
    GetUserPrompt,
    CreateUpdateComments,
    GetPullRequestDiff,
} from 'OpenRouterAICore/thirdPartyUtils';
import { ConfluenceSearchTool } from 'OpenRouterAICore/tools';
import { ERRORS, ENV_VARIABLES as GlobalENV } from 'OpenRouterAICore/environment';
import { ENV_VARIABLES } from './environment';
import { GetStore } from 'OpenRouterAICore/store/utils';
import { logger } from 'OpenRouterAICore/pino';
import { CustomError } from 'OpenRouterAICore/customError';
import { execSync } from 'child_process';

interface JiraTicketData {
    id: string;
    title: string;
    description: string;
    acceptanceCriteria: string[];
    issueType: string;
    priority: string;
    customFields?: Record<string, any>;
}

interface ProjectContext {
    framework: 'React' | 'Angular' | 'Loopback' | 'Unknown';
    testingFramework: string;
    projectStructure: string[];
    dependencies: Record<string, string>;
    existingPatterns: string[];
}

interface GeneratedTest {
    fileName: string;
    content: string;
    framework: string;
    coverage: string[];
}

/**
 * Detects the project framework by analyzing package.json and project structure
 */
async function detectProjectFramework(): Promise<ProjectContext> {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    let packageJson: any = {};
    
    try {
        const packageContent = fs.readFileSync(packageJsonPath, 'utf-8');
        packageJson = JSON.parse(packageContent);
    } catch (error) {
        logger.warn('Could not read package.json, attempting to detect framework from structure');
    }

    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Detect framework
    let framework: ProjectContext['framework'] = 'Unknown';
    let testingFramework = 'jest'; // default
    
    if (dependencies['@angular/core']) {
        framework = 'Angular';
        testingFramework = dependencies['karma'] ? 'karma/jasmine' : 'jest';
    } else if (dependencies['react']) {
        framework = 'React';
        testingFramework = dependencies['@testing-library/react'] ? 'react-testing-library' : 'jest';
    } else if (dependencies['@loopback/core']) {
        framework = 'Loopback';
        testingFramework = dependencies['mocha'] ? 'mocha' : 'jest';
    }
    
    // Get project structure
    const projectStructure = getProjectStructure();
    
    // Analyze existing test patterns
    const existingPatterns = analyzeExistingTests(framework);
    
    return {
        framework,
        testingFramework,
        projectStructure,
        dependencies,
        existingPatterns
    };
}

/**
 * Gets the project directory structure for context
 */
function getProjectStructure(): string[] {
    const structure: string[] = [];
    const srcDir = path.join(process.cwd(), 'src');
    
    if (fs.existsSync(srcDir)) {
        const walkDir = (dir: string, prefix = ''): void => {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                if (file.startsWith('.') || file === 'node_modules') return;
                
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                    structure.push(`${prefix}${file}/`);
                    if (prefix.split('/').length < 2) { // Limit depth
                        walkDir(filePath, `${prefix}${file}/`);
                    }
                }
            });
        };
        walkDir(srcDir);
    }
    
    return structure;
}

/**
 * Analyzes existing test patterns in the project
 */
function analyzeExistingTests(framework: string): string[] {
    const patterns: string[] = [];
    const testExtensions = ['.test.ts', '.test.tsx', '.test.js', '.spec.ts', '.spec.js'];
    
    const findTests = (dir: string): void => {
        if (!fs.existsSync(dir)) return;
        
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory() && !file.includes('node_modules')) {
                findTests(filePath);
            } else if (testExtensions.some(ext => file.endsWith(ext))) {
                // Read first test file to understand patterns
                if (patterns.length === 0) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        // Extract test patterns
                        if (content.includes('describe(')) patterns.push('describe/it pattern');
                        if (content.includes('test(')) patterns.push('test pattern');
                        if (content.includes('TestBed')) patterns.push('Angular TestBed');
                        if (content.includes('@testing-library')) patterns.push('React Testing Library');
                    } catch (error) {
                        logger.warn(`Could not read test file: ${filePath}`);
                    }
                }
            }
        });
    };
    
    findTests(process.cwd());
    return patterns;
}

/**
 * Fetches detailed JIRA ticket information
 */
async function fetchJiraTicketDetails(): Promise<JiraTicketData> {
    const jiraId = await GetJiraId();
    const jiraTitle = await GetJiraTitle();
    
    logger.info(`Fetching JIRA ticket details for: ${jiraId}`);
    
    // Fetch additional JIRA details using API
    const jiraApiUrl = `${GlobalENV.JIRA_URL}/rest/api/3/issue/${jiraId}`;
    
    try {
        const response = await fetch(jiraApiUrl, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${GlobalENV.JIRA_EMAIL}:${GlobalENV.JIRA_API_TOKEN}`).toString('base64')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch JIRA ticket: ${response.statusText}`);
        }
        
        const jiraData = await response.json();
        
        // Extract acceptance criteria from description or custom fields
        const description = jiraData.fields.description?.content?.[0]?.content?.[0]?.text || '';
        const acceptanceCriteria = extractAcceptanceCriteria(description);
        
        return {
            id: jiraId,
            title: jiraTitle,
            description,
            acceptanceCriteria,
            issueType: jiraData.fields.issuetype?.name || 'Story',
            priority: jiraData.fields.priority?.name || 'Medium',
            customFields: jiraData.fields
        };
    } catch (error) {
        logger.error(`Error fetching JIRA details: ${error}`);
        // Return basic data if API call fails
        return {
            id: jiraId,
            title: jiraTitle,
            description: '',
            acceptanceCriteria: [],
            issueType: 'Story',
            priority: 'Medium'
        };
    }
}

/**
 * Extracts acceptance criteria from JIRA description
 */
function extractAcceptanceCriteria(description: string): string[] {
    const criteria: string[] = [];
    
    // Look for common patterns in acceptance criteria
    const patterns = [
        /Given.*When.*Then.*/gi,
        /As a.*I want.*So that.*/gi,
        /- \[[ x]\].*/gi,
        /\d+\..*/gi
    ];
    
    patterns.forEach(pattern => {
        const matches = description.match(pattern);
        if (matches) {
            criteria.push(...matches);
        }
    });
    
    return criteria;
}

/**
 * Fetches project documentation from Confluence
 */
async function fetchConfluenceDocumentation(jiraId: string): Promise<string> {
    logger.info('Fetching Confluence documentation...');
    
    try {
        // Use existing GetProjectDocument function
        const projectDoc = await GetProjectDocument();
        
        // Additionally search for related Confluence pages
        const searchTool = ConfluenceSearchTool();
        
        // Search for documentation related to the JIRA ticket
        const searchQuery = `${jiraId} OR "${jiraId.split('-')[0]}" type:page`;
        const searchResults = await searchTool.func(searchQuery);
        
        // Combine all documentation
        let combinedDocs = projectDoc;
        
        if (searchResults && typeof searchResults === 'string') {
            combinedDocs += '\n\n--- Additional Documentation ---\n\n' + searchResults;
        }
        
        return combinedDocs;
    } catch (error) {
        logger.error(`Error fetching Confluence documentation: ${error}`);
        return '';
    }
}

/**
 * Generates the AI prompt for test generation based on framework
 */
function generateTestPrompt(
    context: ProjectContext, 
    jiraData: JiraTicketData, 
    documentation: string
): string {
    // Read the claude.md file for prompt templates
    const claudeMdPath = path.join(__dirname, 'claude.md');
    let claudeMdContent = '';
    
    try {
        claudeMdContent = fs.readFileSync(claudeMdPath, 'utf-8');
    } catch (error) {
        logger.warn('Could not read claude.md, using default prompts');
    }
    
    let prompt = `
# AI Test Generation Task

## Project Context
Framework: ${context.framework}
Testing Framework: ${context.testingFramework}
Project Structure: ${JSON.stringify(context.projectStructure, null, 2)}
Existing Test Patterns: ${context.existingPatterns.join(', ')}

## JIRA Requirements
Ticket ID: ${jiraData.id}
Title: ${jiraData.title}
Type: ${jiraData.issueType}
Priority: ${jiraData.priority}
Description: ${jiraData.description}
Acceptance Criteria:
${jiraData.acceptanceCriteria.map(ac => `- ${ac}`).join('\n')}

## Project Documentation
${documentation}

## Task
`;

    // Add framework-specific prompt based on claude.md content or defaults
    if (context.framework === 'React') {
        prompt += `
Generate comprehensive React unit tests using ${context.testingFramework}.
Follow the patterns identified in the existing codebase.
Include:
- Component rendering tests
- Props validation
- User interaction tests (clicks, forms)
- State management tests
- Error boundary tests
- Accessibility tests
Use @testing-library/react best practices.
`;
    } else if (context.framework === 'Angular') {
        prompt += `
Generate comprehensive Angular unit tests using ${context.testingFramework}.
Follow Angular testing best practices with TestBed.
Include:
- Component initialization tests
- Service injection and mocking
- Input/Output testing
- Form validation tests
- HTTP interceptor tests
- Route guard tests
Use Jasmine matchers and Angular testing utilities.
`;
    } else if (context.framework === 'Loopback') {
        prompt += `
Generate comprehensive Loopback unit tests.
Follow Loopback 4 testing patterns.
Include:
- Controller endpoint tests
- Repository operation tests
- Service business logic tests
- Model validation tests
- Authentication/authorization tests
- Error handling tests
Use Loopback testing utilities and sinon for mocking.
`;
    }
    
    prompt += `
Generate complete, runnable test files with all necessary imports and setup.
Ensure tests cover all acceptance criteria from the JIRA ticket.
Include positive, negative, and edge case scenarios.
`;
    
    return prompt;
}

/**
 * Generates unit tests using AI
 */
async function generateUnitTests(
    prompt: string,
    context: ProjectContext
): Promise<GeneratedTest[]> {
    const store = GetStore();
    const modelNames = GlobalENV.OPEN_ROUTER_MODEL.split(',');
    const generatedTests: GeneratedTest[] = [];
    
    // Add context to vector store
    await store.addDocument(`${GlobalENV.JIRA_PROJECT_KEY}-test-gen`, prompt);
    
    for (const modelName of modelNames) {
        logger.info(`Generating tests with model: ${modelName}`);
        
        try {
            const response = await store.generate(
                modelName.trim(),
                `${GlobalENV.JIRA_PROJECT_KEY}-test-gen`,
                prompt
            );
            
            // Parse the response to extract generated test files
            const tests = parseGeneratedTests(response, context.framework);
            generatedTests.push(...tests);
            
        } catch (error) {
            logger.error(`Error generating tests with ${modelName}: ${error}`);
        }
    }
    
    return generatedTests;
}

/**
 * Parses AI response to extract test files
 */
function parseGeneratedTests(response: string, framework: string): GeneratedTest[] {
    const tests: GeneratedTest[] = [];
    
    // Look for code blocks in the response
    const codeBlockRegex = /```(?:typescript|javascript|ts|js)?\n([\s\S]*?)```/g;
    const fileNameRegex = /(?:\/\/|#)\s*(?:File:|Filename:)\s*(.+)/i;
    
    let match;
    while ((match = codeBlockRegex.exec(response)) !== null) {
        const code = match[1];
        
        // Try to extract filename from comment or use default
        const fileNameMatch = code.match(fileNameRegex);
        let fileName = fileNameMatch ? fileNameMatch[1].trim() : `generated.test.${framework.toLowerCase()}.ts`;
        
        // Extract what the test covers
        const coverage: string[] = [];
        if (code.includes('describe(')) {
            const describeMatches = code.match(/describe\(['"`](.+?)['"`]/g);
            if (describeMatches) {
                coverage.push(...describeMatches.map(m => m.replace(/describe\(['"`]|['"`]/g, '')));
            }
        }
        
        tests.push({
            fileName,
            content: code,
            framework,
            coverage
        });
    }
    
    return tests;
}

/**
 * Writes generated tests to files
 */
async function writeGeneratedTests(tests: GeneratedTest[]): Promise<string[]> {
    const testDir = path.join(process.cwd(), 'generated-tests');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    
    const writtenFiles: string[] = [];
    
    for (const test of tests) {
        const filePath = path.join(testDir, test.fileName);
        
        // Add header comment
        const fileContent = `/**
 * AI-Generated Unit Tests
 * Framework: ${test.framework}
 * Coverage: ${test.coverage.join(', ')}
 * Generated: ${new Date().toISOString()}
 * 
 * Please review and modify as needed before merging
 */

${test.content}`;
        
        fs.writeFileSync(filePath, fileContent);
        writtenFiles.push(filePath);
        logger.info(`Generated test file: ${filePath}`);
    }
    
    return writtenFiles;
}

/**
 * Creates a pull request with generated tests
 */
async function createTestPullRequest(
    jiraData: JiraTicketData,
    generatedFiles: string[]
): Promise<string> {
    const branchName = `test/${jiraData.id}-generated-tests`;
    
    try {
        // Create and checkout new branch
        execSync(`git checkout -b ${branchName}`, { stdio: 'pipe' });
        
        // Add generated test files
        execSync('git add generated-tests/', { stdio: 'pipe' });
        
        // Commit changes
        const commitMessage = `Add AI-generated tests for ${jiraData.id}: ${jiraData.title}

Generated ${generatedFiles.length} test files:
${generatedFiles.map(f => `- ${path.basename(f)}`).join('\n')}

Acceptance Criteria Covered:
${jiraData.acceptanceCriteria.map(ac => `- ${ac}`).join('\n')}`;
        
        execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });
        
        // Push branch
        execSync(`git push -u origin ${branchName}`, { stdio: 'pipe' });
        
        // Create PR using GitHub CLI
        const prBody = `## AI-Generated Unit Tests for ${jiraData.id}

### Summary
This PR contains AI-generated unit tests for JIRA ticket **${jiraData.id}: ${jiraData.title}**

### Generated Files
${generatedFiles.map(f => `- \`${path.basename(f)}\``).join('\n')}

### Coverage
- Business logic validation
- Error scenarios
- Edge cases
- Acceptance criteria validation

### Review Checklist
- [ ] Tests compile without errors
- [ ] Tests run successfully
- [ ] Test assertions are meaningful
- [ ] Coverage meets requirements
- [ ] No duplicate tests
- [ ] Follows project testing patterns

### JIRA Ticket
[${jiraData.id}](${GlobalENV.JIRA_URL}/browse/${jiraData.id})

---
*Generated with AI Test Generation Pipeline*`;

        const prCommand = `gh pr create --title "test: Add unit tests for ${jiraData.id}" --body "${prBody}" --base main`;
        const prOutput = execSync(prCommand, { stdio: 'pipe', encoding: 'utf-8' });
        
        return prOutput.trim();
        
    } catch (error) {
        logger.error(`Error creating pull request: ${error}`);
        throw error;
    }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
    let response = '';
    
    try {
        logger.info('Starting AI-powered unit test generation...');
        
        // Step 1: Detect project framework
        logger.info('Detecting project framework...');
        const projectContext = await detectProjectFramework();
        logger.info(`Detected framework: ${projectContext.framework}`);
        
        // Step 2: Fetch JIRA ticket details
        logger.info('Fetching JIRA ticket details...');
        const jiraData = await fetchJiraTicketDetails();
        logger.info(`Processing ticket: ${jiraData.id} - ${jiraData.title}`);
        
        // Step 3: Fetch Confluence documentation
        logger.info('Fetching project documentation from Confluence...');
        const documentation = await fetchConfluenceDocumentation(jiraData.id);
        
        // Step 4: Generate test prompt
        logger.info('Building AI prompt for test generation...');
        const testPrompt = generateTestPrompt(projectContext, jiraData, documentation);
        
        // Save prompt for debugging
        fs.writeFileSync('test-generation-prompt.txt', testPrompt);
        
        // Step 5: Generate unit tests using AI
        logger.info('Generating unit tests with AI...');
        const generatedTests = await generateUnitTests(testPrompt, projectContext);
        
        if (generatedTests.length === 0) {
            throw new CustomError(
                'NO_TESTS_GENERATED',
                'No tests were generated. Please check the JIRA ticket and documentation.'
            );
        }
        
        logger.info(`Generated ${generatedTests.length} test files`);
        
        // Step 6: Write generated tests to files
        logger.info('Writing generated tests to files...');
        const writtenFiles = await writeGeneratedTests(generatedTests);
        
        // Step 7: Run tests to validate
        logger.info('Validating generated tests...');
        try {
            const testCommand = projectContext.framework === 'Angular' 
                ? 'npm run test -- generated-tests/ --watch=false'
                : 'npm test -- generated-tests/';
            
            execSync(testCommand, { stdio: 'inherit' });
            logger.info('Generated tests passed validation');
        } catch (error) {
            logger.warn('Some generated tests may need manual adjustment');
        }
        
        // Step 8: Create pull request
        logger.info('Creating pull request with generated tests...');
        const prUrl = await createTestPullRequest(jiraData, writtenFiles);
        
        // Step 9: Update JIRA/GitHub with results
        const summaryMessage = `
## ✅ AI Test Generation Complete

**JIRA Ticket:** ${jiraData.id}
**Framework:** ${projectContext.framework}
**Tests Generated:** ${generatedTests.length} files
**Pull Request:** ${prUrl}

### Coverage Summary:
${generatedTests.map(t => `- ${t.fileName}: ${t.coverage.join(', ')}`).join('\n')}

### Next Steps:
1. Review the generated tests in the PR
2. Run tests locally to verify
3. Make any necessary adjustments
4. Merge when ready
`;
        
        await CreateUpdateComments(summaryMessage);
        
        logger.info('Test generation completed successfully!');
        response = summaryMessage;
        
    } catch (error) {
        if (error instanceof CustomError) {
            response = `❌ Test generation failed: ${error.toString()}`;
        } else if (error instanceof Error) {
            response = `❌ Test generation failed: ${error.message}`;
        } else {
            response = `❌ Test generation failed: ${String(error)}`;
        }
        logger.error(response);
    }
    
    // Write final response
    fs.writeFileSync('test-generation-result.txt', response);
    console.log(response);
}

// Execute if run directly
if (require.main === module) {
    main().catch(error => {
        logger.error('Fatal error:', error);
        process.exit(1);
    });
}

export {
    detectProjectFramework,
    fetchJiraTicketDetails,
    fetchConfluenceDocumentation,
    generateUnitTests,
    createTestPullRequest,
    main
};