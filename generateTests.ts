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

import * as fs from 'fs';
import * as path from 'path';
import {
    GetJiraTitle,
    GetJiraId,
    GetProjectDocument,
    CreateUpdateComments,
} from 'OpenRouterAICore/thirdPartyUtils';
import { ConfluenceSearchTool } from 'OpenRouterAICore/tools';
import { ENV_VARIABLES as GlobalENV } from 'OpenRouterAICore/environment';
import { GetStore } from 'OpenRouterAICore/store/utils';
import { logger } from 'OpenRouterAICore/pino';
import { CustomError } from 'OpenRouterAICore/customError';
import { execSync } from 'child_process';

// Import helper functions and types
import {
    JiraTicketData,
    ProjectContext,
    PageData,
    validateEnvironmentVariables,
    sanitizeText,
    extractAcceptanceCriteria,
    extractTechnicalTerms,
    ensureTmpDirectory,
    writeTmpFile,
    readPackageJson,
    extractPageIds,
    createPageData,
    generatePageIdReport,
    generatePageCsv,
    generateJiraMarkdown,
    generateProjectDocumentationMarkdown,
    createErrorMessage,
    logError,
    validateJiraData,
    validateProjectContext,
    FRAMEWORK_DETECTION,
    SEARCH_STRATEGIES
} from './generateTests.helpers';

/**
 * Main execution function
 */
async function main(): Promise<void> {
    try {
        logger.info('Starting AI-powered unit test generation...');
        
        // logger.info('Fetching JIRA ticket details...');
        const jiraData = await fetchJiraTicketDetails();
        console.log(jiraData);
        // Step 3: Fetch Confluence documentation (enhanced with JIRA context)
        logger.info('Fetching project documentation from Confluence...');
        // await fetchConfluenceDocumentation(jiraData);
        
        logger.info('Test generation pipeline setup completed successfully!');
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Test generation failed: ${errorMessage}`);
        throw error;
    }
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
 * Fetches detailed JIRA ticket information and writes to tmp/Jira.md
 */
async function fetchJiraTicketDetails(): Promise<JiraTicketData> {
    const jiraId = GetJiraId();
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
        
        const ticketData: JiraTicketData = {
            id: jiraId,
            title: jiraTitle,
            description,
            acceptanceCriteria,
            issueType: jiraData.fields.issuetype?.name || 'Story',
            priority: jiraData.fields.priority?.name || 'Medium'
        };
        
        // Create tmp folder if it doesn't exist
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
            logger.info(`Created tmp directory: ${tmpDir}`);
        }
        
        // Write JIRA data to Jira.md file
        const jiraMarkdown = `# JIRA Ticket Details

## Ticket Information
- **ID**: ${ticketData.id}
- **Title**: ${ticketData.title}
- **Type**: ${ticketData.issueType}
- **Priority**: ${ticketData.priority}

## Description
${ticketData.description}

## Acceptance Criteria
${ticketData.acceptanceCriteria.length > 0 ? ticketData.acceptanceCriteria.map(ac => `- ${ac}`).join('\n') : 'No acceptance criteria found'}
---
*Generated: ${new Date().toISOString()}*
`;
        
        const jiraFilePath = path.join(tmpDir, 'Jira.md');
        fs.writeFileSync(jiraFilePath, jiraMarkdown);
        logger.info(`JIRA details written to: ${jiraFilePath}`);
        
        return ticketData;
    } catch (error) {
        logger.error(`Error fetching JIRA details: ${error}`);
        
        // Create basic data if API call fails
        const ticketData: JiraTicketData = {
            id: jiraId,
            title: jiraTitle,
            description: '',
            acceptanceCriteria: [],
            issueType: 'Story',
            priority: 'Medium'
        };
        
        // Still write to file even with basic data
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
            logger.info(`Created tmp directory: ${tmpDir}`);
        }
        
        const jiraMarkdown = `# JIRA Ticket Details (Basic)

## Ticket Information
- **ID**: ${ticketData.id}
- **Title**: ${ticketData.title}
- **Type**: ${ticketData.issueType}
- **Priority**: ${ticketData.priority}

## Error
Failed to fetch detailed JIRA information. Using basic data.

---
*Generated: ${new Date().toISOString()}*
`;
        
        const jiraFilePath = path.join(tmpDir, 'Jira.md');
        fs.writeFileSync(jiraFilePath, jiraMarkdown);
        logger.info(`Basic JIRA details written to: ${jiraFilePath}`);
        
        return ticketData;
    }
}

/**
 * Extracts acceptance criteria from JIRA description
 */
// extractAcceptanceCriteria function moved to helpers

/**
 * Finds related Confluence documents using vector similarity search based on JIRA ticket
 */
async function findRelatedConfluenceDocuments(jiraData: JiraTicketData): Promise<string[]> {
    logger.info('Finding related Confluence documents using vector search...');
    
    try {
        // Validate required environment variables first
        if (!GlobalENV.JIRA_PROJECT_KEY || GlobalENV.JIRA_PROJECT_KEY.trim() === '') {
            logger.error('JIRA_PROJECT_KEY not set in environment variables');
            return [];
        }
        
        if (!GlobalENV.OPEN_ROUTER_MODEL || GlobalENV.OPEN_ROUTER_MODEL.trim() === '') {
            logger.error('OPEN_ROUTER_MODEL not set in environment variables');
            return [];
        }
        
        if (!GlobalENV.OPEN_ROUTER_API_URL || GlobalENV.OPEN_ROUTER_API_URL.trim() === '') {
            logger.warn('OPEN_ROUTER_API_URL not set in environment variables, skipping vector search');
            return [];
        }
        
        const store = GetStore();
        
        // Create search query from JIRA ticket information
        const searchQuery = createJiraSearchQuery(jiraData);
        logger.info(`Vector search query: ${searchQuery}`);
        
        // Validate search query
        if (!searchQuery || searchQuery.trim().length === 0) {
            logger.warn('Empty search query generated from JIRA data');
            return [];
        }
        
        // Use the vector store to search for related documents
        try {
            const modelName = GlobalENV.OPEN_ROUTER_MODEL.split(',')[0].trim();
            const indexName = `${GlobalENV.JIRA_PROJECT_KEY}-confluence-docs`;
            
            logger.info(`Using model: ${modelName}`);
            logger.info(`Using index: ${indexName}`);
            logger.info(`API URL: ${GlobalENV.OPEN_ROUTER_API_URL}`);
            
            // Try multiple search strategies for better coverage
            const searchStrategies = [
                // Original search query
                `Find and return relevant documentation for: ${searchQuery}`,
                
                // TDD-specific search
                `Find TDD (Test Driven Development) documentation, technical design documents, or API specifications for ${jiraData.id} Virtual Background API management endpoints`,
                
                // API-specific search
                `Find API documentation, technical specifications, or backend implementation details for virtual background management: add, update, delete, set default`,
                
                // Page ID specific search (if we know it exists)
                `Find Confluence page 3999106207 or any TDD document related to ${jiraData.id}`,
                
                // Architecture search
                `Find architecture documentation, technical design, or system specifications for ${jiraData.title}`
            ];
            
            let allResults: string[] = [];
            
            for (let i = 0; i < searchStrategies.length; i++) {
                const strategy = searchStrategies[i];
                logger.info(`Trying search strategy ${i + 1}/${searchStrategies.length}: ${strategy.substring(0, 100)}...`);
                
                try {
                    const vectorResponse = await store.generate(
                        modelName,
                        indexName,
                        strategy
                    );
                    
                    if (vectorResponse && vectorResponse.trim().length > 50) {
                        logger.info(`Strategy ${i + 1} found documentation (${vectorResponse.length} characters)`);
                        allResults.push(`## Search Strategy ${i + 1} Results:\n\n${vectorResponse}`);
                        
                        // Check if this result mentions TDD or the page ID
                        if (vectorResponse.toLowerCase().includes('tdd') || 
                            vectorResponse.toLowerCase().includes('test driven') ||
                            vectorResponse.toLowerCase().includes('3999106207') ||
                            vectorResponse.toLowerCase().includes('technical design')) {
                            logger.info(`Strategy ${i + 1} found potential TDD documentation!`);
                        }
                    } else {
                        logger.warn(`Strategy ${i + 1} returned no relevant results`);
                    }
                    
                    // Add delay between requests to avoid rate limiting
                    if (i < searchStrategies.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                } catch (strategyError) {
                    logger.warn(`Strategy ${i + 1} failed: ${strategyError instanceof Error ? strategyError.message : String(strategyError)}`);
                    // Continue with next strategy
                }
            }
            
            // If we have results, try to also get the specific TDD page as a fallback
            if (allResults.length > 0) {
                // Try to get the specific TDD page via Confluence API if it's not in the vector results
                const hasTDDContent = allResults.some(result => 
                    result.toLowerCase().includes('3999106207') || 
                    result.toLowerCase().includes('tdd') ||
                    result.toLowerCase().includes('test driven')
                );
                
                if (!hasTDDContent) {
                    logger.info('TDD document not found in vector search, attempting direct Confluence page lookup for page 3999106207');
                    try {
                        const tddContent = await fetchSpecificConfluencePage('3999106207');
                        if (tddContent) {
                            allResults.unshift(`## TDD Document (Page 3999106207) - Direct Lookup:\n\n${tddContent}`);
                            logger.info('Successfully retrieved TDD document via direct page lookup');
                        }
                    } catch (tddError) {
                        logger.warn(`Failed to fetch TDD page directly: ${tddError}`);
                    }
                }
                
                const combinedResults = allResults.join('\n\n---\n\n');
                logger.info(`Found ${allResults.length} sets of results via multiple search strategies (${combinedResults.length} total characters)`);
                return [combinedResults];
            } else {
                logger.warn('No relevant documentation found via any search strategy, trying direct page lookup');
                
                // Last resort: try direct page lookup
                try {
                    const tddContent = await fetchSpecificConfluencePage('3999106207');
                    if (tddContent) {
                        logger.info('Found TDD document via direct page lookup as fallback');
                        return [`## TDD Document (Page 3999106207) - Direct Lookup:\n\n${tddContent}`];
                    }
                } catch (tddError) {
                    logger.warn(`Failed to fetch TDD page directly: ${tddError}`);
                }
                
                return [];
            }
            
        } catch (searchError) {
            logger.error(`Vector similarity search failed: ${searchError}`);
            logger.error(`Error details: ${searchError instanceof Error ? searchError.message : String(searchError)}`);
            logger.error(`Stack trace: ${searchError instanceof Error ? searchError.stack : 'No stack trace'}`);
            return [];
        }
        
    } catch (error) {
        logger.error(`Error finding related Confluence documents: ${error}`);
        return [];
    }
}

/**
 * Fetches a specific Confluence page by page ID
 */
async function fetchSpecificConfluencePage(pageId: string): Promise<string | null> {
    logger.info(`Attempting to fetch Confluence page: ${pageId}`);
    
    try {
        // Use the Confluence search tool to get the specific page
        const searchTool = ConfluenceSearchTool();
        
        // Try different search approaches for the specific page
        const searchQueries = [
            `id:${pageId}`,
            `id:"${pageId}"`,
            `page:"${pageId}"`,
            `TDD AND ${pageId}`,
            `"Test Driven Development" AND TEL-9591`,
            `"Technical Design Document" AND "Virtual Background"`,
            `page:${pageId} AND TDD`,
            `page:${pageId} AND "test driven"`
        ];
        
        for (const query of searchQueries) {
            try {
                logger.info(`Trying direct Confluence search: ${query}`);
                const result: unknown = await searchTool.func(query);
                
                if (result && typeof result === 'string' && result.trim().length > 100) {
                    // Check if this looks like it contains the TDD content
                    if (result.toLowerCase().includes('tdd') || 
                        result.toLowerCase().includes('test driven') ||
                        result.toLowerCase().includes('technical design') ||
                        result.toLowerCase().includes(pageId) ||
                        result.toLowerCase().includes('virtual background')) {
                        logger.info(`Found potential TDD content via query: ${query} (${result.length} characters)`);
                        return result;
                    }
                }
                
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (queryError) {
                logger.warn(`Query "${query}" failed: ${queryError}`);
                continue;
            }
        }
        
        logger.warn(`Could not find page ${pageId} via any Confluence search query`);
        return null;
        
    } catch (error) {
        logger.error(`Error fetching specific Confluence page ${pageId}: ${error}`);
        return null;
    }
}

/**
 * Creates a semantic search query from JIRA ticket data
 */
function createJiraSearchQuery(jiraData: JiraTicketData): string {
    const queryParts = [];
    
    try {
        // Add ticket title and description (sanitized)
        if (jiraData.title && typeof jiraData.title === 'string') {
            const sanitizedTitle = jiraData.title.replace(/[{}]/g, '').trim();
            if (sanitizedTitle.length > 0) {
                queryParts.push(sanitizedTitle);
            }
        }
        
        if (jiraData.description && typeof jiraData.description === 'string') {
            const sanitizedDescription = jiraData.description.replace(/[{}]/g, '').trim();
            if (sanitizedDescription.length > 0) {
                queryParts.push(sanitizedDescription);
            }
        }
        
        // Add acceptance criteria (sanitized)
        if (jiraData.acceptanceCriteria && Array.isArray(jiraData.acceptanceCriteria) && jiraData.acceptanceCriteria.length > 0) {
            const sanitizedCriteria = jiraData.acceptanceCriteria
                .map(criterion => typeof criterion === 'string' ? criterion.replace(/[{}]/g, '').trim() : '')
                .filter(criterion => criterion.length > 0);
            if (sanitizedCriteria.length > 0) {
                queryParts.push(sanitizedCriteria.join(' '));
            }
        }
        
        // Add issue type and priority for context (sanitized)
        const issueType = (jiraData.issueType && typeof jiraData.issueType === 'string') 
            ? jiraData.issueType.replace(/[{}]/g, '').trim() 
            : 'Story';
        const priority = (jiraData.priority && typeof jiraData.priority === 'string') 
            ? jiraData.priority.replace(/[{}]/g, '').trim() 
            : 'Medium';
        
        if (issueType.length > 0 || priority.length > 0) {
            queryParts.push(`${issueType} ${priority}`.trim());
        }
        
        // Extract key technical terms and feature names
        const technicalTerms = extractTechnicalTerms(jiraData);
        if (technicalTerms.length > 0) {
            // Sanitize technical terms too
            const sanitizedTerms = technicalTerms
                .map(term => typeof term === 'string' ? term.replace(/[{}]/g, '').trim() : '')
                .filter(term => term.length > 0);
            if (sanitizedTerms.length > 0) {
                queryParts.push(sanitizedTerms.join(' '));
            }
        }
        
        const finalQuery = queryParts.join(' ').trim();
        logger.info(`Created search query: "${finalQuery}" (${finalQuery.length} characters)`);
        
        return finalQuery;
        
    } catch (error) {
        logger.error(`Error creating JIRA search query: ${error}`);
        return `${jiraData?.title || ''} ${jiraData?.issueType || 'Story'}`.replace(/[{}]/g, '').trim();
    }
}

// extractTechnicalTerms function moved to helpers

/**
 * Stores Confluence documents in vector database for similarity search
 */
async function storeConfluenceDocumentsInVector(documents: Array<{title: string, content: string}>): Promise<void> {
    if (!documents || documents.length === 0) {
        logger.info('No documents to store in vector database');
        return;
    }
    
    logger.info(`Storing ${documents.length} Confluence documents in vector database...`);
    
    try {
        const store = GetStore();
        
        let storedCount = 0;
        for (const doc of documents) {
            try {
                // Validate document has required content
                if (!doc.title || !doc.content || doc.content.trim().length < 10) {
                    logger.warn(`Skipping document with insufficient content: ${doc.title}`);
                    continue;
                }
                
                // Create a searchable document with metadata
                const docText = `${doc.title}\n\n${doc.content}`;
                
                // Store document in vector database using the same pattern as main.ts
                await store.addDocument(`${GlobalENV.JIRA_PROJECT_KEY}-confluence-docs`, docText);
                storedCount++;
                
                logger.info(`Stored document: ${doc.title} (${doc.content.length} characters)`);
            } catch (docError) {
                logger.warn(`Failed to store document "${doc.title}": ${docError}`);
            }
        }
        
        logger.info(`Successfully stored ${storedCount}/${documents.length} Confluence documents in vector database`);
    } catch (error) {
        logger.error(`Error storing Confluence documents in vector database: ${error}`);
    }
}

/**
 * Fetches project documentation from Confluence using vector search and writes to tmp/Project.md
 * First populates vector database with project documentation, then searches for relevant content
 */
async function fetchConfluenceDocumentation(jiraData?: JiraTicketData): Promise<string> {
    logger.info('Fetching and indexing project documentation...');
    
    try {
        // Validate required environment variables
        if (!GlobalENV.JIRA_PROJECT_KEY || GlobalENV.JIRA_PROJECT_KEY.trim() === '') {
            throw new Error('JIRA_PROJECT_KEY not set in environment variables');
        }
        
        const store = GetStore();
        
        // First, get and store the main project documentation in vector database (like main.ts)
        logger.info('Adding project documentation to vector database...');
        const projectDocument = await GetProjectDocument();
        
        if (projectDocument && projectDocument.trim().length > 0) {
            const indexName = `${GlobalENV.JIRA_PROJECT_KEY}-confluence-docs`;
            logger.info(`Adding document to index: ${indexName}`);
            await store.addDocument(indexName, projectDocument);
            logger.info(`Project documentation added to vector database (${projectDocument.length} characters)`);
        } else {
            logger.warn('No project documentation found to add to vector database');
        }
        
        // If JIRA data is provided, find related documents using vector search
        let relatedDocsFromVector: string[] = [];
        if (jiraData) {
            logger.info('Finding JIRA-related documents using vector search...');
            
            // Try to find related documents using vector search
            relatedDocsFromVector = await findRelatedConfluenceDocuments(jiraData);
            if (relatedDocsFromVector.length > 0) {
                logger.info(`Found ${relatedDocsFromVector.length} related documents via vector search`);
            }
        }
        
        let formattedDocs = '';
        let totalPages = 0;
        
        // Process only vector-found related documents
        if (relatedDocsFromVector.length > 0) {
            relatedDocsFromVector.forEach((docContent, index) => {
                const docTitle = `Related Document ${index + 1} (Vector Search)`;
                formattedDocs += formatConfluenceContent(docTitle, docContent);
                totalPages++;
            });
        }
        
        // Create tmp folder if it doesn't exist
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
            logger.info(`Created tmp directory: ${tmpDir}`);
        }
        
        // Create formatted markdown content with only vector search results
        const projectMarkdown = `# Project Documentation (Vector Search Results)

## Documentation Summary
- **Source**: Confluence Vector Search
- **Vector-Found Documents**: ${relatedDocsFromVector.length}
- **Total Length**: ${formattedDocs.length} characters
- **JIRA Context**: ${jiraData ? `${jiraData.id} - ${jiraData.title}` : 'None'}
- **Generated**: ${new Date().toISOString()}

${jiraData ? `## JIRA Context
- **Ticket**: ${jiraData.id}
- **Title**: ${jiraData.title}
- **Type**: ${jiraData.issueType}
- **Priority**: ${jiraData.priority}
- **Description**: ${jiraData.description || 'No description available'}

---` : ''}

${formattedDocs || '## No Related Documents Found\n\nNo related Confluence documentation was found via vector search.\n\nNote: Project documentation has been indexed for future searches.'}

---
*End of Vector Search Results*
`;
        
        // Write to Project.md file
        const projectFilePath = path.join(tmpDir, 'Project.md');
        fs.writeFileSync(projectFilePath, projectMarkdown);
        logger.info(`Vector search results written to: ${projectFilePath} (${totalPages} documents)`);
        
        // Return vector search results
        return formattedDocs;
        
    } catch (error) {
        logger.error(`Error fetching Confluence documentation: ${error}`);
        
        // Create tmp folder if it doesn't exist
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
            logger.info(`Created tmp directory: ${tmpDir}`);
        }
        
        // Write error information to file
        const errorMarkdown = `# Project Documentation (Vector Search Error)

## Error Details
- **Source**: Confluence Vector Search (Failed)
- **Error Time**: ${new Date().toISOString()}

## Error Message
\`\`\`
${error}
\`\`\`

## Status
No documentation available due to vector search error.

---
*Error Documentation Generated*
`;
        
        const projectFilePath = path.join(tmpDir, 'Project.md');
        fs.writeFileSync(projectFilePath, errorMarkdown);
        logger.info(`Error documentation written to: ${projectFilePath}`);
        
        return '';
    }
}

/**
 * Formats Confluence content with proper markdown structure
 */
function formatConfluenceContent(title: string, content: string): string {
    if (!content || content.trim().length === 0) {
        return `\n\n## ${title}\n\n*No content available*\n\n`;
    }
    
    // Clean up the title
    const cleanTitle = title.replace(/[#\n\r]/g, '').trim();
    
    // Clean up content - remove excessive whitespace but preserve structure
    const cleanContent = content
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove triple+ newlines
        .replace(/^\s+|\s+$/g, '') // Trim start/end whitespace
        .replace(/\r\n/g, '\n'); // Normalize line endings
    
    return `\n\n## ${cleanTitle}\n\n${cleanContent}\n\n`;
}

/**
 * Attempts to extract individual pages from Confluence search results
 */
function extractConfluencePages(searchResults: string): Array<{title: string, content: string}> {
    const pages: Array<{title: string, content: string}> = [];
    
    try {
        // Look for common Confluence page separators or patterns
        const pagePatterns = [
            /Page:\s*([^\n]+)\n([\s\S]*?)(?=Page:\s*[^\n]+\n|$)/gi,
            /Title:\s*([^\n]+)\n([\s\S]*?)(?=Title:\s*[^\n]+\n|$)/gi,
            /^([A-Z][^:\n]{10,100})\n={3,}\n([\s\S]*?)(?=^[A-Z][^:\n]{10,100}\n={3,}|$)/gmi,
            /^## ([^\n]+)\n([\s\S]*?)(?=^## [^\n]+\n|$)/gmi
        ];
        
        let foundPages = false;
        
        for (const pattern of pagePatterns) {
            const matches = Array.from(searchResults.matchAll(pattern));
            if (matches.length > 1) { // Only use if we find multiple pages
                matches.forEach(match => {
                    if (match[1] && match[2]) {
                        pages.push({
                            title: match[1].trim(),
                            content: match[2].trim()
                        });
                    }
                });
                foundPages = true;
                break; // Use the first pattern that finds multiple pages
            }
        }
        
        // If no clear page separation found, look for date-based entries (common in meeting notes)
        if (!foundPages) {
            const datePattern = /(\d{4}-\d{2}-\d{2}[^:\n]*(?:Meeting|Notes|Report)[^\n]*)\n([\s\S]*?)(?=\d{4}-\d{2}-\d{2}[^:\n]*(?:Meeting|Notes|Report)|$)/gi;
            const dateMatches = Array.from(searchResults.matchAll(datePattern));
            
            if (dateMatches.length > 1) {
                dateMatches.forEach(match => {
                    if (match[1] && match[2]) {
                        pages.push({
                            title: match[1].trim(),
                            content: match[2].trim()
                        });
                    }
                });
                foundPages = true;
            }
        }
    } catch (error) {
        logger.warn(`Error extracting Confluence pages: ${error}`);
    }
    
    return pages;
}

/**
 * Creates JIRA-specific search queries for finding related Confluence documents
 */
function createJiraRelatedSearchQueries(jiraData: JiraTicketData): string[] {
    const queries: string[] = [];
    
    // Search by ticket ID and related tickets
    if (jiraData.id) {
        queries.push(`type:page AND (${jiraData.id} OR "${jiraData.id.split('-')[0]}")`);
    }
    
    // Search by feature/component names extracted from title
    const featureTerms = extractFeatureTerms(jiraData.title);
    if (featureTerms.length > 0) {
        queries.push(`type:page AND (${featureTerms.join(' OR ')})`);
    }
    
    // Search by technical terms from description
    const technicalTerms = extractTechnicalTerms(jiraData);
    if (technicalTerms.length > 0) {
        const uniqueTerms = Array.from(new Set(technicalTerms)).slice(0, 5); // Limit to top 5 terms
        queries.push(`type:page AND (${uniqueTerms.join(' OR ')})`);
    }
    
    // Search by issue type specific terms
    const issueTypeQueries = getIssueTypeSpecificQueries(jiraData.issueType);
    queries.push(...issueTypeQueries);
    
    return queries;
}

/**
 * Extracts feature names and components from JIRA title
 */
function extractFeatureTerms(title: string): string[] {
    if (!title || typeof title !== 'string') {
        return [];
    }
    
    const terms: string[] = [];
    
    try {
        // Look for common feature patterns
        const patterns = [
            /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:feature|component|module|service|API|endpoint)\b/gi,
            /\b(?:implement|create|add|build)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
            /\b([A-Z][a-z]+)\s+(?:management|system|portal|dashboard|interface)\b/gi
        ];
        
        patterns.forEach(pattern => {
            const matches = title.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    try {
                        const cleaned = match.replace(/\b(?:implement|create|add|build|feature|component|module|service|API|endpoint)\b/gi, '').trim();
                        if (cleaned.length > 2) {
                            terms.push(`"${cleaned}"`);
                        }
                    } catch (replaceError) {
                        logger.warn(`Error processing match "${match}": ${replaceError}`);
                    }
                });
            }
        });
    } catch (error) {
        logger.warn(`Error extracting feature terms from title "${title}": ${error}`);
    }
    
    return Array.from(new Set(terms));
}

/**
 * Gets search queries specific to JIRA issue types
 */
function getIssueTypeSpecificQueries(issueType: string): string[] {
    const queries: string[] = [];
    
    switch (issueType.toLowerCase()) {
        case 'story':
        case 'user story':
            queries.push('type:page AND (requirements OR specifications OR "user story" OR workflow)');
            break;
        case 'bug':
        case 'defect':
            queries.push('type:page AND (troubleshooting OR "known issues" OR debugging OR errors)');
            break;
        case 'task':
            queries.push('type:page AND (implementation OR "how to" OR procedures OR guidelines)');
            break;
        case 'epic':
            queries.push('type:page AND (roadmap OR strategy OR "high level" OR overview)');
            break;
        case 'improvement':
        case 'enhancement':
            queries.push('type:page AND (optimization OR performance OR enhancement OR improvements)');
            break;
        default:
            queries.push('type:page AND (documentation OR specifications)');
    }
    
    return queries;
}

/**
 * Extracts documents from formatted markdown for vector storage
 */
function extractDocumentsForVectorStorage(formattedDocs: string): Array<{title: string, content: string}> {
    const documents: Array<{title: string, content: string}> = [];
    
    if (!formattedDocs || typeof formattedDocs !== 'string') {
        logger.warn('No formatted docs provided for vector storage extraction');
        return documents;
    }
    
    try {
        // Split by markdown headers
        const sections = formattedDocs.split(/\n\n## /);
        
        sections.forEach((section, index) => {
            try {
                if (section.trim().length > 0) {
                    const lines = section.trim().split('\n');
                    let title = lines[0];
                    
                    // Clean up title
                    if (index === 0 && title.startsWith('## ')) {
                        title = title.substring(3);
                    }
                    
                    const content = lines.slice(1).join('\n').trim();
                    
                    if (title && content && content.length > 50) { // Only store substantial content
                        documents.push({
                            title: title.trim(),
                            content: content
                        });
                    }
                }
            } catch (sectionError) {
                logger.warn(`Error processing document section ${index}: ${sectionError}`);
            }
        });
    } catch (error) {
        logger.error(`Error extracting documents for vector storage: ${error}`);
    }
    
    return documents;
}








// Execute if run directly
if (require.main === module) {
    main().catch(error => {
        logger.error('Fatal error:', error);
        process.exit(1);
    });
}