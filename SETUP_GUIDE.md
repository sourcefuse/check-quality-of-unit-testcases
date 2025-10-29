# Setup Guide: Check Quality of Unit Test Cases

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project-Specific Setup](#project-specific-setup)
- [Running Locally](#running-locally)
- [GitHub Actions Integration](#github-actions-integration)
- [Troubleshooting](#troubleshooting)

## Overview

This GitHub Action analyzes unit test quality using AI-powered assessment. It integrates with:
- **OpenRouter AI** for intelligent test analysis
- **Jira/Confluence** for project documentation and output
- **GitHub Actions** for CI/CD automation
- **Presidio** for data anonymization
- **Qdrant** for vector storage

## Prerequisites

### Required Software
- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher
- **Git**: Latest version
- **Docker**: For local testing with Presidio and Qdrant

### Required Accounts & Access
1. **GitHub Account** with repository access
2. **OpenRouter AI Account** with API key
3. **Jira/Confluence Access** with API tokens
4. **AWS Account** (optional, for S3 storage)
5. **Docker Hub Account** (for pulling required images)

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/sfvishalgupta/check-quality-of-unit-testcases.git
cd check-quality-of-unit-testcases
```

### Step 2: Install Dependencies

Run the setup script which will:
- Clone the OpenRouterAICore library
- Install all npm dependencies
- Set up the project structure

```bash
bash setup.sh
```

Or manually:

```bash
# Clone OpenRouterAICore
git clone --branch=main --depth=1 https://github.com/sourcefuse/OpenRouterAICore.git ./OpenRouterAICore
rm -rf OpenRouterAICore/.git

# Install dependencies
cd OpenRouterAICore && npm install --legacy-peer-deps
cd .. && npm install
```

## Configuration

### Step 1: Create Environment File

Create a `.env` file in the project root with the following variables:

```bash
# GitHub Configuration
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repo_name
GITHUB_ISSUE_NUMBER=1

# OpenRouter AI Configuration
OPEN_ROUTER_API_KEY=your_openrouter_api_key
OPEN_ROUTER_API_URL=https://openrouter.ai/api/v1
OPEN_ROUTER_MODEL=anthropic/claude-3.5-sonnet

# Jira Input Configuration (for fetching project docs)
JIRA_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_PROJECT_KEY=YOUR_PROJECT_KEY
JIRA_TICKET_ID=PROJ-123
JIRA_FETCH_FIELDS=summary,description,customfield_10000
JIRA_MAX_RESULT=100

# Jira Output Configuration (for writing results to Confluence)
JIRA_URL_OUTPUT=https://your-domain.atlassian.net
JIRA_EMAIL_OUTPUT=your-email@company.com
JIRA_API_TOKEN_OUTPUT=your_jira_api_token
JIRA_SPACE_KEY_OUTPUT=MyTestSpace

# Test Report Configuration
REPORT_FILE_PATH=coverage/ut-results.json
USE_FOR=GenerateTestCasesReport_API

# Presidio Services (for local testing)
PRESIDIO_ANALYZE_URL=http://localhost:5002/analyze
PRESIDIO_ANONYMIZE_URL=http://localhost:5001/anonymize

# Vector Store Configuration
VECTOR_STORE_TYPE=QDRANT
VECTOR_STORE_URL=http://127.0.0.1:6333

# AWS Configuration (Optional - for S3 storage)
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket_name
PROJECT_DOCUMENT_PATH=path/to/project/docs

# Docker Hub Credentials
DOCKER_USERNAME=your_docker_username
DOCKER_PASSWORD=your_docker_password
```

### Step 2: Understanding Configuration Variables

#### OpenRouter AI Configuration
- **OPEN_ROUTER_API_KEY**: Your API key from https://openrouter.ai
- **OPEN_ROUTER_MODEL**: AI model to use (e.g., `anthropic/claude-3.5-sonnet`, `openai/gpt-4`)
- **USE_FOR**: Purpose of analysis
  - `GenerateTestCasesReport_API` - For API/Backend test analysis
  - `GenerateTestCasesReport_UI` - For UI/Frontend test analysis

#### Jira Configuration (Input)
Used to fetch project documentation from Confluence:
- **JIRA_URL**: Your Jira instance URL
- **JIRA_EMAIL**: Email for API authentication
- **JIRA_API_TOKEN**: Generate from: https://id.atlassian.com/manage/api-tokens
- **JIRA_PROJECT_KEY**: Confluence project/space key

#### Jira Configuration (Output)
Used to publish analysis results to Confluence:
- **JIRA_URL_OUTPUT**: Jira instance URL (can be same as input)
- **JIRA_EMAIL_OUTPUT**: Email for API authentication
- **JIRA_API_TOKEN_OUTPUT**: API token for output
- **JIRA_SPACE_KEY_OUTPUT**: Confluence space where results will be published

#### AWS Configuration (Optional)
Only required if storing prompts or project documents in S3:
- **AWS_ACCESS_KEY**: AWS access key ID
- **AWS_SECRET_KEY**: AWS secret access key
- **AWS_REGION**: Region where S3 bucket is hosted
- **S3_BUCKET_NAME**: Bucket containing prompts/documents

## Project-Specific Setup

### For Angular Projects

1. **Install karma-json-result-reporter**:
```bash
npm install --save-dev karma-json-result-reporter
```

2. **Update karma.conf.js**:
```javascript
module.exports = function(config) {
  config.set({
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-json-result-reporter'), // Add this
      // ... other plugins
    ],

    reporters: ['progress', 'json-result'], // Add 'json-result'

    jsonResultReporter: {
      outputFile: 'karma-result.json',
      isSynchronous: true
    },

    // ... rest of config
  });
};
```

3. **Copy the utility script**:
```bash
cp src/angular/getTestUtil.js ./getTestUtil.js
```

4. **Update package.json**:
```json
{
  "scripts": {
    "test": "ng test --watch=false --code-coverage",
    "test:report": "npm test && node getTestUtil.js"
  }
}
```

### For LoopBack Projects

1. **Update .mocharc.json** (or create if not exists):
```json
{
  "exit": true,
  "recursive": true,
  "require": "source-map-support/register",
  "reporter": "json",
  "reporter-option": ["output=test-results.json"]
}
```

2. **Copy the utility script**:
```bash
cp src/loopback/updateForReport.js ./updateForReport.js
```

3. **Update package.json**:
```json
{
  "scripts": {
    "test": "lb-mocha",
    "test:report:update": "node updateForReport.js update-mocha",
    "test:report:collect": "npm test && node updateForReport.js collect-report"
  }
}
```

4. **For Monorepo (Lerna) Projects**:
The LoopBack script supports monorepos with the following structure:
```
project-root/
├── services/
│   ├── service1/
│   ├── service2/
├── facades/
│   ├── facade1/
├── packages/
│   ├── package1/
```

Run commands:
```bash
# Update all mocha configs
node updateForReport.js update-mocha

# Collect test reports from all packages
node updateForReport.js collect-report
```

## Running Locally

### Step 1: Start Docker Services

```bash
# Login to Docker
docker login -u "your_username" -p "your_password"

# Pull required images
docker pull mcr.microsoft.com/presidio-analyzer:latest
docker pull mcr.microsoft.com/presidio-anonymizer:latest
docker pull qdrant/qdrant

# Start services
docker run -d -p 5001:3000 mcr.microsoft.com/presidio-anonymizer:latest
docker run -d -p 5002:3000 mcr.microsoft.com/presidio-analyzer:latest
docker run -d -p 6333:6333 qdrant/qdrant
```

### Step 2: Generate Test Reports

For Angular:
```bash
npm run test:report
```

For LoopBack:
```bash
npm run test:report:collect
```

Verify the report exists:
```bash
ls -la coverage/ut-results.json
```

### Step 3: Run the Analysis

```bash
npm start
# or
npx ts-node main.ts
```

### Step 4: View Results

- Check console output for analysis summary
- View detailed report in Confluence (link will be in output)
- Check `prompt.txt` for the generated prompt (debugging)

## GitHub Actions Integration

### Step 1: Configure Repository Secrets

Go to your repository → Settings → Secrets and Variables → Actions

**Add Secrets:**
- `AWS_ACCESS_KEY_UT` (if using S3)
- `AWS_SECRET_KEY_UT` (if using S3)
- `DOCKER_PASSWORD`
- `JIRA_API_TOKEN`
- `JIRA_API_TOKEN_OUTPUT`
- `OPEN_ROUTER_API_KEY`

**Add Variables:**
- `AWS_REGION_UT` (e.g., `us-east-1`)
- `DOCKER_USERNAME`
- `JIRA_EMAIL`
- `JIRA_EMAIL_OUTPUT`
- `JIRA_PROJECT_KEY`
- `JIRA_SPACE_KEY_OUTPUT`
- `JIRA_URL`
- `JIRA_URL_OUTPUT`
- `OPEN_ROUTER_MODEL` (e.g., `anthropic/claude-3.5-sonnet`)
- `PROJECT_DOCUMENT_PATH` (if using S3)
- `S3_BUCKET_NAME_UT` (if using S3)
- `USE_FOR` (e.g., `GenerateTestCasesReport_API`)

### Step 2: Create Workflow File

Create `.github/workflows/test-quality-check.yml`:

```yaml
name: Test Quality Check
on:
  pull_request:
    types: [opened, edited, synchronize]

permissions:
  contents: write
  pull-requests: write

jobs:
  analyze:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Use Node.js 18
        uses: actions/setup-node@v4
        with:
          node-version: 18

      # For Angular Projects
      - name: Run Tests (Angular)
        run: |
          npm install
          npm run test:report

      # For LoopBack Projects
      # - name: Run Tests (LoopBack)
      #   run: |
      #     npm install
      #     npm run test:report:collect

      - name: Run Test Quality Checker
        uses: sfvishalgupta/check-quality-of-unit-testcases@v3.0
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

          # OpenRouter AI
          OPEN_ROUTER_API_KEY: ${{ secrets.OPEN_ROUTER_API_KEY }}
          OPEN_ROUTER_MODEL: ${{ vars.OPEN_ROUTER_MODEL }}
          USE_FOR: ${{ vars.USE_FOR }}

          # Jira Input
          JIRA_URL: ${{ vars.JIRA_URL }}
          JIRA_EMAIL: ${{ vars.JIRA_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
          JIRA_PROJECT_KEY: ${{ vars.JIRA_PROJECT_KEY }}

          # Jira Output
          JIRA_URL_OUTPUT: ${{ vars.JIRA_URL_OUTPUT }}
          JIRA_EMAIL_OUTPUT: ${{ vars.JIRA_EMAIL_OUTPUT }}
          JIRA_API_TOKEN_OUTPUT: ${{ secrets.JIRA_API_TOKEN_OUTPUT }}
          JIRA_SPACE_KEY_OUTPUT: ${{ vars.JIRA_SPACE_KEY_OUTPUT }}

          # Docker
          DOCKER_USERNAME: ${{ vars.DOCKER_USERNAME }}
          DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}

          # AWS (Optional)
          AWS_ACCESS_KEY: ${{ secrets.AWS_ACCESS_KEY_UT || '' }}
          AWS_SECRET_KEY: ${{ secrets.AWS_SECRET_KEY_UT || '' }}
          AWS_REGION: ${{ vars.AWS_REGION_UT || '' }}
          S3_BUCKET_NAME: ${{ vars.S3_BUCKET_NAME_UT || '' }}
          PROJECT_DOCUMENT_PATH: ${{ vars.PROJECT_DOCUMENT_PATH || '' }}
```

### Step 3: Test the Workflow

1. Create a new branch
2. Make code changes
3. Create a pull request
4. Watch the workflow run in Actions tab
5. Check PR comments for the analysis summary

## Troubleshooting

### Common Issues

#### 1. "Report file not found" Error

**Solution:**
- Verify test report exists: `ls -la coverage/ut-results.json`
- Check test execution completed successfully
- Ensure correct `REPORT_FILE_PATH` in configuration

#### 2. Docker Services Not Starting

**Solution:**
```bash
# Check port availability
lsof -i :5001
lsof -i :5002
lsof -i :6333

# Kill existing processes if needed
docker ps
docker stop <container_id>

# Restart services
docker run -d -p 5001:3000 mcr.microsoft.com/presidio-anonymizer:latest
docker run -d -p 5002:3000 mcr.microsoft.com/presidio-analyzer:latest
docker run -d -p 6333:6333 qdrant/qdrant
```

#### 3. Jira Authentication Failed

**Solution:**
- Verify API token is valid: https://id.atlassian.com/manage/api-tokens
- Check email matches the token owner
- Ensure Jira URL format: `https://domain.atlassian.net` (no trailing slash)
- Verify user has access to the project/space

#### 4. OpenRouter AI API Errors

**Solution:**
- Verify API key is valid
- Check model name is correct (see https://openrouter.ai/models)
- Ensure sufficient credits in OpenRouter account
- Review rate limits

#### 5. "Confluence Output details not set" Error

**Solution:**
All four output variables must be set:
- `JIRA_URL_OUTPUT`
- `JIRA_EMAIL_OUTPUT`
- `JIRA_API_TOKEN_OUTPUT`
- `JIRA_SPACE_KEY_OUTPUT`

#### 6. GitHub Actions Workflow Fails

**Solution:**
- Check all secrets are properly configured
- Verify repository permissions (Settings → Actions → General)
- Review workflow logs for specific errors
- Ensure `GITHUB_TOKEN` has required permissions

### Debug Mode

Enable detailed logging by checking:
```bash
# View generated prompt
cat prompt.txt

# Check Docker logs
docker logs <container_id>

# View local logs (if running locally)
tail -f logs/*.log
```

### Getting Help

If you encounter issues:

1. **Check Logs**: Review console output and error messages
2. **Verify Configuration**: Double-check all environment variables
3. **Test Services**: Ensure Docker services are running
4. **GitHub Issues**: Report issues at https://github.com/sfvishalgupta/check-quality-of-unit-testcases/issues
5. **Contact**: Email vishal.gupta@sourcefuse.com

## Best Practices

1. **Security**
   - Never commit `.env` files to version control
   - Use GitHub Secrets for sensitive data
   - Rotate API tokens regularly

2. **Performance**
   - Use specific AI models for faster response
   - Limit test report size for large projects
   - Enable caching in CI/CD

3. **Quality**
   - Review AI analysis regularly
   - Combine with manual code reviews
   - Track quality metrics over time

4. **Maintenance**
   - Keep dependencies updated
   - Monitor OpenRouter AI credits
   - Clean up old Confluence pages periodically

## Next Steps

After successful setup:

1. Run analysis on your first PR
2. Review the Confluence output
3. Adjust prompts in `prompts/` directory if needed
4. Configure quality thresholds for your team
5. Integrate with other CI/CD tools

## License

MIT © 2025 Vishal Gupta
