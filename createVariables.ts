import fs from 'fs';
import { config } from 'dotenv';
import { Octokit } from 'octokit';
import * as readline from 'readline';
import sodium from 'libsodium-wrappers';

if (fs.existsSync('./OpenRouterAICore/.env')) {
    config({ path: './OpenRouterAICore/.env' });
}

if (fs.existsSync('.env')) {
    config({ path: '.env' });
}

if (fs.existsSync('.env.sf')) {
    config({ path: '.env.sf' });
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? null;
const GITHUB_OWNER = process.env.GITHUB_OWNER ?? null;
const GITHUB_REPO = process.env.GITHUB_REPO ?? null;

if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
    throw new Error('Not a valid Request. Missing GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN');
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const octokit = new Octokit({
    auth: GITHUB_TOKEN, // Replace with your GitHub token
});

async function createRepoVariable(obj: { [key: string]: string }) {
    try {
        for (const k in obj) {
            if (obj[k].trim() != '') {
                try {
                    await octokit.rest.actions.createRepoVariable({
                        owner: GITHUB_OWNER ?? '',
                        repo: GITHUB_REPO ?? '',
                        name: k,
                        value: String(obj[k]),
                    });
                } catch (e) {
                    console.log(String(e));
                    await octokit.rest.actions.updateRepoVariable({
                        owner: GITHUB_OWNER ?? '',
                        repo: GITHUB_REPO ?? '',
                        name: k,
                        value: String(obj[k]),
                    });
                    console.log(`Variable ${k} created successfully`);
                }
            } else {
                throw new Error(`Value for ${k} not found.`);
            }
        }
    } catch (error) {
        console.error(error);
    }
}

async function createRepoSecrets(obj: { [key: string]: string }) {
    try {
        // Fetch the public key for the repository
        const { data: publicKeyData } = await octokit.rest.actions.getRepoPublicKey({
            owner: process.env.GITHUB_OWNER ?? '',
            repo: process.env.GITHUB_REPO ?? '',
        });

        await sodium.ready;

        for (const k in obj) {
            if (obj[k].trim() != '') {
                try {
                    // Encrypt the secret value using the public key
                    const messageBytes = Buffer.from(obj[k]);
                    const keyBytes = Buffer.from(publicKeyData.key, 'base64');
                    const encryptedBytes = sodium.crypto_box_seal(messageBytes, keyBytes);
                    const encryptedValue = Buffer.from(encryptedBytes).toString('base64');

                    await octokit.rest.actions.createOrUpdateRepoSecret({
                        owner: process.env.GITHUB_OWNER ?? '',
                        repo: process.env.GITHUB_REPO ?? '',
                        secret_name: k,
                        encrypted_value: encryptedValue,
                        key_id: publicKeyData.key_id,
                    });
                    console.log(`Secret ${k} created successfully`);
                } catch (e) {
                    console.log(String(e));
                }
            } else {
                throw new Error(`Value for ${k} not found.`);
            }
        }
    } catch (error) {
        console.error(error);
    }
}

function promptAction(prompt: string, actions: string[]): Promise<number> {
    return new Promise((resolve) => {
        const actionsList = actions.map((a, i) => `${i + 1}. ${a}`).join('\n');
        rl.question(`${prompt}\n${actionsList}\nSelect an action (1-${actions.length}): `, (answer) => {
            const idx = parseInt(answer, 10);
            rl.close();
            if (!isNaN(idx) && idx >= 1 && idx <= actions.length) {
                resolve(idx);
            } else {
                console.log('Invalid selection.');
                process.exit(1);
            }
        });
    });
}

promptAction(
    `
Running for project:- \x1b[31m\x1b[1m${GITHUB_REPO}\x1b[0m.
Running for Project:- \x1b[31m\x1b[1m${process.env.JIRA_PROJECT_KEY}\x1b[0m.
Running for Confluence:- \x1b[31m\x1b[1m${process.env.PROJECT_DOCUMENT_PATH}\x1b[0m.
Running for Type:- \x1b[31m\x1b[1m${process.env.USE_FOR}\x1b[0m.
Running for Owner:- \x1b[31m\x1b[1m${process.env.GITHUB_OWNER}\x1b[0m.

Choose an action:`,
    ['Create Repo Variables', 'Create Repo Secrets', 'Exit'],
).then((action) => {
    switch (action) {
        case 1:
            createRepoVariable({
                AWS_REGION_UT: process.env.AWS_REGION ?? '',
                DOCKER_USERNAME: process.env.DOCKER_USERNAME ?? '',
                JIRA_EMAIL: process.env.JIRA_EMAIL ?? '',
                JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY ?? '',
                JIRA_URL: process.env.JIRA_URL ?? '',
                OPEN_ROUTER_MODEL: process.env.OPEN_ROUTER_MODEL ?? '',
                PROJECT_DOCUMENT_PATH: process.env.PROJECT_DOCUMENT_PATH ?? '',
                S3_BUCKET_NAME_UT: process.env.S3_BUCKET_NAME ?? '',
                USE_FOR: process.env.USE_FOR ?? '',
            });
            break;
        case 2:
            createRepoSecrets({
                AWS_ACCESS_KEY_UT: process.env.AWS_ACCESS_KEY ?? '',
                AWS_SECRET_KEY_UT: process.env.AWS_SECRET_KEY ?? '',
                DOCKER_PASSWORD: process.env.DOCKER_PASSWORD ?? '',
                JIRA_API_TOKEN: process.env.JIRA_API_TOKEN ?? '',
                OPEN_ROUTER_API_KEY: process.env.OPEN_ROUTER_API_KEY ?? '',
            });
            break;
        default:
            console.log('Exit selected.');
            process.exit(0);
    }
});
