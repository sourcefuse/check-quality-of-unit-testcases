/**
 * Type definitions for test quality checker application
 */

/**
 * Input configuration for the GitHub Action
 */
export interface Inputs {
    /** Jira API token for authentication */
    JIRA_API_TOKEN: string;
    /** Jira email address for authentication */
    JIRA_EMAIL: string;
    /** Comma-separated list of Jira fields to fetch */
    JIRA_FETCH_FIELDS: string;
    /** Maximum number of results to fetch from Jira */
    JIRA_MAX_RESULT: string;
    /** Jira project key (e.g., TEL, PROJ) */
    JIRA_PROJECT_KEY: string;
    /** Jira ticket ID to fetch */
    JIRA_TICKET_ID: string;
    /** Jira instance URL */
    JIRA_URL: string;
    /** OpenRouter AI API key (optional) */
    OPEN_ROUTER_API_KEY?: string;
    /** OpenRouter AI API URL (optional) */
    OPEN_ROUTER_API_URL?: string;
    /** OpenRouter AI model name (optional) */
    OPEN_ROUTER_MODEL?: string;
    /** Gemini API key (optional, legacy support) */
    GEMINI_API_KEY?: string;
    /** Gemini API URL (optional, legacy support) */
    GEMINI_API_URL?: string;
}

/**
 * GitHub Pull Request file change information
 */
export interface PullRequestFile {
    /** File path relative to repository root */
    filename: string;
    /** Status of the file (added, modified, removed, renamed) */
    status: 'added' | 'modified' | 'removed' | 'renamed' | string;
    /** Number of lines added */
    additions: number;
    /** Number of lines deleted */
    deletions: number;
    /** Total number of changes (additions + deletions) */
    changes: number;
    /** Previous filename if file was renamed */
    previous_filename?: string;
    /** SHA of the blob */
    sha?: string;
    /** Blob URL */
    blob_url?: string;
    /** Raw URL */
    raw_url?: string;
    /** Contents URL */
    contents_url?: string;
    /** Patch content */
    patch?: string;
}

/**
 * API Error response structure
 */
export interface ApiError extends Error {
    /** HTTP status code */
    status?: number;
    /** HTTP status code (alternative property name) */
    statusCode?: number;
    /** Error response from API */
    response?: {
        status?: number;
        data?: any;
    };
}

/**
 * Confluence page creation response
 */
export interface ConfluencePageResponse {
    /** Confluence page ID */
    pageId: string;
    /** Confluence page title */
    pageTitle: string;
    /** Full URL to the page */
    url?: string;
}

/**
 * AI Model response structure
 */
export interface ModelResponse {
    /** Full detailed response from the model */
    response: string;
    /** Summary response with key metrics */
    summaryResponse: string;
}

/**
 * Test report structure
 */
export interface TestReport {
    /** Test file path to test results mapping */
    [filePath: string]: string;
}

/**
 * GitHub configuration
 */
export interface GitHubConfig {
    /** GitHub authentication token */
    token: string;
    /** Repository owner/organization */
    owner: string;
    /** Repository name */
    repo: string;
    /** Pull request or issue number */
    issueNumber?: number;
}

/**
 * Environment variables configuration
 */
export interface EnvironmentConfig {
    /** Jira output URL */
    JIRA_URL_OUTPUT: string;
    /** Jira output email */
    JIRA_EMAIL_OUTPUT: string;
    /** Jira output API token */
    JIRA_API_TOKEN_OUTPUT: string;
    /** Path to test report file */
    REPORT_FILE_PATH: string;
    /** Confluence space key for output */
    JIRA_SPACE_KEY_OUTPUT: string;
}
