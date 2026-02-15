import { db } from '../db/client';
import { prompts, promptVersions } from '../db/schema';
import { eq } from 'drizzle-orm';

const mockPrompts = [
	{
		title: 'Code Review Assistant',
		description:
			'AI-powered code review helper that analyzes code quality, security vulnerabilities, and best practices violations.',
		purpose: 'development',
		tags: ['code-review', 'quality', 'security'],
		versions: [
			{
				version: '1.0.0',
				changeType: 'major',
				changeNotes: 'Initial version with basic review capabilities',
				content: `# Code Review Assistant

You are an expert code reviewer. Analyze the provided code for:

## Quality Checks
- **Code Style**: Follow language-specific conventions
- **Naming**: Use clear, descriptive variable/function names
- **Complexity**: Flag overly complex functions (>10 cyclomatic complexity)

## Security Checks
- SQL Injection vulnerabilities
- XSS risks in web applications
- Authentication/authorization issues
- Hardcoded credentials or API keys

## Best Practices
- DRY principle violations
- Missing error handling
- Inefficient algorithms
- Lack of documentation

Provide specific, actionable feedback with code examples.`
			}
		]
	},
	{
		title: 'Blog Post Generator',
		description:
			'Creates engaging, SEO-optimized blog posts on any topic with proper structure and formatting.',
		purpose: 'writing',
		tags: ['content', 'seo', 'blogging'],
		versions: [
			{
				version: '1.0.0',
				changeType: 'major',
				changeNotes: 'First release with blog generation',
				content: `# Blog Post Generator

Write a comprehensive blog post about: **{topic}**

## Requirements
- Engaging introduction with hook
- 3-5 main sections with H2/H3 headings
- SEO-optimized (include keywords naturally)
- Call-to-action conclusion
- Target length: 1500-2000 words

## Tone
- Professional yet conversational
- Expert but accessible
- Include real-world examples
- Add statistics/studies where relevant

## Output Format
\`\`\`markdown
# Compelling Title

## Introduction
[Hook + thesis statement]

## Section 1
[Content with examples]

## Conclusion
[Summary + CTA]
\`\`\`
`
			}
		]
	},
	{
		title: 'Data Analysis Helper',
		description:
			'Guides users through exploratory data analysis with statistical methods and visualization recommendations.',
		purpose: 'analysis',
		tags: ['data-science', 'statistics', 'visualization'],
		versions: [
			{
				version: '1.0.0',
				changeType: 'major',
				changeNotes: 'Initial data analysis capabilities',
				content: `# Data Analysis Helper

Help me analyze my dataset step by step.

## Step 1: Understanding the Data
- Load and inspect the data structure
- Identify data types and missing values
- Check basic statistics (mean, median, mode, std)

## Step 2: Data Cleaning
- Handle missing values appropriately
- Remove duplicates
- Fix data type issues
- Detect and handle outliers

## Step 3: Exploratory Analysis
- **Univariate**: Distribution plots, histograms
- **Bivariate**: Scatter plots, correlation matrices
- **Multivariate**: Pair plots, heatmaps

## Step 4: Statistical Testing
- Hypothesis formulation
- Choose appropriate test (t-test, ANOVA, chi-square)
- Check assumptions
- Interpret p-values and effect sizes

## Step 5: Visualization
 Recommend best charts based on data types:
- Categorical: Bar charts, pie charts
- Numerical: Histograms, box plots
- Time-series: Line charts
- Relationships: Scatter plots, correlation heatmaps
`
			}
		]
	},
	{
		title: 'Email Template Creator',
		description:
			'Generates professional email templates for various business contexts with personalization options.',
		purpose: 'writing',
		tags: ['email', 'business', 'communication'],
		versions: [
			{
				version: '1.0.0',
				changeType: 'major',
				changeNotes: 'Initial email template generation',
				content: `# Email Template Creator

Create a professional email for: **{purpose}**

## Email Structure

### Subject Line
- Clear and concise
- Action-oriented when appropriate
- Include urgency if time-sensitive

### Salutation
- Professional greeting
- Use recipient's name when known

### Opening
- State purpose immediately
- Build context if needed
- Keep it 2-3 sentences

### Body
- **One main idea per paragraph**
- Bullet points for lists
- Clear call-to-action
- Professional tone throughout

### Closing
- Next steps (if applicable)
- Professional sign-off
- Contact information

## Best Practices
- Keep it brief (<200 words preferred)
- Use active voice
- Proofread for typos
- Consider mobile readers

## Common Templates
1. **Meeting Request**: Clear agenda + time options
2. **Follow-up**: Reference previous conversation + CTA
3. **Proposal**: Value proposition + next steps
4. **Thank You**: Specific appreciation + future outlook
`
			}
		]
	},
	{
		title: 'API Documentation Writer',
		description:
			'Creates clear, comprehensive API documentation with examples and use cases for REST endpoints.',
		purpose: 'development',
		tags: ['api', 'documentation', 'rest'],
		versions: [
			{
				version: '1.0.0',
				changeType: 'major',
				changeNotes: 'Initial API documentation generator',
				content: `# API Documentation Writer

Document the following API endpoint comprehensively.

## Required Sections

### Endpoint Overview
\`\`\`
METHOD /api/resource/:id
Description: Brief explanation of what this endpoint does
Authentication: Required (e.g., Bearer token)
\`\`\`

### Request Parameters

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Unique identifier |

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| include | string | No | null | Related resources to include |

#### Request Body
\`\`\`json
{
  "field": "type",
  "example": "value"
}
\`\`\`

### Response Examples

#### Success Response (200)
\`\`\`json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20
  }
}
\`\`\`

#### Error Response (404)
\`\`\`json
{
  "error": "Resource not found",
  "message": "No resource exists with the provided ID"
}
\`\`\`

### Code Examples

#### cURL
\`\`\`bash
curl -X GET \\
  https://api.example.com/v1/resource/123 \\
  -H 'Authorization: Bearer YOUR_TOKEN'
\`\`\`

#### JavaScript (fetch)
\`\`\`javascript
const response = await fetch('https://api.example.com/v1/resource/123', {
  headers: {
    'Authorization': \`Bearer \${token}\`
  }
});
const data = await response.json();
\`\`\`
`
			}
		]
	},
	{
		title: 'Creative Writing Prompts',
		description:
			'Generates unique creative writing prompts with genre, character, and plot elements for fiction writers.',
		purpose: 'creative',
		tags: ['writing', 'fiction', 'prompts'],
		versions: [
			{
				version: '1.0.0',
				changeType: 'major',
				changeNotes: 'First creative prompts release',
				content: `# Creative Writing Prompt Generator

Generate a unique writing prompt based on these parameters.

## Prompt Components

### Genre
Select from: Fantasy, Sci-Fi, Mystery, Romance, Horror, Literary, Thriller

### Character Archetype
- The Reluctant Hero
- The Flawed Mentor
- The Double Agent
- The Outsider
- The Seeker

### Plot Element
1. **The Discovery**: Finding something that changes everything
2. **The Race Against Time**: Urgent deadline with high stakes
3. **The Moral Dilemma**: Choose between two difficult options
4. **The Identity Crisis**: Who am I really?
5. **The Redemption**: Can past wrongs ever be forgiven?

### Setting the Scene
Provide vivid details:
- **Time period**: Past, present, future, or timeless
- **Location**: Real or fictional place
- **Atmosphere**: Tense, whimsical, foreboding, hopeful

### The Prompt Template
\`\`\`
**Genre**: [selected genre]

**Protagonist**: A [character archetype] who [motivation].

**Inciting Incident**: When [event happens], they must [goal].

**Complication**: But [obstacle stands in their way].

**Stakes**: If they fail, [consequence].

**Opening Line Suggestion**: "[intriguing first line]"

**Key Theme**: [universal theme to explore]
\`\`\`

### Writing Exercise Options
1. **500-word scene**: Write just the opening scene
2. **Dialogue focus**: Character confrontation
3. **World-building**: Describe the setting in detail
4. **Internal monologue**: Character's thoughts at critical moment
`
			}
		]
	},
	{
		title: 'Meeting Notes Summarizer',
		description:
			'Transforms raw meeting notes into structured summaries with action items and decisions tracked.',
		purpose: 'general',
		tags: ['productivity', 'meetings', 'documentation'],
		versions: [
			{
				version: '1.0.0',
				changeType: 'major',
				changeNotes: 'Initial meeting notes feature',
				content: `# Meeting Notes Summarizer

Transform these meeting notes into a structured summary.

## Input Format
Paste or upload raw meeting notes (transcript, bullet points, etc.)

## Output Structure

### Meeting Overview
- **Date**: [meeting date]
- **Duration**: [length of meeting]
- **Attendees**: [list of participants]
- **Meeting Type**: [standup, planning, review, brainstorm, etc.]

### Agenda Items
1. [Topic 1]
2. [Topic 2]
3. [Topic 3]

### Key Discussion Points
For each agenda item:
- **Background**: Brief context
- **Discussion**: Main points raised
- **Consensus**: Level of agreement reached
- **Concerns**: Any objections or issues

### Decisions Made
| Decision | Rationale | Impact |
|----------|-----------|--------|
| [What was decided] | [Why] | [Who/what affected] |

### Action Items
| Task | Owner | Due Date | Priority | Status |
|------|-------|----------|----------|--------|
| [Specific action] | [Responsible person] | [Deadline] | High/Med/Low | Todo/Done |

### Next Steps
1. [What needs to happen next]
2. [Timeline for next meeting]
3. [Preparation required]

### Parking Lot / Follow-up
- Items discussed but not resolved
- Topics for future meetings
- Resources to be shared

## Best Practices
- Use clear, specific language
- Assign owners to all action items
- Include concrete deadlines
- Link related documents or resources
`
			}
		]
	},
	{
		title: 'SQL Query Builder',
		description:
			'Helps write complex SQL queries with proper joins, aggregations, and filtering for database operations.',
		purpose: 'development',
		tags: ['sql', 'database', 'querying'],
		versions: [
			{
				version: '1.0.0',
				changeType: 'major',
				changeNotes: 'SQL query building assistance',
				content: `# SQL Query Builder Assistant

Help me build a SQL query for my database.

## Information Needed

### Database Schema
Describe your tables:
\`\`\`sql
-- Example structure
users (id, name, email, created_at)
orders (id, user_id, total, status, created_at)
order_items (id, order_id, product_id, quantity, price)
products (id, name, category, price, stock)
\`\`\`

### What You Want
- **Goal**: What question should the query answer?
- **Output**: What columns do you need?
- **Filters**: Any conditions (WHERE clause)?
- **Grouping**: Need aggregations (COUNT, SUM, AVG)?
- **Sorting**: Order by what?

## Query Types I Can Help With

### 1. Basic SELECT
\`\`\`sql
SELECT column1, column2
FROM table
WHERE condition
ORDER BY column ASC
LIMIT 10;
\`\`\`

### 2. JOINs
\`\`\`sql
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed';
\`\`\`

### 3. Aggregations
\`\`\`sql
SELECT
  category,
  COUNT(*) as total_products,
  AVG(price) as avg_price,
  SUM(stock) as total_stock
FROM products
GROUP BY category
HAVING COUNT(*) > 5
ORDER BY avg_price DESC;
\`\`\`

### 4. Subqueries
\`\`\`sql
SELECT name, total
FROM orders
WHERE total > (
  SELECT AVG(total)
  FROM orders
);
\`\`\`

## Performance Tips
- Use **EXPLAIN** to analyze query plans
- Add indexes on frequently filtered columns
- Avoid SELECT * (specify columns)
- Use appropriate JOIN types (INNER vs LEFT)
- Limit results with LIMIT/OFFSET for pagination
`
			}
		]
	}
];

export async function seedMockData() {
	console.log('🌱 Seeding mock prompt data...');

	for (const mockPrompt of mockPrompts) {
		const existingPrompt = await db
			.select({ id: prompts.id })
			.from(prompts)
			.where(eq(prompts.title, mockPrompt.title))
			.limit(1);

		if (existingPrompt.length > 0) {
			console.log(`  - Skipped "${mockPrompt.title}" (already exists)`);
			continue;
		}

		// Insert prompt
		const [prompt] = await db
			.insert(prompts)
			.values({
				title: mockPrompt.title,
				description: mockPrompt.description,
				purpose: mockPrompt.purpose,
				tags: JSON.stringify(mockPrompt.tags),
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.returning();

		// Insert versions (reverse order to maintain chronological history)
		for (let i = mockPrompt.versions.length - 1; i >= 0; i--) {
			const versionData = mockPrompt.versions[i];
			await db.insert(promptVersions).values({
				promptId: prompt.id,
				version: versionData.version,
				content: versionData.content,
				changeType: versionData.changeType as 'major' | 'minor' | 'patch',
				changeNotes: versionData.changeNotes,
				createdAt: new Date(Date.now() - (mockPrompt.versions.length - 1 - i) * 86400000), // Stagger by day
				createdBy: 'seed-script'
			});
		}

		console.log(`  ✓ Created "${mockPrompt.title}" with ${mockPrompt.versions.length} version(s)`);
	}

	console.log('✅ Mock data seeding complete!');
}
