/**
 * Application-wide constants
 * Centralizes all magic strings, numbers, and configuration values
 */

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * API Sources for error reporting
 */
export const API_SOURCE = {
  JIRA: 'Jira API',
  CONFLUENCE: 'Jira/Confluence API',
  OPENROUTER: 'OpenRouter AI API',
  GITHUB: 'GitHub API',
  S3: 'Confluence/S3 API',
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  RATE_LIMIT: 'Too Many Requests - Rate limit exceeded',
  UNAUTHORIZED: 'Authentication failed - Invalid credentials',
  FORBIDDEN: 'Permission denied - Insufficient privileges',
  NOT_FOUND: 'Resource not found',
  INVALID_TOKEN: 'Invalid API token',
  MISSING_ENV: 'Required environment variable not set',
} as const;

/**
 * Process execution steps for logging
 */
export const EXECUTION_STEPS = {
  FETCH_JIRA_TITLE: 'Step 1: Fetching Jira Title...',
  FETCH_PROJECT_DOC: 'Step 2: Fetching Project Document...',
  INIT_VECTOR_STORE: 'Step 3: Initializing Vector Store...',
  PARSE_REPORT: 'Step 4: Parsing Report File...',
  PREPARE_PROMPT: 'Step 5: Preparing User Prompt...',
  CALL_AI_API: 'Step 6: Getting Response from OpenRouter API',
  CREATE_CONFLUENCE: 'Step 7: Creating Confluence Page...',
  CREATE_GITHUB_COMMENT: 'Step 8: Creating GitHub PR Comment...',
} as const;

/**
 * File paths and extensions
 */
export const FILE_PATHS = {
  PROMPT_OUTPUT: 'prompt.txt',
  ENV_FILE: '.env',
  ENV_SF_FILE: '.env.sf',
  OPENROUTER_ENV: './OpenRouterAICore/.env',
} as const;

/**
 * HTML Tags and Formatting
 */
export const HTML_TAGS = {
  BOLD_OPEN: '<b>',
  BOLD_CLOSE: '</b>',
  BREAK: '<br />',
  SEPARATOR: '<br /><br /><br />=================================<br />',
} as const;

/**
 * Markdown Patterns to Remove
 */
export const MARKDOWN_PATTERNS = {
  CODE_BLOCK: '```markdown',
  TRIPLE_BACKTICK: '```',
  OPEN_BRACE: '{',
  CLOSE_BRACE: '}',
  NEWLINE: '\n',
} as const;

/**
 * Prompt Placeholders
 */
export const PROMPT_PLACEHOLDERS = {
  JIRA_TITLE: '##PLACEHOLDER##',
  REPORT: '##REPORT##',
} as const;

/**
 * Date and Time Configuration
 */
export const DATE_TIME = {
  TIMEZONE: 'Asia/Kolkata',
} as const;

/**
 * GitHub Action Configuration
 */
export const GITHUB_CONFIG = {
  MIN_ACTION_LENGTH: 1,
  MAX_ACTION_LENGTH: 3,
} as const;

/**
 * Validation Patterns
 */
export const VALIDATION = {
  EMPTY_STRING: '',
  TRIM_REQUIRED: true,
} as const;

/**
 * Console Output Emojis and Symbols
 */
export const CONSOLE_SYMBOLS = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: '📡',
  ROBOT: '🤖',
  CHART: '📊',
  MEMO: '📝',
  CHAT: '💬',
} as const;

/**
 * Environment Variable Keys
 */
export const ENV_KEYS = {
  // Jira Configuration
  JIRA_URL: 'JIRA_URL',
  JIRA_EMAIL: 'JIRA_EMAIL',
  JIRA_API_TOKEN: 'JIRA_API_TOKEN',
  JIRA_PROJECT_KEY: 'JIRA_PROJECT_KEY',
  JIRA_TICKET_ID: 'JIRA_TICKET_ID',

  // Jira Output Configuration
  JIRA_URL_OUTPUT: 'JIRA_URL_OUTPUT',
  JIRA_EMAIL_OUTPUT: 'JIRA_EMAIL_OUTPUT',
  JIRA_API_TOKEN_OUTPUT: 'JIRA_API_TOKEN_OUTPUT',
  JIRA_SPACE_KEY_OUTPUT: 'JIRA_SPACE_KEY_OUTPUT',

  // OpenRouter Configuration
  OPEN_ROUTER_API_KEY: 'OPEN_ROUTER_API_KEY',
  OPEN_ROUTER_API_URL: 'OPEN_ROUTER_API_URL',
  OPEN_ROUTER_MODEL: 'OPEN_ROUTER_MODEL',

  // GitHub Configuration
  GITHUB_TOKEN: 'GITHUB_TOKEN',
  GITHUB_OWNER: 'GITHUB_OWNER',
  GITHUB_REPO: 'GITHUB_REPO',
  GITHUB_ISSUE_NUMBER: 'GITHUB_ISSUE_NUMBER',

  // AWS Configuration
  AWS_ACCESS_KEY: 'AWS_ACCESS_KEY',
  AWS_SECRET_KEY: 'AWS_SECRET_KEY',
  AWS_REGION: 'AWS_REGION',
  S3_BUCKET_NAME: 'S3_BUCKET_NAME',

  // Docker Configuration
  DOCKER_USERNAME: 'DOCKER_USERNAME',
  DOCKER_PASSWORD: 'DOCKER_PASSWORD',

  // Report Configuration
  REPORT_FILE_PATH: 'REPORT_FILE_PATH',
  USE_FOR: 'USE_FOR',
  PROJECT_DOCUMENT_PATH: 'PROJECT_DOCUMENT_PATH',
  NODE_ENV: 'NODE_ENV',
} as const;

/**
 * Type exports for better type safety
 */
export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
export type ApiSource = typeof API_SOURCE[keyof typeof API_SOURCE];
export type ErrorMessage = typeof ERROR_MESSAGES[keyof typeof ERROR_MESSAGES];
export type ExecutionStep = typeof EXECUTION_STEPS[keyof typeof EXECUTION_STEPS];
