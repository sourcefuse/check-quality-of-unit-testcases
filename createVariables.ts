/**
 * GitHub Repository Variables and Secrets Setup Utility
 * This script helps set up GitHub Actions variables and secrets for the repository
 */

import fs from 'fs';
import { config } from 'dotenv';
import { Octokit } from 'octokit';
import * as readline from 'readline';
import sodium from 'libsodium-wrappers';

/**
 * Load environment files in priority order
 */
function loadEnvironmentFiles(): void {
    const envFiles = ['./OpenRouterAICore/.env', '.env', '.env.sf'];

    for (const envFile of envFiles) {
        if (fs.existsSync(envFile)) {
            console.log(`Loading environment from: ${envFile}`);
            config({ path: envFile });
        }
    }
}

loadEnvironmentFiles();

/**
 * Required GitHub configuration
 */
interface GitHubConfig {
    token: string;
    owner: string;
    repo: string;
}

/**
 * Validates and retrieves GitHub configuration from environment
 */
function getGitHubConfig(): GitHubConfig {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    const missingVars: string[] = [];
    if (!token) {
        missingVars.push('GITHUB_TOKEN');
    }
    if (!owner) {
        missingVars.push('GITHUB_OWNER');
    }
    if (!repo) {
        missingVars.push('GITHUB_REPO');
    }

    if (missingVars.length > 0) {
        throw new Error(
            `Missing required GitHub configuration:\n` +
            missingVars.map(v => `  - ${v}`).join('\n') +
            `\n\nPlease set these environment variables before running this script.`
        );
    }

    return {
        token: token!,
        owner: owner!,
        repo: repo!,
    };
}

const GITHUB_CONFIG = getGitHubConfig();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const octokit = new Octokit({
    auth: GITHUB_CONFIG.token,
});

/**
 * Creates or updates a GitHub repository variable
 * @param name - Variable name
 * @param value - Variable value
 */
async function createOrUpdateVariable(name: string, value: string): Promise<void> {
    try {
        await octokit.rest.actions.createRepoVariable({
            owner: GITHUB_CONFIG.owner,
            repo: GITHUB_CONFIG.repo,
            name,
            value,
        });
        console.log(`✅ Variable '${name}' created successfully`);
    } catch (error: any) {
        // If variable exists, update it
        if (error?.status === 409) {
            await octokit.rest.actions.updateRepoVariable({
                owner: GITHUB_CONFIG.owner,
                repo: GITHUB_CONFIG.repo,
                name,
                value,
            });
            console.log(`✅ Variable '${name}' updated successfully`);
        } else {
            throw error;
        }
    }
}

/**
 * Creates repository variables from an object
 * @param variables - Object containing variable names and values
 */
async function createRepoVariables(variables: Record<string, string>): Promise<void> {
    const errors: string[] = [];

    for (const [name, value] of Object.entries(variables)) {
        if (!value || value.trim() === '') {
            console.warn(`⚠️  Skipping empty variable: ${name}`);
            continue;
        }

        try {
            await createOrUpdateVariable(name, value);
        } catch (error: any) {
            const errorMessage = `Failed to create/update variable '${name}': ${error?.message || String(error)}`;
            console.error(`❌ ${errorMessage}`);
            errors.push(errorMessage);
        }
    }

    if (errors.length > 0) {
        throw new Error(
            `Failed to create ${errors.length} variable(s):\n` +
            errors.map(e => `  - ${e}`).join('\n')
        );
    }

    console.log(`\n✅ All variables created/updated successfully!\n`);
}

/**
 * Encrypts a secret value using GitHub's public key
 * @param value - The secret value to encrypt
 * @param publicKey - GitHub repository's public key
 * @returns Encrypted value as base64 string
 */
function encryptSecret(value: string, publicKey: string): string {
    const messageBytes = Buffer.from(value);
    const keyBytes = Buffer.from(publicKey, 'base64');
    const encryptedBytes = sodium.crypto_box_seal(messageBytes, keyBytes);
    return Buffer.from(encryptedBytes).toString('base64');
}

/**
 * Creates or updates a GitHub repository secret
 * @param name - Secret name
 * @param value - Secret value
 * @param publicKeyData - Repository's public key data
 */
async function createOrUpdateSecret(
    name: string,
    value: string,
    publicKeyData: { key: string; key_id: string }
): Promise<void> {
    try {
        const encryptedValue = encryptSecret(value, publicKeyData.key);

        await octokit.rest.actions.createOrUpdateRepoSecret({
            owner: GITHUB_CONFIG.owner,
            repo: GITHUB_CONFIG.repo,
            secret_name: name,
            encrypted_value: encryptedValue,
            key_id: publicKeyData.key_id,
        });

        console.log(`✅ Secret '${name}' created/updated successfully`);
    } catch (error: any) {
        throw new Error(`Failed to create/update secret '${name}': ${error?.message || String(error)}`);
    }
}

/**
 * Creates repository secrets from an object
 * @param secrets - Object containing secret names and values
 */
async function createRepoSecrets(secrets: Record<string, string>): Promise<void> {
    try {
        // Fetch the public key for the repository
        console.log('Fetching repository public key...');
        const { data: publicKeyData } = await octokit.rest.actions.getRepoPublicKey({
            owner: GITHUB_CONFIG.owner,
            repo: GITHUB_CONFIG.repo,
        });

        // Initialize sodium for encryption
        await sodium.ready;
        console.log('Encryption library initialized\n');

        const errors: string[] = [];

        for (const [name, value] of Object.entries(secrets)) {
            if (!value || value.trim() === '') {
                console.warn(`⚠️  Skipping empty secret: ${name}`);
                continue;
            }

            try {
                await createOrUpdateSecret(name, value, publicKeyData);
            } catch (error: any) {
                const errorMessage = error?.message || String(error);
                console.error(`❌ ${errorMessage}`);
                errors.push(errorMessage);
            }
        }

        if (errors.length > 0) {
            throw new Error(
                `Failed to create ${errors.length} secret(s):\n` +
                errors.map(e => `  - ${e}`).join('\n')
            );
        }

        console.log(`\n✅ All secrets created/updated successfully!\n`);
    } catch (error: any) {
        console.error(`❌ Failed to create secrets: ${error?.message || String(error)}`);
        throw error;
    }
}

/**
 * Prompts user to select an action from a list
 * @param prompt - The prompt message to display
 * @param actions - Array of action names
 * @returns Promise resolving to the selected action index (1-based)
 */
function promptAction(prompt: string, actions: string[]): Promise<number> {
    return new Promise((resolve) => {
        const actionsList = actions.map((action, index) => `  ${index + 1}. ${action}`).join('\n');
        const fullPrompt = `${prompt}\n${actionsList}\n\nSelect an action (1-${actions.length}): `;

        rl.question(fullPrompt, (answer) => {
            rl.close();
            const selectedIndex = parseInt(answer, 10);

            if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > actions.length) {
                console.error(`❌ Invalid selection: ${answer}`);
                console.error(`   Please select a number between 1 and ${actions.length}`);
                process.exit(1);
            }

            resolve(selectedIndex);
        });
    });
}

/**
 * Gets repository variables from environment
 */
function getRepositoryVariables(): Record<string, string> {
    return {
        AWS_REGION_UT: process.env.AWS_REGION ?? '',
        DOCKER_USERNAME: process.env.DOCKER_USERNAME ?? '',
        JIRA_EMAIL: process.env.JIRA_EMAIL ?? '',
        JIRA_EMAIL_OUTPUT: process.env.JIRA_EMAIL_OUTPUT ?? '',
        JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY ?? '',
        JIRA_SPACE_KEY_OUTPUT: process.env.JIRA_SPACE_KEY_OUTPUT ?? '',
        JIRA_URL: process.env.JIRA_URL ?? '',
        JIRA_URL_OUTPUT: process.env.JIRA_URL_OUTPUT ?? '',
        OPEN_ROUTER_MODEL: process.env.OPEN_ROUTER_MODEL ?? '',
        PROJECT_DOCUMENT_PATH: process.env.PROJECT_DOCUMENT_PATH ?? '',
        S3_BUCKET_NAME_UT: process.env.S3_BUCKET_NAME ?? '',
        USE_FOR: process.env.USE_FOR ?? '',
    };
}

/**
 * Gets repository secrets from environment
 */
function getRepositorySecrets(): Record<string, string> {
    return {
        AWS_ACCESS_KEY_UT: process.env.AWS_ACCESS_KEY ?? '',
        AWS_SECRET_KEY_UT: process.env.AWS_SECRET_KEY ?? '',
        DOCKER_PASSWORD: process.env.DOCKER_PASSWORD ?? '',
        JIRA_API_TOKEN: process.env.JIRA_API_TOKEN ?? '',
        JIRA_API_TOKEN_OUTPUT: process.env.JIRA_API_TOKEN_OUTPUT ?? '',
        OPEN_ROUTER_API_KEY: process.env.OPEN_ROUTER_API_KEY ?? '',
    };
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('GitHub Repository Configuration Setup');
    console.log('='.repeat(60));
    console.log(`\n📦 Repository: \x1b[36m\x1b[1m${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}\x1b[0m`);
    console.log(`🔑 JIRA Project: \x1b[36m\x1b[1m${process.env.JIRA_PROJECT_KEY || 'Not set'}\x1b[0m`);
    console.log(`📄 Confluence Path: \x1b[36m\x1b[1m${process.env.PROJECT_DOCUMENT_PATH || 'Not set'}\x1b[0m`);
    console.log(`🎯 Use For: \x1b[36m\x1b[1m${process.env.USE_FOR || 'Not set'}\x1b[0m\n`);

    try {
        const action = await promptAction(
            'Choose an action:',
            ['Create/Update Repository Variables', 'Create/Update Repository Secrets', 'Exit']
        );

        switch (action) {
            case 1:
                console.log('\n📝 Creating/Updating repository variables...\n');
                await createRepoVariables(getRepositoryVariables());
                break;

            case 2:
                console.log('\n🔐 Creating/Updating repository secrets...\n');
                await createRepoSecrets(getRepositorySecrets());
                break;

            case 3:
                console.log('\n👋 Exiting...\n');
                process.exit(0);
                break;

            default:
                console.log('\n👋 Exiting...\n');
                process.exit(0);
        }

        console.log('✨ Operation completed successfully!\n');
        process.exit(0);
    } catch (error: any) {
        console.error(`\n❌ Operation failed: ${error?.message || String(error)}\n`);
        process.exit(1);
    }
}

// Execute main function
main().catch((error) => {
    console.error(`\n❌ Unexpected error: ${error?.message || String(error)}\n`);
    process.exit(1);
});
