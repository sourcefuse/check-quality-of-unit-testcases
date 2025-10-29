/**
 * Environment Configuration Module
 * Handles loading and validating environment variables for the application
 */

import fs from 'fs';
import { config } from 'dotenv';
import { logger } from 'OpenRouterAICore/pino';

/**
 * Load environment files in priority order
 * Priority: .env.${NODE_ENV} > .env
 */
function loadEnvironmentFiles(): void {
    const baseEnvPath = '.env';
    const nodeEnv = process.env.NODE_ENV;
    const envSpecificPath = nodeEnv ? `.env.${nodeEnv}` : null;

    // Load base .env first
    if (fs.existsSync(baseEnvPath)) {
        logger.info('Loading environment variables from .env');
        config({ path: baseEnvPath });
    }

    // Override with environment-specific .env if exists
    if (envSpecificPath && fs.existsSync(envSpecificPath)) {
        logger.info(`Loading environment-specific variables from ${envSpecificPath}`);
        config({ path: envSpecificPath, override: true });
    } else {
        logger.info('No environment-specific .env file found');
    }
}

// Load environment variables
loadEnvironmentFiles();

/**
 * Required environment variables for Confluence output
 */
interface EnvironmentVariables {
    JIRA_URL_OUTPUT: string;
    JIRA_EMAIL_OUTPUT: string;
    JIRA_API_TOKEN_OUTPUT: string;
    REPORT_FILE_PATH: string;
    JIRA_SPACE_KEY_OUTPUT: string;
}

/**
 * Validates that a required environment variable is not empty
 */
function validateRequiredEnvVar(name: string, value: string): void {
    if (!value || value.trim() === '') {
        throw new Error(
            `Missing required environment variable: ${name}. ` +
            `Please ensure all Confluence output configuration is set.`
        );
    }
}

/**
 * Get and validate environment variables
 */
function getEnvironmentVariables(): EnvironmentVariables {
    const envVars: EnvironmentVariables = {
        JIRA_URL_OUTPUT: process.env.JIRA_URL_OUTPUT ?? '',
        JIRA_EMAIL_OUTPUT: process.env.JIRA_EMAIL_OUTPUT ?? '',
        JIRA_API_TOKEN_OUTPUT: process.env.JIRA_API_TOKEN_OUTPUT ?? '',
        REPORT_FILE_PATH: process.env.REPORT_FILE_PATH ?? '',
        JIRA_SPACE_KEY_OUTPUT: process.env.JIRA_SPACE_KEY_OUTPUT ?? '',
    };

    // Validate all required variables
    const requiredVars: Array<keyof EnvironmentVariables> = [
        'JIRA_URL_OUTPUT',
        'JIRA_EMAIL_OUTPUT',
        'JIRA_API_TOKEN_OUTPUT',
        'JIRA_SPACE_KEY_OUTPUT',
    ];

    const missingVars: string[] = [];

    for (const varName of requiredVars) {
        const value = envVars[varName];
        if (!value || value.trim() === '') {
            missingVars.push(varName);
        }
    }

    if (missingVars.length > 0) {
        throw new Error(
            `Missing required Confluence output configuration:\n` +
            missingVars.map(v => `  - ${v}`).join('\n') +
            `\n\nPlease configure these variables in your GitHub repository settings.`
        );
    }

    return envVars;
}

/**
 * Validated environment variables
 * Throws error if any required variable is missing
 */
export const ENV_VARIABLES = getEnvironmentVariables();