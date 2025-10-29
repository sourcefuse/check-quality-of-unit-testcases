# Setup Guide: Check Quality of Unit Test Cases

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Project-Specific Setup](#project-specific-setup)
- [Testing Locally](#testing-locally)
- [Notifications](#notifications)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Version History](#version-history)

## Overview

This GitHub Action analyzes unit test quality using AI-powered assessment. It integrates with:
- **OpenRouter AI** for intelligent test analysis
- **Jira/Confluence** for project documentation and output
- **GitHub Actions** for CI/CD automation
- **Presidio** for data anonymization
- **Qdrant** for vector storage
- **Branch Name Validation** for enforcing JIRA naming conventions

### Key Features
- ✅ Automated test quality analysis
- ✅ Branch name validation (case-insensitive)
- ✅ Automatic PR comments on failure
- ✅ Support for Angular and LoopBack projects
- ✅ Confluence integration for reports
- ✅ Multi-notification support (Slack, Email, Teams)

## Prerequisites

### Required Software
- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher
- **Git**: Latest version
- **Docker**: For local testing (optional)

### Required Accounts & Access
1. **GitHub Account** with repository access
2. **OpenRouter AI Account** with API key (https://openrouter.ai)
3. **Jira/Confluence Access** with API tokens
4. **Docker Hub Account** for pulling required images
5. **AWS Account** (optional, for S3 storage)

## Quick Start

### Step 1: Copy Workflow File

Download the pre-configured workflow file to your project:

```bash
# Create workflows directory if it doesn't exist
mkdir -p .github/workflows

# Download the workflow file
curl -o .github/workflows/test-quality-check.yml \
  https://raw.githubusercontent.com/sourcefuse/check-quality-of-unit-testcases/main/setup.yml
```

Or manually copy:
```bash
cp /path/to/check-quality-of-unit-testcases/setup.yml .github/workflows/test-quality-check.yml
```

### Step 2: Configure GitHub Secrets

Go to your repository → **Settings** → **Secrets and Variables** → **Actions**

**Add the following Secrets:**

| Secret Name | Description | Required |
|------------|-------------|----------|
| `OPEN_ROUTER_API_KEY` | Your OpenRouter AI API key | ✅ Yes |
| `JIRA_API_TOKEN` | Jira API token for input | ✅ Yes |
| `JIRA_API_TOKEN_OUTPUT` | Jira API token for output | ✅ Yes |
| `DOCKER_PASSWORD` | Docker Hub password | ✅ Yes |
| `AWS_ACCESS_KEY_UT` | AWS access key (if using S3) | ⚠️ Optional |
| `AWS_SECRET_KEY_UT` | AWS secret key (if using S3) | ⚠️ Optional |

### Step 3: Configure GitHub Variables

Go to your repository → **Settings** → **Secrets and Variables** → **Actions** → **Variables** tab

**Add the following Variables:**

| Variable Name | Description | Example | Required |
|--------------|-------------|---------|----------|
| `JIRA_PROJECT_KEY` | Your JIRA project key (also used for branch validation) | `TEL` | ✅ Yes |
| `JIRA_URL` | Jira instance URL | `https://company.atlassian.net` | ✅ Yes |
| `JIRA_EMAIL` | Jira email for authentication | `user@company.com` | ✅ Yes |
| `JIRA_URL_OUTPUT` | Jira URL for output | `https://company.atlassian.net` | ✅ Yes |
| `JIRA_EMAIL_OUTPUT` | Jira email for output | `user@company.com` | ✅ Yes |
| `JIRA_SPACE_KEY_OUTPUT` | Confluence space key | `MYSPACE` | ✅ Yes |
| `OPEN_ROUTER_MODEL` | AI model to use | `anthropic/claude-3.5-sonnet` | ✅ Yes |
| `DOCKER_USERNAME` | Docker Hub username | `myusername` | ✅ Yes |
| `USE_FOR` | Type of analysis | `GenerateTestCasesReport_API` or `GenerateTestCasesReport_UI` | ✅ Yes |
| `AWS_REGION_UT` | AWS region | `us-east-1` | ⚠️ Optional |
| `S3_BUCKET_NAME_UT` | S3 bucket name | `my-bucket` | ⚠️ Optional |
| `PROJECT_DOCUMENT_PATH` | Path to project docs in S3 | `docs/project.md` | ⚠️ Optional |

### Step 4: Setup Your Project

**For Angular Projects:**

1. Install required dependency:
```bash
npm install --save-dev karma-json-result-reporter
```

2. Copy the utility script:
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

4. Update `package.json`:
```json
{
  "scripts": {
    "test": "ng test --watch=false --code-coverage",
    "test:report": "npm test && node getTestUtil.js"
  }
}
```

**For LoopBack Projects:**

1. Copy the utility script:
```bash
curl -o updateForReport.js \
  https://raw.githubusercontent.com/sourcefuse/check-quality-of-unit-testcases/main/src/loopback/updateForReport.js
```

2. Update or create `.mocharc.json`:
```json
{
  "exit": true,
  "recursive": true,
  "require": "source-map-support/register",
  "reporter": "json",
  "reporter-option": ["output=test-results.json"]
}
```

3. Update `package.json`:
```json
{
  "scripts": {
    "test": "lb-mocha",
    "test:report:update": "node updateForReport.js update-mocha",
    "test:report:collect": "npm test && node updateForReport.js collect-report"
  }
}
```

### Step 5: Update Workflow for Your Project Type

Edit `.github/workflows/test-quality-check.yml` and uncomment the section for your project:

**For Angular:**
```yaml
- name: Build
  run: |
    npm install
    npm run test:report  # Uncomment this for Angular
```

**For LoopBack:**
```yaml
- name: Build
  run: |
    npm install
    npm run test:report:collect  # Uncomment this for LoopBack
```

### Step 6: Create a Test Pull Request

1. Create a new branch following the naming convention:
```bash
git checkout -b TEL-123-add-feature
```

2. Make your changes and push:
```bash
git add .
git commit -m "Add new feature"
git push origin TEL-123-add-feature
```

3. Create a Pull Request on GitHub

4. Watch the workflow run:
   - ✅ Branch name validation
   - ✅ Test execution
   - ✅ Quality analysis
   - ✅ PR comment with results

## Configuration

### Understanding Branch Name Validation

The workflow automatically validates that your branch name starts with your `JIRA_PROJECT_KEY`.

**How it works:**
- Case-insensitive comparison
- Runs before any other steps
- Fails fast to save resources
- Can be skipped by not setting `JIRA_PROJECT_KEY`

**Examples (if JIRA_PROJECT_KEY = "TEL"):**
- ✅ `TEL-123-add-feature` → Valid
- ✅ `tel-456-bugfix` → Valid (case insensitive)
- ✅ `TELESCOPE-789` → Valid (starts with TEL)
- ❌ `feature/login` → Invalid
- ❌ `bugfix/TEL-123` → Invalid (doesn't start with TEL)

### Environment Variables Reference

#### OpenRouter AI Configuration
- **OPEN_ROUTER_API_KEY**: API key from https://openrouter.ai
- **OPEN_ROUTER_MODEL**: AI model (e.g., `anthropic/claude-3.5-sonnet`, `openai/gpt-4`)
- **USE_FOR**: Analysis type
  - `GenerateTestCasesReport_API` - For API/Backend tests
  - `GenerateTestCasesReport_UI` - For UI/Frontend tests

#### Jira Configuration (Input)
- **JIRA_URL**: Jira instance URL (e.g., `https://company.atlassian.net`)
- **JIRA_EMAIL**: Email for authentication
- **JIRA_API_TOKEN**: Generate from https://id.atlassian.com/manage/api-tokens
- **JIRA_PROJECT_KEY**: Project key (also used for branch validation)

#### Jira Configuration (Output)
- **JIRA_URL_OUTPUT**: Jira instance URL (can be same as input)
- **JIRA_EMAIL_OUTPUT**: Email for output authentication
- **JIRA_API_TOKEN_OUTPUT**: API token for output
- **JIRA_SPACE_KEY_OUTPUT**: Confluence space for results

#### AWS Configuration (Optional)
- **AWS_ACCESS_KEY**: AWS access key ID
- **AWS_SECRET_KEY**: AWS secret access key
- **AWS_REGION**: AWS region (e.g., `us-east-1`)
- **S3_BUCKET_NAME**: Bucket name for prompts/documents
- **PROJECT_DOCUMENT_PATH**: Path to docs in S3

#### Docker Configuration
- **DOCKER_USERNAME**: Docker Hub username
- **DOCKER_PASSWORD**: Docker Hub password

## Project-Specific Setup

### LoopBack Monorepo Support

For Lerna-based monorepos with structure:
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

## Testing Locally

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

### Step 2: Create .env File

Create `.env` in project root:

```bash
# GitHub Configuration
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_username
GITHUB_REPO=your_repo_name
GITHUB_ISSUE_NUMBER=1

# OpenRouter AI
OPEN_ROUTER_API_KEY=your_key
OPEN_ROUTER_API_URL=https://openrouter.ai/api/v1
OPEN_ROUTER_MODEL=anthropic/claude-3.5-sonnet

# Jira Input
JIRA_URL=https://company.atlassian.net
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN=your_token
JIRA_PROJECT_KEY=TEL
JIRA_TICKET_ID=TEL-123

# Jira Output
JIRA_URL_OUTPUT=https://company.atlassian.net
JIRA_EMAIL_OUTPUT=user@company.com
JIRA_API_TOKEN_OUTPUT=your_token
JIRA_SPACE_KEY_OUTPUT=MYSPACE

# Test Configuration
REPORT_FILE_PATH=coverage/ut-results.json
USE_FOR=GenerateTestCasesReport_API

# Docker Services
PRESIDIO_ANALYZE_URL=http://localhost:5002/analyze
PRESIDIO_ANONYMIZE_URL=http://localhost:5001/anonymize
VECTOR_STORE_TYPE=QDRANT
VECTOR_STORE_URL=http://127.0.0.1:6333
```

### Step 3: Run Tests and Analysis

```bash
# For Angular
npm run test:report

# For LoopBack
npm run test:report:collect

# Verify report exists
ls -la coverage/ut-results.json

# Run analysis
npm start
```

### Step 4: View Results

- Check console output for summary
- View Confluence page (link in output)
- Check `prompt.txt` for debugging

## Notifications

The workflow includes built-in failure notifications via PR comments.

### Built-in PR Comment Notifications

When a workflow fails, an automatic comment is posted with:
- ❌ Failure notification header
- Workflow run URL
- Branch name and failed job
- Possible failure reasons
- Mention to PR author

### Additional Notification Options

For Slack, Email, Microsoft Teams, and custom webhooks, see:
📖 **[NOTIFICATION_SETUP.md](./NOTIFICATION_SETUP.md)**

### Quick Slack Setup

Add this step to your workflow after the quality checker:

```yaml
- name: Notify Slack on Failure
  if: failure()
  run: |
    curl -X POST -H 'Content-type: application/json' \
    --data '{
      "text":"❌ Test Quality Check Failed\nRepo: ${{ github.repository }}\nBranch: ${{ github.head_ref }}\nPR: ${{ github.event.pull_request.html_url }}"
    }' \
    ${{ secrets.SLACK_WEBHOOK_URL }}
```

**Required Secret:** Add `SLACK_WEBHOOK_URL` to repository secrets

## Troubleshooting

### Common Issues

#### 1. Branch Name Validation Fails

**Error:** `❌ Error: Branch name must start with 'XXX'`

**Solution:**
- Branch must start with `JIRA_PROJECT_KEY`
- Validation is case-insensitive
- Format: `JIRA_KEY-NUMBER-description`
- Examples: `TEL-123-feature`, `PROJ-456-bugfix`

**Common mistakes:**
- ❌ `feature/TEL-123` (doesn't start with key)
- ✅ `TEL-123-feature` (correct)
- ✅ `tel-456-bugfix` (correct, case insensitive)

#### 2. Report File Not Found

**Error:** Report file not found at `coverage/ut-results.json`

**Solution:**
- Verify tests ran successfully
- Check report path: `ls -la coverage/ut-results.json`
- For Angular: Ensure `getTestUtil.js` is executed
- For LoopBack: Ensure `updateForReport.js collect-report` ran

#### 3. Docker Services Not Starting

**Error:** Cannot connect to Docker services

**Solution:**
```bash
# Check port availability
lsof -i :5001
lsof -i :5002
lsof -i :6333

# Stop existing containers
docker ps
docker stop <container_id>

# Restart services
docker run -d -p 5001:3000 mcr.microsoft.com/presidio-anonymizer:latest
docker run -d -p 5002:3000 mcr.microsoft.com/presidio-analyzer:latest
docker run -d -p 6333:6333 qdrant/qdrant
```

#### 4. Jira Authentication Failed

**Error:** 401 Unauthorized or 403 Forbidden

**Solution:**
- Verify API token: https://id.atlassian.com/manage/api-tokens
- Check email matches token owner
- Ensure URL format: `https://domain.atlassian.net` (no trailing slash)
- Verify user has project/space access

#### 5. OpenRouter AI API Errors

**Error:** API key invalid or rate limit exceeded

**Solution:**
- Verify API key is valid
- Check model name: https://openrouter.ai/models
- Ensure sufficient credits in account
- Review rate limits

#### 6. Confluence Output Error

**Error:** `Confluence Output details not set`

**Solution:**
All four variables must be set:
- `JIRA_URL_OUTPUT`
- `JIRA_EMAIL_OUTPUT`
- `JIRA_API_TOKEN_OUTPUT`
- `JIRA_SPACE_KEY_OUTPUT`

#### 7. Workflow Fails Silently

**Solution:**
- Check all secrets are configured
- Verify repository permissions: Settings → Actions → General
- Review workflow logs in Actions tab
- Ensure `GITHUB_TOKEN` has `pull-requests: write` permission

### Debug Mode

Enable detailed logging:

```bash
# View generated prompt
cat prompt.txt

# Check Docker logs
docker logs <container_id>

# View workflow logs
# Go to Actions tab → Select workflow run → View logs
```

### Getting Help

If issues persist:

1. **Check Logs** - Review console output and error messages
2. **Verify Configuration** - Double-check all secrets and variables
3. **Test Services** - Ensure Docker services are running (for local)
4. **GitHub Issues** - Report at https://github.com/sourcefuse/check-quality-of-unit-testcases/issues
5. **Contact** - Email vishal.gupta@sourcefuse.com

## Best Practices

### Security
- ❌ Never commit `.env` files to version control
- ✅ Use GitHub Secrets for sensitive data
- ✅ Rotate API tokens regularly
- ✅ Use separate tokens for input/output if possible

### Performance
- ✅ Use specific AI models for faster response
- ✅ Limit test report size for large projects
- ✅ Enable caching in CI/CD
- ✅ Branch validation fails fast to save resources

### Quality
- ✅ Review AI analysis regularly
- ✅ Combine with manual code reviews
- ✅ Track quality metrics over time
- ✅ Adjust prompts in `prompts/` directory as needed

### Maintenance
- ✅ Keep dependencies updated
- ✅ Monitor OpenRouter AI credits
- ✅ Clean up old Confluence pages periodically
- ✅ Review and update workflow configuration

### Branch Naming
- ✅ Always use JIRA ticket numbers
- ✅ Follow format: `JIRA_KEY-NUMBER-description`
- ✅ Use descriptive names: `TEL-123-add-user-authentication`
- ❌ Avoid prefixes before JIRA key: `feature/TEL-123`

## Version History

### V1.2.0 (Latest)
- ✨ Added branch name validation with JIRA_PROJECT_KEY
- ✨ Case-insensitive branch name checking
- ✨ Added "reopened" trigger for pull requests
- ✨ Built-in failure notifications via PR comments
- 📚 Comprehensive notification setup guide
- 🔧 Improved workflow organization

### V1.1.0
- 📚 Comprehensive SETUP_GUIDE.md documentation
- 🎯 Framework-specific setup for Angular and LoopBack
- 💬 Enhanced error messages

### V1.0.0
- 🚀 Initial release
- 🤖 AI-powered test quality analysis
- 🔗 Jira/Confluence integration

## Usage in GitHub Actions

### Latest Version (Recommended)

```yaml
- uses: sourcefuse/check-quality-of-unit-testcases@V1.2.0
```

### Specific Versions

```yaml
- uses: sourcefuse/check-quality-of-unit-testcases@V1.1.0
- uses: sourcefuse/check-quality-of-unit-testcases@V1.0.0
```

### Complete Workflow Example

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
          node-version: 23

      - name: Run Tests
        run: |
          npm install
          npm run test:report

      - uses: sourcefuse/check-quality-of-unit-testcases@V1.2.0
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

## Next Steps

After successful setup:

1. ✅ Create a branch: `git checkout -b TEL-123-my-feature`
2. ✅ Make changes and create a PR
3. ✅ Review the quality analysis in Confluence
4. ✅ Adjust prompts in `prompts/` directory if needed
5. ✅ Configure additional notifications (Slack, Email, Teams)
6. ✅ Set up quality thresholds for your team
7. ✅ Integrate with other CI/CD tools

## Additional Resources

- 📖 [Notification Setup Guide](./NOTIFICATION_SETUP.md) - Configure Slack, Email, Teams notifications
- 🔗 [OpenRouter AI Models](https://openrouter.ai/models) - Available AI models
- 🔗 [Jira API Tokens](https://id.atlassian.com/manage/api-tokens) - Generate API tokens
- 🔗 [GitHub Actions Documentation](https://docs.github.com/en/actions) - GitHub Actions reference

## License

MIT © 2025 Vishal Gupta

## Support

- 📧 Email: vishal.gupta@sourcefuse.com
- 🐛 Issues: https://github.com/sourcefuse/check-quality-of-unit-testcases/issues
- 📚 Documentation: https://github.com/sourcefuse/check-quality-of-unit-testcases
