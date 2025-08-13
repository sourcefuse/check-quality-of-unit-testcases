import fs from 'fs';
import { config } from 'dotenv';
import { logger } from 'OpenRouterAICore/pino';

if (fs.existsSync('.env')) {
    logger.info('Loading env file from .env');
    config({ path: '.env' });
}
if (process.env.NODE_ENV != '' && fs.existsSync(`.env.${process.env.NODE_ENV}`)) {
    logger.info(`Loading env file from .env.${process.env.NODE_ENV}`);
    config({ path: `.env.${process.env.NODE_ENV}` });
} else {
    logger.info(`stage not set.`);
}

export const ENV_VARIABLES = {
    JIRA_URL_OUTPUT: process.env.JIRA_URL_OUTPUT ?? '',
    JIRA_EMAIL_OUTPUT: process.env.JIRA_EMAIL_OUTPUT ?? '',
    JIRA_API_TOKEN_OUTPUT: process.env.JIRA_API_TOKEN_OUTPUT ?? '',
    REPORT_FILE_PATH: process.env.REPORT_FILE_PATH ?? '',
    JIRA_SPACE_KEY_OUTPUT: process.env.JIRA_SPACE_KEY_OUTPUT ?? '',
};

if (
    ENV_VARIABLES.JIRA_URL_OUTPUT.trim() == "" ||
    ENV_VARIABLES.JIRA_EMAIL_OUTPUT.trim() == "" ||
    ENV_VARIABLES.JIRA_API_TOKEN_OUTPUT.trim() == "" || 
    ENV_VARIABLES.JIRA_SPACE_KEY_OUTPUT.trim() == "") {
        throw new Error("Confluence Output details not set.");
}