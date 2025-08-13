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

async function parseReportFile(): Promise<string> {
    try {
        const files = await GetPullRequestDiff();
        const filteredFiles = files.map(f => f.replace('src', 'dist').replace('.ts', ''));
        let reportFileContent = await GetReportFileContent(process.cwd() + '/' + ENV_VARIABLES.REPORT_FILE_PATH);

        if (filteredFiles.length === 0) {
            return reportFileContent;
        }

        const reportFileJson = JSON.parse(reportFileContent);
        const result: { [key: string]: string } = {};

        for (const fileKey of Object.keys(reportFileJson)) {
            if (filteredFiles.some(f => fileKey.includes(f))) {
                const fileName = fileKey.split('/').pop() || fileKey;
                result[fileName] = reportFileJson[fileKey];
            }
        }

        if (Object.keys(result).length > 0) {
            return JSON.stringify(result, null, 2);
        }
        return reportFileContent;
    } catch (e) {
        // logger.error('Error in parsing Report', e);
        console.log(e);
        return '';
    }
}

function getSummaryResponseString(): string {
    return `[![Foo](https://sourcefuse.atlassian.net/s/vf1kch/b/9/7104e5158390e41d6b3edd0f16b03d29/_/jira-favicon-scaled.png)](https:/sourcefuse.atlassian.net/) \n` +
        `## Quality Checker Overview`;
}

function getPRLink(): string {
    return `<a href="https://github.com/${GlobalENV.GITHUB_OWNER}/${GlobalENV.GITHUB_REPO}/pull/${GlobalENV.GITHUB_ISSUE_NUMBER}" target="_blank">Link</a>`;
}

function getConfluenceLink(createPageResponse: any): string {
    return `<a target="_blank" href="${ENV_VARIABLES.JIRA_URL_OUTPUT}/wiki/spaces/` +
        `${ENV_VARIABLES.JIRA_SPACE_KEY_OUTPUT}/pages/` +
        `${createPageResponse.pageId}/${createPageResponse.pageTitle}">link</a>`;
}

async function processModelResponses(
    modelNames: string[],
    store: any,
    userPrompt: string,
    summaryResponse: string
): Promise<{ response: string; summaryResponse: string }> {
    let response = '';
    for (const modelName of modelNames) {
        logger.info(`Getting Response Model :- ${modelName}`);
        let storeResponse: string = await store.generate(
            modelName.trim(),
            GlobalENV.JIRA_PROJECT_KEY + '-index',
            userPrompt
        );
        response += `<b>ResponseModel:-</b> ${modelName} <br /><br/>`;
        response += storeResponse;
        let sResponse: string = await store.makeCallToModel(
            modelName, storeResponse,
            GetSummarizePrompt()
        );
        sResponse = sResponse.split('```json').join('').split('```').join('');
        try {
            let sResponseJson = JSON.parse(sResponse);
            summaryResponse += `\n<b>Model:-</b> ${modelName}`;
            summaryResponse += `\n<b>Summary:-</b> ${sResponseJson.summary}`;
            summaryResponse += `\n<b>Score:-</b> ${sResponseJson.score}`;
        } catch (e) {
            logger.error(e);
        }
        if (modelNames.length > 1)
            response += '<br /><br /><br />=================================<br />';
    }
    return { response, summaryResponse };
}

async function main(): Promise<string> {
    let response: string = '';
    let summaryResponse: string = getSummaryResponseString();
    try {
        if (ENV_VARIABLES.REPORT_FILE_PATH.trim() === '') {
            throw new CustomError(
                ERRORS.ENV_NOT_SET,
                "Please provide a valid report file path in the environment variables."
            );
        }

        const jiraTitle: string = await GetJiraTitle();
        console.log(jiraTitle);
        const projectDocument = await GetProjectDocument();
        const store = GetStore();
        await store.addDocument(GlobalENV.JIRA_PROJECT_KEY + '-index', projectDocument);

        const reportFileContent = await parseReportFile();
        let userPrompt: string = await GetUserPrompt();
        userPrompt = userPrompt.replace('##PLACEHOLDER##', jiraTitle.replace('{', ''));
        userPrompt = userPrompt.replace('##REPORT##', reportFileContent);
        userPrompt = userPrompt.split('{').join('');
        userPrompt = userPrompt.split('}').join('');

        fs.writeFileSync('prompt.txt', userPrompt);
        logger.info(`Getting Response from URL :- ${GlobalENV.OPEN_ROUTER_API_URL}`);
        const modelNames = GlobalENV.OPEN_ROUTER_MODEL.split(',');

        const modelResults = await processModelResponses(modelNames, store, userPrompt, summaryResponse);
        response = modelResults.response;
        summaryResponse = modelResults.summaryResponse;
        if (response) {
            try {
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
                summaryResponse += '<br /><b>Details:-</b> ' + getConfluenceLink(createPageResponse);
            } catch (e) {
                if (e instanceof Error) {
                    logger.info(e.message);
                } else {
                    logger.info(String(e));
                }
            }
            const gitResponse = await CreateUpdateComments(summaryResponse)
            console.log(gitResponse.data.html_url);
        }
    } catch (error) {
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
