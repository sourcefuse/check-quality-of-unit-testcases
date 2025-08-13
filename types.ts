export interface Inputs {
    JIRA_API_TOKEN: string;
    JIRA_EMAIL: string;
    JIRA_FETCH_FIELDS: string;
    JIRA_MAX_RESULT: string;
    JIRA_PROJECT_KEY: string;
    JIRA_TICKET_ID: string;
    JIRA_URL: string;
    OPEN_ROUTER_API_KEY?: string;
    OPEN_ROUTER_API_URL?: string;
    OPEN_ROUTER_MODEL?: string;
    GEMINI_API_KEY?: string;
    GEMINI_API_URL?: string;
}

export interface PullRequestFile {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    [key: string]: any;
}
