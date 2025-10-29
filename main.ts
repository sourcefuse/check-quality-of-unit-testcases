/**
 * Main entry point for the RAG (Retrieval-Augmented Generation) workflow.
 *
 * This function orchestrates the following steps:
 * 1. Validates the presence of a report file path in environment variables.
 * 2. Retrieves the Jira ticket title and project documentation.
 * 3. Adds the project document to the vector store for retrieval.
 * 4. Prepares a user prompt by injecting the Jira title and report content.
 * 5. Writes the prepared prompt to a file for debugging or logging purposes.
 * 6. Iterates over the configured LLM model names, generating responses for each,
 *    and aggregates the results.
 * 7. Writes the final response(s) to an output file and logs the process.
 * 8. Handles errors gracefully, writing error messages to the output file and logging them.
 *
 * @returns {Promise<string>} The aggregated response from all models, or an error message.
 */
import fs from 'fs';
import {
    GetJiraTitle,
    GetUserPrompt,
    GetProjectDocument,
    GetReportFileContent,
    GetPullRequestDiff,
    GetJiraId,
    CreateUpdateComments,
    GetSummarizePrompt,
} from 'OpenRouterAICore/thirdPartyUtils';

import { ERRORS, ENV_VARIABLES as GlobalENV } from 'OpenRouterAICore/environment';
import { ENV_VARIABLES } from './environment';
import { GetStore } from 'OpenRouterAICore/store/utils';
import { logger } from 'OpenRouterAICore/pino';
import { ConfluenceCreatePageTool } from 'OpenRouterAICore/tools';
import { CustomError } from 'OpenRouterAICore/customError';

/**
 * Parses and filters the test report file based on Pull Request changes
 * @returns Filtered report content as JSON string, or empty string if parsing fails
 */
async function parseReportFile(): Promise<string> {
    try {
        const files = await GetPullRequestDiff();
        const filteredFiles = files.map(f => f.replace('src', 'dist').replace('.ts', ''));
        const reportPath = process.cwd() + '/' + ENV_VARIABLES.REPORT_FILE_PATH;
        let reportFileContent = await GetReportFileContent(reportPath);

        // If no files in PR, return full report
        if (filteredFiles.length === 0) {
            return reportFileContent;
        }

        const reportFileJson = JSON.parse(reportFileContent);
        const result: Record<string, string> = {};

        // Filter report to only include files changed in PR
        for (const fileKey of Object.keys(reportFileJson)) {
            if (filteredFiles.some(f => fileKey.includes(f))) {
                const fileName = fileKey.split('/').pop() || fileKey;
                result[fileName] = reportFileJson[fileKey];
            }
        }

        // Return filtered results if any, otherwise return full report
        if (Object.keys(result).length > 0) {
            return JSON.stringify(result, null, 2);
        }
        return reportFileContent;
    } catch (error) {
        console.error('Error parsing report file:', error);
        logger.error('Error in parsing Report', error);
        return '';
    }
}

/**
 * Generates the summary response header with Jira branding
 * @returns HTML formatted summary header string
 */
function getSummaryResponseString(): string {
    return `[![Foo](https://sourcefuse.atlassian.net/s/vf1kch/b/9/7104e5158390e41d6b3edd0f16b03d29/_/jira-favicon-scaled.png)](https:/sourcefuse.atlassian.net/) \n` +
        `## Quality Checker Overview`;
}

/**
 * Generates an HTML link to the GitHub Pull Request
 * @returns HTML anchor tag with PR link
 */
function getPRLink(): string {
    return `<a href="https://github.com/${GlobalENV.GITHUB_OWNER}/${GlobalENV.GITHUB_REPO}/pull/${GlobalENV.GITHUB_ISSUE_NUMBER}" target="_blank">Link</a>`;
}

/**
 * Generates an HTML link to the Confluence page
 * @param createPageResponse - Response object from Confluence page creation
 * @returns HTML anchor tag with Confluence page link
 */
function getConfluenceLink(createPageResponse: { pageId: string; pageTitle: string }): string {
    return `<a target="_blank" href="${ENV_VARIABLES.JIRA_URL_OUTPUT}/wiki/spaces/` +
        `${ENV_VARIABLES.JIRA_SPACE_KEY_OUTPUT}/pages/` +
        `${createPageResponse.pageId}/${createPageResponse.pageTitle}">link</a>`;
}

/**
 * Processes AI model responses for test quality analysis
 * Calls each configured model, generates responses and summaries
 *
 * @param modelNames - Array of AI model names to use
 * @param store - Vector store instance for RAG
 * @param userPrompt - The user prompt for quality analysis
 * @param summaryResponse - Initial summary response string
 * @returns Object containing full response and summary response
 * @throws Error if API calls fail (rate limits, authentication, etc.)
 */
async function processModelResponses(
    modelNames: string[],
    store: any,
    userPrompt: string,
    summaryResponse: string
): Promise<{ response: string; summaryResponse: string }> {
    let response = '';
    for (const modelName of modelNames) {
        try {
            logger.info(`🤖 Calling AI Model: ${modelName}`);
            console.log(`📡 Making API call to OpenRouter with model: ${modelName.trim()}`);

            let storeResponse: string = await store.generate(
                modelName.trim(),
                GlobalENV.JIRA_PROJECT_KEY + '-index',
                userPrompt
            );
            console.log(`✅ Received response from model: ${modelName}`);

            response += `<b>ResponseModel:-</b> ${modelName} <br /><br/>`;
            response += storeResponse;

            logger.info(`📊 Generating summary for model: ${modelName}`);
            console.log(`📡 Making summary API call to OpenRouter with model: ${modelName}`);

            let sResponse: string = await store.makeCallToModel(
                modelName, storeResponse,
                GetSummarizePrompt()
            );
            console.log(`✅ Received summary from model: ${modelName}`);

            sResponse = sResponse.split('```json').join('').split('```').join('');
            try {
                let sResponseJson = JSON.parse(sResponse);
                summaryResponse += `\n<b>Model:-</b> ${modelName}`;
                summaryResponse += `\n<b>Summary:-</b> ${sResponseJson.summary}`;
                summaryResponse += `\n<b>Score:-</b> ${sResponseJson.score}`;
            } catch (e) {
                logger.error(`Failed to parse summary JSON for model ${modelName}:`, e);
            }
            if (modelNames.length > 1)
                response += '<br /><br /><br />=================================<br />';
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            const statusCode = error?.status || error?.statusCode || error?.response?.status;

            console.error(`❌ Error with model ${modelName}:`);
            console.error(`   Status Code: ${statusCode || 'N/A'}`);
            console.error(`   Error Message: ${errorMessage}`);

            if (statusCode === 429 || errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
                console.error(`\n⚠️  RATE LIMIT ERROR (429) - Too Many Requests`);
                console.error(`   Source: OpenRouter AI API`);
                console.error(`   Model: ${modelName}`);
                console.error(`   Action: Check your OpenRouter API rate limits and credits`);
                console.error(`   URL: https://openrouter.ai/account`);
                console.error(`   Tip: Wait a few minutes and try again, or upgrade your plan\n`);
            }

            logger.error(`Error processing model ${modelName}:`, error);
            throw error; // Re-throw to be caught by main error handler
        }
    }
    return { response, summaryResponse };
}

/**
 * Main execution function for test quality analysis workflow
 *
 * Orchestrates the complete workflow:
 * 1. Fetches Jira ticket information
 * 2. Retrieves project documentation
 * 3. Parses test report
 * 4. Generates AI-powered quality analysis
 * 5. Creates Confluence page with results
 * 6. Posts summary to GitHub PR
 *
 * @returns Response message (success or error)
 */
async function main(): Promise<string> {
    // Log API key verification (last 10 characters for security)
    const apiKey = GlobalENV.OPEN_ROUTER_API_KEY || '';
    const maskedKey = apiKey.length > 10 ? '...' + apiKey.slice(-10) : 'NOT_SET';
    console.log(`🔑 OpenRouter API Key (last 10 chars): ${maskedKey}`);
    logger.info(`OpenRouter API Key verification: ${maskedKey}`);

    let response: string = '';
    let summaryResponse: string = getSummaryResponseString();
    try {
        if (ENV_VARIABLES.REPORT_FILE_PATH.trim() === '') {
            throw new CustomError(
                ERRORS.ENV_NOT_SET,
                "Please provide a valid report file path in the environment variables."
            );
        }

        logger.info('Step 1: Fetching Jira Title...');
        console.log(`📡 Calling Jira API to fetch ticket: ${GetJiraId()}`);
        let jiraTitle: string;
        try {
            jiraTitle = await GetJiraTitle();
            console.log('✅ Jira Title:', jiraTitle);
        } catch (e: any) {
            const errorMessage = e?.message || String(e);
            const statusCode = e?.status || e?.statusCode || e?.response?.status;

            console.error(`❌ Error fetching Jira Title:`);
            console.error(`   Status Code: ${statusCode || 'N/A'}`);
            console.error(`   Error Message: ${errorMessage}`);

            if (statusCode === 429 || errorMessage.includes('429')) {
                console.error(`\n⚠️  RATE LIMIT ERROR (429) - Too Many Requests`);
                console.error(`   Source: Jira API (GetJiraTitle)`);
                console.error(`   Action: Your Jira account has exceeded API rate limits`);
                console.error(`   Tip: Wait a few minutes and try again\n`);
            } else if (statusCode === 401) {
                console.error(`\n⚠️  AUTHENTICATION ERROR (401)`);
                console.error(`   Source: Jira API`);
                console.error(`   Action: Check JIRA_API_TOKEN is valid\n`);
            } else if (statusCode === 404) {
                console.error(`\n⚠️  NOT FOUND ERROR (404)`);
                console.error(`   Source: Jira API`);
                console.error(`   Action: Check JIRA ticket ${GetJiraId()} exists\n`);
            }

            throw e;
        }

        logger.info('Step 2: Fetching Project Document...');
        console.log('📡 Fetching project documentation from Confluence/S3...');
        let projectDocument: string;
        try {
            projectDocument = await GetProjectDocument();
            console.log('✅ Project Document fetched successfully');
        } catch (e: any) {
            const errorMessage = e?.message || String(e);
            const statusCode = e?.status || e?.statusCode || e?.response?.status;

            console.error(`❌ Error fetching Project Document:`);
            console.error(`   Status Code: ${statusCode || 'N/A'}`);
            console.error(`   Error Message: ${errorMessage}`);

            if (statusCode === 429 || errorMessage.includes('429')) {
                console.error(`\n⚠️  RATE LIMIT ERROR (429) - Too Many Requests`);
                console.error(`   Source: Confluence/S3 API (GetProjectDocument)`);
                console.error(`   Action: API rate limit exceeded`);
                console.error(`   Tip: Wait a few minutes and try again\n`);
            }

            throw e;
        }

        logger.info('Step 3: Initializing Vector Store...');
        const store = GetStore();
        await store.addDocument(GlobalENV.JIRA_PROJECT_KEY + '-index', projectDocument);
        console.log('✅ Document added to vector store');

        logger.info('Step 4: Parsing Report File...');
        const reportFileContent = await parseReportFile();
        console.log('✅ Report file parsed successfully');

        logger.info('Step 5: Preparing User Prompt...');
        let userPrompt: string = await GetUserPrompt();
        userPrompt = userPrompt.replace('##PLACEHOLDER##', jiraTitle.replace('{', ''));
        userPrompt = userPrompt.replace('##REPORT##', reportFileContent);
        userPrompt = userPrompt.split('{').join('');
        userPrompt = userPrompt.split('}').join('');

        fs.writeFileSync('prompt.txt', userPrompt);
        console.log('✅ Prompt prepared and saved');

        logger.info(`Step 6: Getting Response from OpenRouter API`);
        logger.info(`API URL: ${GlobalENV.OPEN_ROUTER_API_URL}`);
        logger.info(`Models: ${GlobalENV.OPEN_ROUTER_MODEL}`);

        

        // Add 60-second delay before making OpenRouter API calls to avoid rate limits
        console.log('⏳ Waiting 60 seconds before making OpenRouter API calls...');
        logger.info('Adding 60-second delay to avoid rate limits');
        await new Promise(resolve => setTimeout(resolve, 60000));
        console.log('✅ Delay completed, proceeding with API calls');

        const modelNames = GlobalENV.OPEN_ROUTER_MODEL.split(',');

        const modelResults = await processModelResponses(modelNames, store, userPrompt, summaryResponse);
        response = modelResults.response;
        summaryResponse = modelResults.summaryResponse;
        if (response) {
            try {
                logger.info('Step 7: Creating Confluence Page...');
                console.log('📝 Preparing Confluence page content...');

                response = response.split('```markdown').join('')
                    .split('```').join('')
                    .split('\n').join('<br />');

                const createPageResponse = await ConfluenceCreatePageTool(
                    ENV_VARIABLES.JIRA_URL_OUTPUT,
                    ENV_VARIABLES.JIRA_EMAIL_OUTPUT,
                    ENV_VARIABLES.JIRA_API_TOKEN_OUTPUT,
                    ENV_VARIABLES.JIRA_SPACE_KEY_OUTPUT,
                    GetJiraId()
                ).func(
                    '<b>Date:-</b>' + new Date().toLocaleString(undefined, { timeZone: 'Asia/Kolkata' }) + "<br />" +
                    '<b>Repo:-</b>' + GlobalENV.GITHUB_REPO + '<br />' +
                    '<b>PR:-</b>' + getPRLink() + '<br />' +
                    '<b>For:-</b>' + GlobalENV.USE_FOR + '<br />' +
                    response
                );
                console.log('✅ Confluence page created successfully');
                summaryResponse += '<br /><b>Details:-</b> ' + getConfluenceLink(createPageResponse);
            } catch (e: any) {
                const errorMessage = e?.message || String(e);
                const statusCode = e?.status || e?.statusCode || e?.response?.status;

                console.error(`❌ Error creating Confluence page:`);
                console.error(`   Status Code: ${statusCode || 'N/A'}`);
                console.error(`   Error Message: ${errorMessage}`);

                if (statusCode === 429 || errorMessage.includes('429')) {
                    console.error(`\n⚠️  RATE LIMIT ERROR (429) - Too Many Requests`);
                    console.error(`   Source: Jira/Confluence API`);
                    console.error(`   Action: Check your Jira/Confluence API rate limits`);
                    console.error(`   Tip: Wait a few minutes and try again\n`);
                } else if (statusCode === 401) {
                    console.error(`\n⚠️  AUTHENTICATION ERROR (401)`);
                    console.error(`   Source: Jira/Confluence API`);
                    console.error(`   Action: Check JIRA_API_TOKEN_OUTPUT is valid\n`);
                } else if (statusCode === 403) {
                    console.error(`\n⚠️  PERMISSION ERROR (403)`);
                    console.error(`   Source: Jira/Confluence API`);
                    console.error(`   Action: Check user has permission to create pages in space ${ENV_VARIABLES.JIRA_SPACE_KEY_OUTPUT}\n`);
                }

                logger.error(`ConfluenceCreatePageTool error:`, e);
            }

            logger.info('Step 8: Creating GitHub PR Comment...');
            console.log('💬 Posting comment to GitHub PR...');
            try {
                const gitResponse = await CreateUpdateComments(summaryResponse);
                console.log('✅ GitHub comment posted:', gitResponse.data.html_url);
            } catch (e: any) {
                const errorMessage = e?.message || String(e);
                const statusCode = e?.status || e?.statusCode || e?.response?.status;

                console.error(`❌ Error creating GitHub comment:`);
                console.error(`   Status Code: ${statusCode || 'N/A'}`);
                console.error(`   Error Message: ${errorMessage}`);

                if (statusCode === 429 || errorMessage.includes('429')) {
                    console.error(`\n⚠️  RATE LIMIT ERROR (429) - Too Many Requests`);
                    console.error(`   Source: GitHub API`);
                    console.error(`   Action: Check GitHub API rate limits`);
                    console.error(`   Tip: Wait until rate limit resets\n`);
                }

                logger.error(`GitHub comment error:`, e);
                throw e; // Re-throw as this is critical
            }
        }
    } catch (error) {
        console.log(error)
        if (error instanceof CustomError) {
            response = `${error.toString()}`;
        } else if (error instanceof Error) {
            response = `❌ Action failed: ${error.message}`;
        } else {
            response = `❌ Action failed: ${String(error)}`;
        }
        logger.error(response);
    } finally {
        // Do not return from finally block
    }
    return response;
}

main();
