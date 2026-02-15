#!/usr/bin/env python3
import sqlite3
import json
from datetime import datetime

conn = sqlite3.connect('local.db')
cur = conn.cursor()

# Clear existing data
cur.execute("DELETE FROM prompt_versions")
cur.execute("DELETE FROM prompts")
conn.commit()

prompts_data = [
    {
        'title': 'Code Review Assistant',
        'description': 'AI-powered code review helper that analyzes code quality, security vulnerabilities, and best practices violations.',
        'purpose': 'development',
        'tags': ['code-review', 'quality', 'security'],
        'content': '''# Code Review Assistant

You are an expert code reviewer. Analyze the provided code for:

## Quality Checks
- **Code Style**: Follow language-specific conventions
- **Naming**: Use clear, descriptive variable/function names
- **Complexity**: Flag overly complex functions

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

Provide specific, actionable feedback with code examples.'''
    },
    {
        'title': 'Blog Post Generator',
        'description': 'Creates engaging, SEO-optimized blog posts on any topic with proper structure and formatting.',
        'purpose': 'writing',
        'tags': ['content', 'seo', 'blogging'],
        'content': '''# Blog Post Generator

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
- Include real-world examples'''
    },
    {
        'title': 'Data Analysis Helper',
        'description': 'Guides users through exploratory data analysis with statistical methods and visualization recommendations.',
        'purpose': 'analysis',
        'tags': ['data-science', 'statistics', 'visualization'],
        'content': '''# Data Analysis Helper

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
- **Multivariate**: Pair plots, heatmaps'''
    },
    {
        'title': 'Email Template Creator',
        'description': 'Generates professional email templates for various business contexts with personalization options.',
        'purpose': 'writing',
        'tags': ['email', 'business', 'communication'],
        'content': '''# Email Template Creator

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
- Professional tone throughout'''
    },
    {
        'title': 'API Documentation Writer',
        'description': 'Creates clear, comprehensive API documentation with examples and use cases for REST endpoints.',
        'purpose': 'development',
        'tags': ['api', 'documentation', 'rest'],
        'content': '''# API Documentation Writer

Document the following API endpoint comprehensively.

## Required Sections

### Endpoint Overview
```
METHOD /api/resource/:id
Description: Brief explanation
Authentication: Required (e.g., Bearer token)
```

### Request Parameters

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Unique identifier |

### Response Examples

#### Success Response (200)
```json
{
  "data": { ... }
}
```

#### Error Response (404)
```json
{
  "error": "Resource not found"
}
```'''
    },
    {
        'title': 'Creative Writing Prompts',
        'description': 'Generates unique creative writing prompts with genre, character, and plot elements for fiction writers.',
        'purpose': 'creative',
        'tags': ['writing', 'fiction', 'prompts'],
        'content': '''# Creative Writing Prompt Generator

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
5. **The Redemption**: Can past wrongs ever be forgiven?'''
    },
    {
        'title': 'Meeting Notes Summarizer',
        'description': 'Transforms raw meeting notes into structured summaries with action items and decisions tracked.',
        'purpose': 'general',
        'tags': ['productivity', 'meetings', 'documentation'],
        'content': '''# Meeting Notes Summarizer

Transform these meeting notes into a structured summary.

## Output Structure

### Meeting Overview
- **Date**: [meeting date]
- **Duration**: [length of meeting]
- **Attendees**: [list of participants]
- **Meeting Type**: [standup, planning, review]

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
| Task | Owner | Due Date | Priority |
|------|-------|----------|----------|
| [Specific action] | [Responsible] | [Deadline] | High/Med/Low |'''
    },
    {
        'title': 'SQL Query Builder',
        'description': 'Helps write complex SQL queries with proper joins, aggregations, and filtering for database operations.',
        'purpose': 'development',
        'tags': ['sql', 'database', 'querying'],
        'content': '''# SQL Query Builder Assistant

Help me build a SQL query for my database.

## Information Needed

### Database Schema
Describe your tables:
```sql
-- Example structure
users (id, name, email, created_at)
orders (id, user_id, total, status, created_at)
order_items (id, order_id, product_id, quantity, price)
products (id, name, category, price, stock)
```

### What You Want
- **Goal**: What question should the query answer?
- **Output**: What columns do you need?
- **Filters**: Any conditions (WHERE clause)?
- **Grouping**: Need aggregations (COUNT, SUM, AVG)?
- **Sorting**: Order by what?

## Query Types I Can Help With

### 1. Basic SELECT
```sql
SELECT column1, column2
FROM table
WHERE condition
ORDER BY column ASC
LIMIT 10;
```

### 2. JOINs
```sql
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed';
```

### 3. Aggregations
```sql
SELECT
  category,
  COUNT(*) as total_products,
  AVG(price) as avg_price
FROM products
GROUP BY category
HAVING COUNT(*) > 5;
```'''
    }
]

# Insert prompts and versions
for p in prompts_data:
    # Insert prompt
    cur.execute("""
        INSERT INTO prompts (title, description, purpose, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    """, (p['title'], p['description'], p['purpose'], json.dumps(p['tags'])))
    prompt_id = cur.lastrowid

    # Insert version
    cur.execute("""
        INSERT INTO prompt_versions (prompt_id, version, content, change_type, change_notes, created_at, created_by)
        VALUES (?, '1.0.0', ?, 'major', 'Initial version', datetime('now'), 'seed-script')
    """, (prompt_id, p['content']))

    print(f"✓ Created: {p['title']}")

conn.commit()
print(f"\n✅ Seeded {len(prompts_data)} prompts with markdown content!")

# Verify
cur.execute("SELECT COUNT(*) FROM prompts")
print(f"Total prompts in DB: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM prompt_versions")
print(f"Total versions in DB: {cur.fetchone()[0]}")

conn.close()
