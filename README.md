# Check Quality of Unit Test Cases

[![GitHub Actions CI/CD](https://img.shields.io/badge/GitHub%20Actions-CI%2FCD-blue)](https://github.com/features/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

An AI-powered GitHub Action that automatically analyzes unit test quality and coverage metrics. Integrates with Jira/Confluence for documentation, OpenRouter AI for intelligent analysis, and provides automated quality reports directly in your pull requests.

![Workflow Architecture](arch.gif)

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Support](#project-support)
- [Local Development](#local-development)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Features

- **AI-Powered Analysis**: Leverages OpenRouter AI (Claude, GPT-4, etc.) for intelligent test quality assessment
- **Branch Validation**: Enforces JIRA naming conventions with case-insensitive validation
- **Automated PR Comments**: Posts quality analysis results directly on GitHub pull requests
- **Confluence Integration**: Creates detailed reports in Confluence for team visibility
- **Multi-Framework Support**: Works with Angular (Karma/Jasmine) and LoopBack (Mocha) projects
- **Monorepo Compatible**: Supports Lerna-based monorepos with multiple packages
- **Data Anonymization**: Uses Microsoft Presidio for PII protection
- **Vector Storage**: Leverages Qdrant for document retrieval and context-aware analysis
- **Customizable Prompts**: Easy-to-modify prompts for API and UI test analysis
- **AWS S3 Integration**: Optional project documentation storage in S3

## Quick Start

### 1. Add to Your Workflow

Create `.github/workflows/test-quality-check.yml`:

```yaml
name: Test Quality Check
on:
  pull_request:
    types: [opened, edited, synchronize, reopened]

permissions:
  contents: write
  pull-requests: write

jobs:
  analyze:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run Tests
        run: |
          npm install
          npm run test:report

      - uses: sourcefuse/check-quality-of-unit-testcases@v1.2.0
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPEN_ROUTER_API_KEY: ${{ secrets.OPEN_ROUTER_API_KEY }}
          OPEN_ROUTER_MODEL: ${{ vars.OPEN_ROUTER_MODEL }}
          JIRA_URL: ${{ vars.JIRA_URL }}
          JIRA_EMAIL: ${{ vars.JIRA_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
          JIRA_PROJECT_KEY: ${{ vars.JIRA_PROJECT_KEY }}
          JIRA_URL_OUTPUT: ${{ vars.JIRA_URL_OUTPUT }}
          JIRA_EMAIL_OUTPUT: ${{ vars.JIRA_EMAIL_OUTPUT }}
          JIRA_API_TOKEN_OUTPUT: ${{ secrets.JIRA_API_TOKEN_OUTPUT }}
          JIRA_SPACE_KEY_OUTPUT: ${{ vars.JIRA_SPACE_KEY_OUTPUT }}
          DOCKER_USERNAME: ${{ vars.DOCKER_USERNAME }}
          DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
          USE_FOR: ${{ vars.USE_FOR }}
```

### 2. Configure Secrets and Variables

Go to **Settings → Secrets and Variables → Actions**

**Required Secrets:**
- `OPEN_ROUTER_API_KEY` - Your OpenRouter AI API key
- `JIRA_API_TOKEN` - Jira API token for authentication
- `JIRA_API_TOKEN_OUTPUT` - Jira API token for Confluence output
- `DOCKER_PASSWORD` - Docker Hub password

**Required Variables:**
- `JIRA_PROJECT_KEY` - Your JIRA project key (e.g., `TEL`)
- `JIRA_URL` - Jira instance URL
- `JIRA_EMAIL` - Jira email address
- `OPEN_ROUTER_MODEL` - AI model (e.g., `anthropic/claude-3.5-sonnet`)
- `USE_FOR` - `GenerateTestCasesReport_API` or `GenerateTestCasesReport_UI`

### 3. Setup Your Project

**See the detailed [SETUP_GUIDE.md](./SETUP_GUIDE.md) for complete instructions.**

## Architecture

The action follows a comprehensive workflow:

1. **Branch Validation**: Validates branch names against JIRA project key
2. **Test Execution**: Runs your test suite and generates coverage reports
3. **Report Parsing**: Extracts test results and filters by PR changes
4. **Document Retrieval**: Fetches project documentation from Confluence/S3
5. **Vector Storage**: Adds documents to Qdrant for context-aware retrieval
6. **AI Analysis**: Generates quality assessment using OpenRouter AI models
7. **Confluence Output**: Creates detailed report pages in Confluence
8. **GitHub Comment**: Posts summary and analysis link on the pull request

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **AI Engine** | OpenRouter AI | Multi-model AI analysis |
| **Vector Store** | Qdrant | Document retrieval and context |
| **Data Privacy** | Microsoft Presidio | PII detection and anonymization |
| **Documentation** | Confluence | Report storage and sharing |
| **Project Management** | Jira | Ticket tracking and validation |
| **Version Control** | GitHub Actions | CI/CD automation |
| **Container Runtime** | Docker | Service orchestration |

## Prerequisites

### Software Requirements
- Node.js >= 18.x
- npm >= 9.x
- Git (latest version)
- Docker (for local testing)

### Account Requirements
- GitHub account with repository access
- OpenRouter AI account ([Get API key](https://openrouter.ai))
- Jira/Confluence access with API tokens
- Docker Hub account

### Test Report Format
Your tests must generate a report at `./coverage/ut-results.json` with structure:
```json
{
  "file/path/test.spec.ts": "test case details...",
  "another/test.spec.ts": "test details..."
}
```

## Installation

### For Angular Projects

1. Install the Karma reporter:
```bash
npm install --save-dev karma-json-result-reporter
```

2. Download the utility script:
```bash
curl -o getTestUtil.js \
  https://raw.githubusercontent.com/sourcefuse/check-quality-of-unit-testcases/main/src/angular/getTestUtil.js
```

3. Update `karma.conf.js`:
```javascript
module.exports = function(config) {
  config.set({
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-json-result-reporter'),
    ],
    reporters: ['progress', 'json-result'],
    jsonResultReporter: {
      outputFile: 'karma-result.json',
      isSynchronous: true
    },
  });
};
```

4. Add to `package.json`:
```json
{
  "scripts": {
    "test": "ng test --watch=false --code-coverage",
    "test:report": "npm test && node getTestUtil.js"
  }
}
```

### For LoopBack Projects

1. Download the utility script:
```bash
curl -o updateForReport.js \
  https://raw.githubusercontent.com/sourcefuse/check-quality-of-unit-testcases/main/src/loopback/updateForReport.js
```

2. Create/update `.mocharc.json`:
```json
{
  "exit": true,
  "recursive": true,
  "require": "source-map-support/register",
  "reporter": "json",
  "reporter-option": ["output=test-results.json"]
}
```

3. Add to `package.json`:
```json
{
  "scripts": {
    "test": "lb-mocha",
    "test:report:update": "node updateForReport.js update-mocha",
    "test:report:collect": "npm test && node updateForReport.js collect-report"
  }
}
```

## Configuration

### Environment Variables

#### OpenRouter AI Configuration
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `OPEN_ROUTER_API_KEY` | API key from OpenRouter | Yes | `sk-or-v1-...` |
| `OPEN_ROUTER_API_URL` | API endpoint | No | `https://openrouter.ai/api/v1` |
| `OPEN_ROUTER_MODEL` | AI model name | Yes | `anthropic/claude-3.5-sonnet` |

#### Jira Configuration (Input)
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `JIRA_URL` | Jira instance URL | Yes | `https://company.atlassian.net` |
| `JIRA_EMAIL` | Authentication email | Yes | `user@company.com` |
| `JIRA_API_TOKEN` | API token | Yes | `ATATT3xF...` |
| `JIRA_PROJECT_KEY` | Project key | Yes | `TEL` |
| `JIRA_TICKET_ID` | Ticket ID | Auto | From branch name |

#### Jira Configuration (Output)
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `JIRA_URL_OUTPUT` | Confluence URL | Yes | `https://company.atlassian.net` |
| `JIRA_EMAIL_OUTPUT` | Confluence email | Yes | `user@company.com` |
| `JIRA_API_TOKEN_OUTPUT` | Confluence API token | Yes | `ATATT3xF...` |
| `JIRA_SPACE_KEY_OUTPUT` | Confluence space key | Yes | `MYSPACE` |

#### AWS Configuration (Optional)
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `AWS_ACCESS_KEY` | AWS access key ID | No | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_KEY` | AWS secret key | No | `wJalrXUtnFEMI/K7MDENG...` |
| `AWS_REGION` | AWS region | No | `us-east-1` |
| `S3_BUCKET_NAME` | S3 bucket name | No | `my-project-docs` |
| `PROJECT_DOCUMENT_PATH` | Path in S3 | No | `docs/project.md` |

#### Other Configuration
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `REPORT_FILE_PATH` | Test report path | Yes | `coverage/ut-results.json` |
| `USE_FOR` | Analysis type | Yes | `GenerateTestCasesReport_API` |
| `DOCKER_USERNAME` | Docker Hub username | Yes | `myusername` |
| `DOCKER_PASSWORD` | Docker Hub password | Yes | `********` |

### Branch Naming Convention

Branches must start with your `JIRA_PROJECT_KEY` (case-insensitive):

✅ Valid Examples:
- `TEL-123-add-feature`
- `tel-456-bugfix`
- `TELESCOPE-789-improvement`

❌ Invalid Examples:
- `feature/login` (no JIRA key)
- `bugfix/TEL-123` (doesn't start with key)

## Usage

### Basic Workflow

1. Create a branch following JIRA naming convention:
```bash
git checkout -b TEL-123-add-user-authentication
```

2. Make changes and write tests:
```bash
# Your development work here
npm test
```

3. Commit and push:
```bash
git add .
git commit -m "feat: add user authentication"
git push origin TEL-123-add-user-authentication
```

4. Create a Pull Request

5. View results:
   - Check PR for automated comment with summary
   - Click Confluence link for detailed analysis
   - Review quality score and recommendations

### Supported Analysis Types

#### API/Backend Tests (`GenerateTestCasesReport_API`)
Analyzes:
- Test coverage for API endpoints
- Error handling test cases
- Input validation tests
- Authentication/authorization tests
- Database interaction tests
- Integration test quality

#### UI/Frontend Tests (`GenerateTestCasesReport_UI`)
Analyzes:
- Component test coverage
- User interaction tests
- Render tests
- Event handling tests
- State management tests
- Accessibility tests

## Project Support

### Angular Projects
- Karma + Jasmine testing framework
- Coverage reports via `karma-coverage`
- JSON test results via `karma-json-result-reporter`

### LoopBack Projects
- Mocha testing framework
- JSON reporter configuration
- Monorepo support (Lerna)
- Multi-package test aggregation

### Monorepo Support
For Lerna monorepos:
```bash
# Update all package mocha configs
node updateForReport.js update-mocha

# Collect reports from all packages
node updateForReport.js collect-report
```

## Local Development

### 1. Start Docker Services

```bash
# Login to Docker
docker login -u "your_username" -p "your_password"

# Start required services
docker run -d -p 5001:3000 mcr.microsoft.com/presidio-anonymizer:latest
docker run -d -p 5002:3000 mcr.microsoft.com/presidio-analyzer:latest
docker run -d -p 6333:6333 qdrant/qdrant
```

### 2. Create Environment File

Create `.env` in project root:
```bash
# GitHub
GITHUB_TOKEN=your_token
GITHUB_OWNER=your_username
GITHUB_REPO=your_repo
GITHUB_ISSUE_NUMBER=1

# OpenRouter AI
OPEN_ROUTER_API_KEY=your_key
OPEN_ROUTER_API_URL=https://openrouter.ai/api/v1
OPEN_ROUTER_MODEL=anthropic/claude-3.5-sonnet

# Jira
JIRA_URL=https://company.atlassian.net
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN=your_token
JIRA_PROJECT_KEY=TEL
JIRA_TICKET_ID=TEL-123

# Test Configuration
REPORT_FILE_PATH=coverage/ut-results.json
USE_FOR=GenerateTestCasesReport_API

# Services
PRESIDIO_ANALYZE_URL=http://localhost:5002/analyze
PRESIDIO_ANONYMIZE_URL=http://localhost:5001/anonymize
VECTOR_STORE_TYPE=QDRANT
VECTOR_STORE_URL=http://127.0.0.1:6333
```

### 3. Run Analysis

```bash
# Install dependencies
npm install

# Run tests and generate report
npm run test:report  # Angular
# or
npm run test:report:collect  # LoopBack

# Run analysis
npm start
```

### 4. View Results

- Console output shows progress and summary
- `prompt.txt` contains the generated prompt for debugging
- Confluence link appears in output

## API Reference

### Main Function

```typescript
async function main(): Promise<string>
```

Orchestrates the complete test quality analysis workflow.

**Returns:** Response message (success or error details)

**Workflow:**
1. Validates environment configuration
2. Fetches Jira ticket information
3. Retrieves project documentation
4. Parses test report file
5. Generates AI analysis
6. Creates Confluence page
7. Posts GitHub PR comment

### Helper Functions

#### `parseReportFile()`
```typescript
async function parseReportFile(): Promise<string>
```
Parses test report and filters based on PR changes.

#### `processModelResponses()`
```typescript
async function processModelResponses(
  modelNames: string[],
  store: any,
  userPrompt: string,
  summaryResponse: string
): Promise<{ response: string; summaryResponse: string }>
```
Processes AI model responses and generates summaries.

### Environment Variables Module

```typescript
import { ENV_VARIABLES } from './environment';
```

Access configuration values:
- `ENV_VARIABLES.JIRA_URL_OUTPUT`
- `ENV_VARIABLES.REPORT_FILE_PATH`
- `ENV_VARIABLES.JIRA_SPACE_KEY_OUTPUT`

## Troubleshooting

### Common Issues

#### 1. Branch Name Validation Fails

**Error:** `Branch name must start with 'XXX'`

**Solution:** Ensure branch starts with `JIRA_PROJECT_KEY`
```bash
# Correct
git checkout -b TEL-123-feature

# Incorrect
git checkout -b feature/TEL-123
```

#### 2. Report File Not Found

**Error:** Report file not found at path

**Solution:**
```bash
# Verify report exists
ls -la coverage/ut-results.json

# For Angular
npm run test:report

# For LoopBack
npm run test:report:collect
```

#### 3. Docker Services Not Starting

**Solution:**
```bash
# Check ports
lsof -i :5001
lsof -i :5002
lsof -i :6333

# Restart services
docker ps
docker stop <container_id>
docker run -d -p 5001:3000 mcr.microsoft.com/presidio-anonymizer:latest
```

#### 4. OpenRouter AI Rate Limit

**Error:** 429 Too Many Requests

**Solution:**
- Check API credits at https://openrouter.ai/account
- Wait for rate limit reset
- Consider upgrading plan

#### 5. Jira Authentication Failed

**Error:** 401 Unauthorized

**Solution:**
- Verify API token at https://id.atlassian.com/manage/api-tokens
- Check email matches token owner
- Ensure correct URL format (no trailing slash)

### Debug Mode

```bash
# View generated prompt
cat prompt.txt

# Check Docker logs
docker logs <container_id>

# Enable verbose logging
export NODE_ENV=development
npm start
```

### Getting Help

- **Documentation**: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Issues**: https://github.com/sourcefuse/check-quality-of-unit-testcases/issues
- **Email**: vishal.gupta@sourcefuse.com

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/improvement
   ```
3. Make your changes and add tests
4. Ensure linting passes:
   ```bash
   npm run lint
   npm run format-check
   ```
5. Commit using conventional commits:
   ```bash
   git commit -am 'feat: add new feature'
   ```
6. Push to your fork:
   ```bash
   git push origin feature/improvement
   ```
7. Open a Pull Request

### Development Setup

```bash
# Clone repository
git clone https://github.com/sourcefuse/check-quality-of-unit-testcases.git
cd check-quality-of-unit-testcases

# Install dependencies
npm install

# Build TypeScript
npm run build

# Format code
npm run format

# Run linting
npm run lint
```

### Code Style

- TypeScript 5.x
- ESLint + Prettier for formatting
- Single quotes, 2-space indentation
- Conventional commits for messages

## License

MIT © 2025 Vishal Gupta

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Support

### Documentation
- [Setup Guide](./SETUP_GUIDE.md) - Comprehensive setup instructions
- [Architecture Diagram](./arch.gif) - Visual workflow representation

### Resources
- **GitHub**: https://github.com/sourcefuse/check-quality-of-unit-testcases
- **OpenRouter AI**: https://openrouter.ai
- **Jira API**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/

### Contact
- **Author**: Vishal Gupta
- **Email**: vishal.gupta@sourcefuse.com
- **Organization**: SourceFuse

---

**Made with ❤️ by [SourceFuse](https://sourcefuse.com)**
