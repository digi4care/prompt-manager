<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ThemeToggle } from '$lib/components/ui/theme-toggle';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription
	} from '$lib/components/ui/dialog';
	import { toast } from '$lib/components/ui/toast';
	import { PromptList, PromptCard, PromptMetadata, PromptEditor } from '$lib/components/prompts';
	import { VersionTimeline, VersionDiff } from '$lib/components/versions';
	import { ImprovementPanel, JudgeResults, VariantComparison } from '$lib/components/improvement';
	import {
		GenealogyTree,
		PerformanceChart,
		MetricsDashboard
	} from '$lib/components/visualizations';
	import type { Prompt, PromptVersion } from '$lib/stores/prompts.svelte';
	import type {
		JudgeResponse,
		HistoricalScore
	} from '$lib/components/improvement/judge-results.svelte';

	// Sample prompts for testing
	const samplePrompts: Prompt[] = [
		{
			id: 1,
			title: 'SQL Query Generator',
			description:
				'Generates optimized SQL queries based on natural language descriptions of data requirements.',
			purpose: 'development',
			tags: ['sql', 'database', 'generator'],
			llmProviders: ['openai'],
			createdAt: new Date('2025-12-01'),
			updatedAt: new Date('2025-12-20'),
			latestVersionId: 3,
			deletedAt: null
		},
		{
			id: 2,
			title: 'Code Review Assistant',
			description:
				'Analyzes code changes and provides constructive feedback on best practices, potential bugs, and improvements.',
			purpose: 'development',
			tags: ['code-review', 'quality', 'assistant'],
			llmProviders: ['openai'],
			createdAt: new Date('2025-12-05'),
			updatedAt: new Date('2025-12-18'),
			latestVersionId: 2,
			deletedAt: null
		},
		{
			id: 3,
			title: 'Blog Post Writer',
			description:
				'Creates engaging blog posts on various topics with SEO optimization and proper formatting.',
			purpose: 'writing',
			tags: ['blog', 'content', 'seo'],
			llmProviders: ['openai'],
			createdAt: new Date('2025-12-10'),
			updatedAt: new Date('2025-12-15'),
			latestVersionId: 1,
			deletedAt: null
		}
	];

	// Sample versions for testing
	const sampleVersions: PromptVersion[] = [
		{
			id: 3,
			promptId: 1,
			version: '1.2.0',
			content: 'Updated content with new features',
			metadata: null,
			parentVersionId: 2,
			changeType: 'minor',
			changeNotes: 'Added new functionality for advanced queries',
			createdAt: new Date('2025-12-20T10:30:00'),
			createdBy: 'user'
		},
		{
			id: 2,
			promptId: 1,
			version: '1.1.0',
			content: 'Updated content with improvements',
			metadata: null,
			parentVersionId: 1,
			changeType: 'patch',
			changeNotes: 'Fixed bugs and improved performance',
			createdAt: new Date('2025-12-15T14:00:00'),
			createdBy: 'user'
		},
		{
			id: 1,
			promptId: 1,
			version: '1.0.0',
			content: 'Original prompt content',
			metadata: null,
			parentVersionId: null,
			changeType: 'major',
			changeNotes: 'Initial version',
			createdAt: new Date('2025-12-01T09:00:00'),
			createdBy: 'user'
		}
	];

	// Sample evaluation data for JudgeResults
	const sampleEvaluation: JudgeResponse = {
		clarity: 78,
		completeness: 82,
		specificity: 65,
		gaps: [
			'Missing context about the expected output format',
			'No specification of edge cases to handle',
			'Unclear about the target audience expertise level'
		],
		recommendations: [
			'Add explicit instructions for output format (JSON, markdown, etc.)',
			'Specify handling of edge cases like empty inputs or errors',
			'Define the skill level of the expected user'
		]
	};

	// Sample historical data for JudgeResults
	const sampleHistoricalScores: HistoricalScore[] = [
		{
			versionId: 1,
			version: '1.0.0',
			createdAt: new Date('2025-12-01'),
			qualityScore: 58,
			clarity: 55,
			completeness: 60,
			specificity: 59
		},
		{
			versionId: 2,
			version: '1.1.0',
			createdAt: new Date('2025-12-08'),
			qualityScore: 65,
			clarity: 62,
			completeness: 68,
			specificity: 65
		},
		{
			versionId: 3,
			version: '1.2.0',
			createdAt: new Date('2025-12-15'),
			qualityScore: 72,
			clarity: 70,
			completeness: 75,
			specificity: 71
		},
		{
			versionId: 4,
			version: '1.3.0',
			createdAt: new Date('2025-12-22'),
			qualityScore: 75,
			clarity: 78,
			completeness: 82,
			specificity: 65
		}
	];

	// Sample evaluation without historical data (high scores)
	const sampleEvaluationNoHistory: JudgeResponse = {
		clarity: 92,
		completeness: 88,
		specificity: 95,
		gaps: [],
		recommendations: [
			'Consider adding examples for even better clarity',
			'The prompt is already excellent!'
		]
	};

	// Sample parent version for VariantComparison
	const sampleParentVersion = {
		id: 3,
		version: '1.2.0',
		title: 'SQL Query Generator',
		description: 'Generates optimized SQL queries',
		content: `You are a SQL expert. Create a query to fetch data based on user requirements.

Requirements:
- Include all necessary joins
- Use appropriate indexes
- Optimize for performance

Output the query with a brief explanation.`,
		tags: ['sql', 'database'],
		platform: 'OpenAI',
		purpose: 'development'
	};

	// Sample variants with evaluations for VariantComparison
	const sampleVariants = [
		{
			variant: {
				id: 101,
				version: '1.3.0',
				content: `You are a senior SQL performance expert with 15+ years of experience optimizing queries for PostgreSQL, MySQL, and SQL Server.

## Task
Create an optimized SQL query based on the user's natural language description of their data requirements.

## Requirements
1. **Joins**: Always use INNER JOIN for required relationships, LEFT JOIN only when the user explicitly needs optional data
2. **Indexes**: Suggest relevant indexes if the query involves large tables (>100k rows)
3. **Performance**:
   - Use EXPLAIN ANALYZE to verify query plans
   - Avoid SELECT * - only retrieve needed columns
   - Use CTEs for complex subqueries instead of nested subselects
   - Apply proper pagination with LIMIT/OFFSET or cursor-based pagination

## Output Format
Provide:
1. The complete SQL query
2. Brief explanation of optimization choices
3. Suggested indexes if applicable
4. Estimated complexity (O(log n), O(n), O(n log n), O(n²))`,
				changeType: 'minor',
				changeNotes: 'Enhanced with detailed performance guidelines',
				createdAt: '2025-12-28T10:00:00Z',
				createdBy: 'AI'
			},
			evaluation: {
				clarity: 95,
				completeness: 92,
				specificity: 98,
				gaps: [],
				recommendations: ['Consider adding specific examples for each database dialect']
			}
		},
		{
			variant: {
				id: 102,
				version: '1.3.0',
				content: `You are an expert SQL developer. Your task is to write efficient, readable, and secure SQL queries.

## Input Format
User will provide:
- Table names and their structures
- Required columns
- Filter conditions
- Sort requirements
- Any performance constraints

## Guidelines
- Write queries that are easy to understand and maintain
- Use proper indentation and aliases
- Add comments for complex logic
- Never use string concatenation for values (use parameterized queries)
- Handle NULL values appropriately
- Use appropriate data types for comparisons

## Example Output
\`\`\`sql
-- Query to fetch active users with their last login
SELECT
    u.id,
    u.username,
    u.email,
    MAX(l.login_at) as last_login
FROM users u
LEFT JOIN logins l ON u.id = l.user_id
WHERE u.status = 'active'
GROUP BY u.id, u.username, u.email
ORDER BY last_login DESC
LIMIT 100;
\`\`\``,
				changeType: 'minor',
				changeNotes: 'Improved structure and security guidelines',
				createdAt: '2025-12-28T10:01:00Z',
				createdBy: 'AI'
			},
			evaluation: {
				clarity: 88,
				completeness: 85,
				specificity: 82,
				gaps: [
					'Missing guidance on handling large datasets',
					'No mention of query execution plan analysis'
				],
				recommendations: [
					'Add pagination guidance for large result sets',
					'Include tips for reading EXPLAIN output'
				]
			}
		},
		{
			variant: {
				id: 103,
				version: '1.3.0',
				content: `Create SQL queries based on user requirements.

Simply write the query that matches what the user asks for.
Use standard SQL that works across PostgreSQL, MySQL, and SQL Server.`,
				changeType: 'patch',
				changeNotes: 'Simplified version',
				createdAt: '2025-12-28T10:02:00Z',
				createdBy: 'AI'
			},
			evaluation: {
				clarity: 45,
				completeness: 30,
				specificity: 25,
				gaps: [
					'Missing all structural requirements',
					'No guidance on joins, performance, or security',
					'Too vague to produce quality SQL'
				],
				recommendations: [
					'Add detailed requirements section',
					'Include performance optimization guidelines',
					'Add security best practices',
					'Provide example output format'
				]
			}
		}
	];

	let selectedVariant = $state<any | null>(null);
	let rejectedCount = $state(0);

	function handleVariantSelect(variant: any) {
		selectedVariant = variant;
		toast({
			title: 'Variant Selected',
			description: `You selected variant ${variant.version}`,
			variant: 'success'
		});
	}

	function handleRejectAll() {
		rejectedCount++;
		selectedVariant = null;
		toast({
			title: 'All Variants Rejected',
			description: 'You can try improving again with different parameters',
			variant: 'warning'
		});
	}

	let selectedPrompt = $state<Prompt | null>(null);
	let selectedVersion = $state<PromptVersion | null>(null);
	let currentVersionId = $state<number | null>(3);

	function handlePromptSelect(prompt: Prompt) {
		selectedPrompt = prompt;
		toast({
			title: 'Prompt Selected',
			description: `You selected: ${prompt.title}`,
			variant: 'success'
		});
	}

	function handleVersionSelect(version: PromptVersion) {
		selectedVersion = version;
		toast({
			title: 'Version Selected',
			description: `You selected version ${version.version}`,
			variant: 'success'
		});
	}

	// Sample performance data for PerformanceChart
	interface QualityScoreData {
		date: string;
		clarity: number;
		completeness: number;
		specificity: number;
		overall: number;
	}

	interface UsageData {
		date: string;
		count: number;
	}

	const sampleQualityScores: QualityScoreData[] = [
		{ date: '2025-12-01', clarity: 55, completeness: 60, specificity: 59, overall: 58 },
		{ date: '2025-12-08', clarity: 62, completeness: 68, specificity: 65, overall: 65 },
		{ date: '2025-12-15', clarity: 70, completeness: 75, specificity: 71, overall: 72 },
		{ date: '2025-12-22', clarity: 78, completeness: 82, specificity: 65, overall: 75 },
		{ date: '2025-12-29', clarity: 85, completeness: 88, specificity: 90, overall: 87 }
	];

	const sampleUsageData: UsageData[] = [
		{ date: '2025-12-01', count: 12 },
		{ date: '2025-12-08', count: 18 },
		{ date: '2025-12-15', count: 25 },
		{ date: '2025-12-22', count: 32 },
		{ date: '2025-12-29', count: 45 }
	];
</script>

<div class="container mx-auto space-y-8 p-8">
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<h1 class="text-3xl font-bold">UI Component Test Page</h1>
		<div class="flex items-center gap-2">
			<!-- Combined Theme + Font Settings -->
			<ThemeToggle />
		</div>
	</div>

	<!-- Color Palette / Design System - FIRST SECTION -->
	<section id="color-palette-section">
		<h2 class="mb-4 text-xl font-semibold">Catppuccin Design System</h2>
		<p class="mb-6 text-muted-foreground">
			Complete Catppuccin color palette - Frappé (light) / Mocha (dark)
		</p>

		<!-- Primary Colors -->
		<div class="mb-6">
			<h3 class="mb-3 text-sm font-medium text-muted-foreground">Primary Colors</h3>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-primary"></div>
					<p class="text-xs text-muted-foreground">Primary</p>
					<p class="font-mono text-xs">Mauve</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-primary/90"></div>
					<p class="text-xs text-muted-foreground">Primary 90%</p>
					<p class="font-mono text-xs">opacity-90</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-primary/80"></div>
					<p class="text-xs text-muted-foreground">Primary 80%</p>
					<p class="font-mono text-xs">opacity-80</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-primary-foreground text-primary"></div>
					<p class="text-xs text-muted-foreground">Primary FG</p>
					<p class="font-mono text-xs">Crust / Base</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-primary-foreground/10"></div>
					<p class="text-xs text-muted-foreground">Primary FG/10</p>
					<p class="font-mono text-xs">bg-10</p>
				</div>
			</div>
		</div>

		<!-- Secondary Colors -->
		<div class="mb-6">
			<h3 class="mb-3 text-sm font-medium text-muted-foreground">Secondary Colors</h3>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-secondary"></div>
					<p class="text-xs text-muted-foreground">Secondary</p>
					<p class="font-mono text-xs">Surface</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-secondary-foreground text-secondary-foreground"></div>
					<p class="text-xs text-muted-foreground">Secondary FG</p>
					<p class="font-mono text-xs">Text</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-muted"></div>
					<p class="text-xs text-muted-foreground">Muted</p>
					<p class="font-mono text-xs">Surface alt</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-muted-foreground text-muted-foreground"></div>
					<p class="text-xs text-muted-foreground">Muted FG</p>
					<p class="font-mono text-xs">Subtext</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-accent"></div>
					<p class="text-xs text-muted-foreground">Accent</p>
					<p class="font-mono text-xs">Mantle</p>
				</div>
			</div>
		</div>

		<!-- Status Colors -->
		<div class="mb-6">
			<h3 class="mb-3 text-sm font-medium text-muted-foreground">Status Colors</h3>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-destructive"></div>
					<p class="text-xs text-muted-foreground">Destructive</p>
					<p class="font-mono text-xs">Red</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-destructive/90"></div>
					<p class="text-xs text-muted-foreground">Destructive 90%</p>
					<p class="font-mono text-xs">opacity-90</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-destructive-foreground text-destructive-foreground"></div>
					<p class="text-xs text-muted-foreground">Destructive FG</p>
					<p class="font-mono text-xs">Base / Crust</p>
				</div>
				<div class="space-y-2">
					<div class="bg-success h-12 rounded-md"></div>
					<p class="text-xs text-muted-foreground">Success</p>
					<p class="font-mono text-xs">Green</p>
				</div>
				<div class="space-y-2">
					<div class="bg-warning h-12 rounded-md"></div>
					<p class="text-xs text-muted-foreground">Warning</p>
					<p class="font-mono text-xs">Peach</p>
				</div>
			</div>
		</div>

		<!-- Background & Border -->
		<div class="mb-6">
			<h3 class="mb-3 text-sm font-medium text-muted-foreground">Background & Border</h3>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
				<div class="space-y-2">
					<div class="h-12 rounded-md border bg-background"></div>
					<p class="text-xs text-muted-foreground">Background</p>
					<p class="font-mono text-xs">Crust / Base</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md border-2 border-input"></div>
					<p class="text-xs text-muted-foreground">Input</p>
					<p class="font-mono text-xs">Surface</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md border ring ring-ring"></div>
					<p class="text-xs text-muted-foreground">Ring</p>
					<p class="font-mono text-xs">Mauve</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md border border-border"></div>
					<p class="text-xs text-muted-foreground">Border</p>
					<p class="font-mono text-xs">Surface</p>
				</div>
				<div class="space-y-2">
					<div class="h-12 rounded-md bg-card"></div>
					<p class="text-xs text-muted-foreground">Card</p>
					<p class="font-mono text-xs">White / Base</p>
				</div>
			</div>
		</div>

		<!-- Text Colors -->
		<div class="mb-6">
			<h3 class="mb-3 text-sm font-medium text-muted-foreground">Text Colors</h3>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
				<div class="space-y-2">
					<div
						class="flex h-12 items-center justify-center rounded-md text-primary-foreground"
						style="background-color: hsl(240 11% 42%)"
					>
						<span class="text-lg font-medium">Aa</span>
					</div>
					<p class="text-xs text-muted-foreground">Foreground</p>
					<p class="font-mono text-xs">Text</p>
				</div>
				<div class="space-y-2">
					<div
						class="flex h-12 items-center justify-center rounded-md text-primary-foreground"
						style="background-color: hsl(240 10% 84%)"
					>
						<span class="text-lg font-medium">Aa</span>
					</div>
					<p class="text-xs text-muted-foreground">Foreground Dark</p>
					<p class="font-mono text-xs">Text (dark)</p>
				</div>
				<div class="space-y-2">
					<div
						class="flex h-12 items-center justify-center rounded-md text-primary-foreground"
						style="background-color: hsl(240 9% 51%)"
					>
						<span class="text-lg font-medium">Aa</span>
					</div>
					<p class="text-xs text-muted-foreground">Muted FG</p>
					<p class="font-mono text-xs">Subtext</p>
				</div>
				<div class="space-y-2">
					<div
						class="flex h-12 items-center justify-center rounded-md text-primary-foreground"
						style="background-color: hsl(240 5% 64%)"
					>
						<span class="text-lg font-medium">Aa</span>
					</div>
					<p class="text-xs text-muted-foreground">Muted FG Dark</p>
					<p class="font-mono text-xs">Subtext (dark)</p>
				</div>
				<div class="space-y-2">
					<div
						class="flex h-12 items-center justify-center rounded-md text-foreground"
						style="background-color: hsl(0 0% 100%)"
					>
						<span class="text-lg font-medium">Aa</span>
					</div>
					<p class="text-xs text-muted-foreground">Card FG</p>
					<p class="font-mono text-xs">White</p>
				</div>
			</div>
		</div>

		<!-- Catppuccin Full Palette -->
		<div class="mb-6">
			<h3 class="mb-3 text-sm font-medium text-muted-foreground">Catppuccin Color Palette</h3>
			<div class="grid grid-cols-3 gap-3 md:grid-cols-7">
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #dc8a78"></div>
					<p class="text-xs text-muted-foreground">Rosewater</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #cc88cc"></div>
					<p class="text-xs text-muted-foreground">Flamingo</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #8839ee"></div>
					<p class="text-xs text-muted-foreground">Pink</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #8839ee"></div>
					<p class="text-xs text-muted-foreground">Mauve</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #d20f39"></div>
					<p class="text-xs text-muted-foreground">Red</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #e58f66"></div>
					<p class="text-xs text-muted-foreground">Maroon</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #fe8b71"></div>
					<p class="text-xs text-muted-foreground">Peach</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #f5e0dc"></div>
					<p class="text-xs text-muted-foreground">Yellow</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #40a02b"></div>
					<p class="text-xs text-muted-foreground">Green</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #1abc9c"></div>
					<p class="text-xs text-muted-foreground">Teal</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #04a5e5"></div>
					<p class="text-xs text-muted-foreground">Sky</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #1abc9c"></div>
					<p class="text-xs text-muted-foreground">Sapphire</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #1abc9c"></div>
					<p class="text-xs text-muted-foreground">Blue</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #7287fd"></div>
					<p class="text-xs text-muted-foreground">Lavender</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #4c4f69"></div>
					<p class="text-xs text-muted-foreground">Text</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #6c6f85"></div>
					<p class="text-xs text-muted-foreground">Subtext</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #eff1f5"></div>
					<p class="text-xs text-muted-foreground">Crust</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #ddded8"></div>
					<p class="text-xs text-muted-foreground">Mantle</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #e3e5e9"></div>
					<p class="text-xs text-muted-foreground">Surface</p>
				</div>
				<div class="space-y-2">
					<div class="h-8 rounded-md" style="background-color: #ccd0da"></div>
					<p class="text-xs text-muted-foreground">Border</p>
				</div>
			</div>
		</div>

		<!-- Theme Comparison -->
		<div class="mb-6">
			<h3 class="mb-3 text-sm font-medium text-muted-foreground">Theme Modes</h3>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2 rounded-lg border bg-[#eff1f5] p-4">
					<p class="text-sm font-medium">Light Mode (Frappé)</p>
					<p class="text-xs text-muted-foreground">Background: Crust (#eff1f5)</p>
					<p class="text-xs text-muted-foreground">Primary: Mauve (#8839ee)</p>
					<p class="text-xs text-muted-foreground">Text: #4c4f69</p>
				</div>
				<div class="space-y-2 rounded-lg border bg-[#1e1e2e] p-4">
					<p class="text-sm font-medium" style="color: #cdd6f4">Dark Mode (Mocha)</p>
					<p class="text-xs" style="color: #a6adc8">Background: Base (#1e1e2e)</p>
					<p class="text-xs" style="color: #cba6f7">Primary: Mauve (#cba6f7)</p>
					<p class="text-xs" style="color: #cdd6f4">Text: #cdd6f4</p>
				</div>
			</div>
		</div>

		<!-- Utility Colors -->
		<div>
			<h3 class="mb-3 text-sm font-medium text-muted-foreground">Utility Colors (Catppuccin)</h3>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-6">
				<div class="space-y-2">
					<div class="h-10 rounded-md" style="background-color: #dc8a78"></div>
					<p class="text-xs text-muted-foreground">Rosewater</p>
				</div>
				<div class="space-y-2">
					<div class="h-10 rounded-md" style="background-color: #d20f39"></div>
					<p class="text-xs text-muted-foreground">Red</p>
				</div>
				<div class="space-y-2">
					<div class="h-10 rounded-md" style="background-color: #fe8b71"></div>
					<p class="text-xs text-muted-foreground">Peach</p>
				</div>
				<div class="space-y-2">
					<div class="h-10 rounded-md" style="background-color: #f5e0dc"></div>
					<p class="text-xs text-muted-foreground">Yellow</p>
				</div>
				<div class="space-y-2">
					<div class="h-10 rounded-md" style="background-color: #40a02b"></div>
					<p class="text-xs text-muted-foreground">Green</p>
				</div>
				<div class="space-y-2">
					<div class="h-10 rounded-md" style="background-color: #8839ee"></div>
					<p class="text-xs text-muted-foreground">Mauve</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Theme Toggle + Font Settings -->
	<section class="space-y-2">
		<h2 class="text-xl font-semibold">Settings</h2>
		<p class="text-muted-foreground">
			Klik op het tandwiel voor font settings, klik op de zon/maan voor dark/light mode
		</p>
	</section>

	<!-- Button Variants -->
	<section class="space-y-2">
		<h2 class="text-xl font-semibold">Buttons</h2>
		<div class="flex flex-wrap gap-4">
			<Button onclick={() => toast({ title: 'Default clicked!', variant: 'default' })}>
				Default
			</Button>
			<Button
				variant="secondary"
				onclick={() => toast({ title: 'Secondary clicked!', variant: 'default' })}
			>
				Secondary
			</Button>
			<Button
				variant="destructive"
				onclick={() => toast({ title: 'Destructive clicked!', variant: 'destructive' })}
			>
				Destructive
			</Button>
			<Button
				variant="outline"
				onclick={() => toast({ title: 'Outline clicked!', variant: 'default' })}
			>
				Outline
			</Button>
			<Button
				variant="ghost"
				onclick={() => toast({ title: 'Ghost clicked!', variant: 'default' })}
			>
				Ghost
			</Button>
			<Button variant="link" onclick={() => toast({ title: 'Link clicked!', variant: 'default' })}>
				Link
			</Button>
		</div>

		<div class="flex flex-wrap gap-4 pt-2">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
			<Button size="icon">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M12 5v14M5 12h14" />
				</svg>
			</Button>
			<Button loading>Loading...</Button>
		</div>
	</section>

	<!-- Toast Variants -->
	<section class="space-y-2">
		<h2 class="text-xl font-semibold">Toast Notifications</h2>
		<div class="flex flex-wrap gap-4">
			<Button
				onclick={() =>
					toast({ title: 'Success!', description: 'Everything went well.', variant: 'success' })}
			>
				Success Toast
			</Button>
			<Button
				variant="destructive"
				onclick={() =>
					toast({ title: 'Error!', description: 'Something went wrong.', variant: 'destructive' })}
			>
				Error Toast
			</Button>
			<Button
				variant="secondary"
				onclick={() => toast({ title: 'Warning', description: 'Be careful.', variant: 'warning' })}
			>
				Warning Toast
			</Button>
			<Button
				variant="outline"
				onclick={() => toast({ title: 'Info', description: 'Some information.', variant: 'info' })}
			>
				Info Toast
			</Button>
		</div>
	</section>

	<!-- Cards -->
	<section class="space-y-2">
		<h2 class="text-xl font-semibold">Cards</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<Card class="w-full">
				<CardHeader>
					<CardTitle>Card Title</CardTitle>
					<CardDescription>This is a card description</CardDescription>
				</CardHeader>
				<CardContent>
					<p>Card content goes here. This is the main body of the card.</p>
				</CardContent>
				<CardFooter>
					<Button>Action</Button>
				</CardFooter>
			</Card>

			<Card class="w-full">
				<CardHeader>
					<CardTitle>Another Card</CardTitle>
				</CardHeader>
				<CardContent>
					<Input placeholder="Test input in a card..." />
				</CardContent>
				<CardFooter class="justify-end gap-2">
					<Button variant="outline">Cancel</Button>
					<Button>Save</Button>
				</CardFooter>
			</Card>
		</div>
	</section>

	<!-- Input -->
	<section class="space-y-2">
		<h2 class="text-xl font-semibold">Input</h2>
		<div class="max-w-md space-y-4">
			<Input placeholder="Default input..." />
			<Input placeholder="With value" value="Some text" />
			<Input error placeholder="Error input..." />
		</div>
	</section>

	<!-- Dialog -->
	<section class="space-y-2">
		<h2 class="text-xl font-semibold">Dialog / Modal</h2>
		<Dialog>
			{#snippet trigger()}
				<Button variant="outline">Open Dialog</Button>
			{/snippet}
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Dialog Title</DialogTitle>
					<DialogDescription>This is a dialog description.</DialogDescription>
				</DialogHeader>
				<div class="py-4">
					<p>This is the dialog content. You can put anything here.</p>
					<Input placeholder="Input in dialog..." class="mt-4" />
				</div>
				<div class="flex justify-end gap-2">
					<Button variant="outline">Cancel</Button>
					<Button>Confirm</Button>
				</div>
			</DialogContent>
		</Dialog>
	</section>

	<!-- Prompt Components -->
	<section class="space-y-4" id="prompts-section">
		<h2 class="text-xl font-semibold">Prompt Components</h2>

		<!-- Prompt List -->
		<div id="prompt-list-container">
			<h3 class="mb-2 text-lg font-medium">PromptList Component</h3>
			<PromptList prompts={samplePrompts} onPromptSelect={handlePromptSelect} />
		</div>

		<!-- Selected Prompt Display -->
		{#if selectedPrompt}
			<div class="rounded-lg bg-muted p-4">
				<p class="font-medium">Selected: {selectedPrompt.title}</p>
			</div>
		{/if}

		<!-- Individual Prompt Cards -->
		<div class="mt-6">
			<h3 class="mb-2 text-lg font-medium">Individual PromptCard Components</h3>
			<div class="grid gap-4 md:grid-cols-3">
				{#each samplePrompts as prompt (prompt.id)}
					<div class="prompt-card-wrapper" data-prompt-id={prompt.id}>
						<PromptCard {prompt} onclick={() => handlePromptSelect(prompt)} />
					</div>
				{/each}
			</div>
		</div>

		<!-- PromptMetadata Component -->
		<div class="mt-6" id="prompt-metadata-section">
			<h3 class="mb-2 text-lg font-medium">PromptMetadata Component</h3>
			<Card class="max-w-2xl">
				<CardHeader>
					<CardTitle>Create New Prompt</CardTitle>
					<CardDescription>Fill in the metadata for your new prompt</CardDescription>
				</CardHeader>
				<CardContent>
					<PromptMetadata />
				</CardContent>
				<CardFooter class="justify-end gap-2">
					<Button variant="outline">Cancel</Button>
					<Button>Save Prompt</Button>
				</CardFooter>
			</Card>
		</div>

		<!-- PromptEditor Component -->
		<div class="mt-6" id="prompt-editor-section">
			<h3 class="mb-2 text-lg font-medium">PromptEditor Component</h3>
			<Card class="w-full">
				<CardHeader>
					<CardTitle>SQL Query Generator</CardTitle>
					<CardDescription>Edit your prompt content below</CardDescription>
				</CardHeader>
				<CardContent>
					<div id="prompt-editor-container" class="min-h-[300px]">
						<PromptEditor
							id="prompt-editor"
							value="Create a SQL query to fetch all users who logged in the last 7 days, ordered by login timestamp descending. Include user_id, username, email, and last_login. Exclude users with the 'admin' role."
							language="sql"
							placeholder="Start typing your prompt..."
							onchange={(value) => console.log('Editor value:', value)}
						/>
					</div>
				</CardContent>
				<CardFooter class="justify-end gap-2">
					<Button variant="outline">Cancel</Button>
					<Button>Save Prompt</Button>
				</CardFooter>
			</Card>
		</div>

		<!-- VersionTimeline Component -->
		<div class="mt-6" id="version-timeline-section">
			<h3 class="mb-2 text-lg font-medium">VersionTimeline Component</h3>
			<div class="grid gap-4 md:grid-cols-2">
				<Card class="w-full">
					<CardHeader>
						<CardTitle>Version History</CardTitle>
						<CardDescription
							>Click on a version to select it. The current version is highlighted.</CardDescription
						>
					</CardHeader>
					<CardContent>
						<div id="version-timeline-container">
							<VersionTimeline
								versions={sampleVersions}
								selectedVersionId={selectedVersion?.id ?? null}
								{currentVersionId}
								onversionselect={handleVersionSelect}
							/>
						</div>
					</CardContent>
					<CardFooter class="justify-between">
						<div class="text-sm text-muted-foreground">
							{#if selectedVersion}
								Selected: <span class="font-mono">v{selectedVersion.version}</span>
							{:else}
								No version selected
							{/if}
						</div>
						<Button
							variant="outline"
							size="sm"
							onclick={() => {
								currentVersionId = currentVersionId === 3 ? null : 3;
							}}
						>
							Toggle Current Highlight
						</Button>
					</CardFooter>
				</Card>

				<Card class="w-full">
					<CardHeader>
						<CardTitle>Empty State</CardTitle>
						<CardDescription>When no versions exist</CardDescription>
					</CardHeader>
					<CardContent>
						<div id="version-timeline-empty">
							<VersionTimeline versions={[]} currentVersionId={null} />
						</div>
					</CardContent>
				</Card>
			</div>
		</div>

		<!-- VersionDiff Component -->
		<div class="mt-6" id="version-diff-section">
			<h3 class="mb-2 text-lg font-medium">VersionDiff Component</h3>
			<Card class="w-full">
				<CardHeader>
					<CardTitle>Side-by-Side Version Comparison</CardTitle>
					<CardDescription
						>Comparing v1.0.0 with v1.1.0 showing content and metadata differences</CardDescription
					>
				</CardHeader>
				<CardContent>
					<VersionDiff
						oldContent="This is the original prompt content.
It has multiple lines of text.
This is line 3 of the content.
And line 4 follows here.
Finally, line 5 completes the content."
						newContent="This is the updated prompt content.
It has multiple lines of text.
Modified line 3 with new information.
And line 4 follows here.
New line 5 was added here.
Finally, line 6 completes the new content."
						oldVersion="v1.0.0"
						newVersion="v1.1.0"
						oldTitle="Original Prompt Title"
						newTitle="Updated Prompt Title"
						oldDescription="This is the original description"
						newDescription="This is the updated description with more details"
						oldTags={['sql', 'database']}
						newTags={['sql', 'database', 'query']}
						oldPlatform="OpenAI"
						newPlatform="Anthropic"
						oldPurpose="development"
						newPurpose="coding"
					/>
				</CardContent>
			</Card>
		</div>

		<!-- ImprovementPanel Component -->
		<div class="mt-6" id="improvement-panel-section">
			<h3 class="mb-2 text-lg font-medium">ImprovementPanel Component</h3>
			<Card class="w-full">
				<CardHeader>
					<CardTitle>AI Prompt Improvement</CardTitle>
					<CardDescription>Click "Improve with AI" to trigger the improvement flow</CardDescription>
				</CardHeader>
				<CardContent>
					<div id="improvement-panel-container">
						<ImprovementPanel promptId={1} currentVersionId={3} />
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- JudgeResults Component -->
		<div class="mt-6" id="judge-results-section">
			<h3 class="mb-2 text-lg font-medium">JudgeResults Component</h3>
			<Card class="w-full">
				<CardHeader>
					<CardTitle>Judge Evaluation Results</CardTitle>
					<CardDescription
						>Display of AI evaluation scores, gaps, recommendations, and historical data</CardDescription
					>
				</CardHeader>
				<CardContent>
					<div id="judge-results-container">
						<JudgeResults evaluation={sampleEvaluation} historicalScores={sampleHistoricalScores} />
					</div>
				</CardContent>
			</Card>

			<!-- JudgeResults without historical data -->
			<Card class="mt-4 w-full">
				<CardHeader>
					<CardTitle>JudgeResults (No Historical Data)</CardTitle>
					<CardDescription>When no historical scores are available</CardDescription>
				</CardHeader>
				<CardContent>
					<div id="judge-results-no-history">
						<JudgeResults evaluation={sampleEvaluationNoHistory} />
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- VariantComparison Component -->
		<div class="mt-6" id="variant-comparison-section">
			<h3 class="mb-2 text-lg font-medium">VariantComparison Component</h3>
			<Card class="w-full">
				<CardHeader>
					<CardTitle>AI-Generated Prompt Variants</CardTitle>
					<CardDescription
						>Compare AI-generated variants, view scores, and select the best one</CardDescription
					>
				</CardHeader>
				<CardContent>
					<div id="variant-comparison-container">
						<VariantComparison
							parentVersion={sampleParentVersion}
							variants={sampleVariants}
							onselect={handleVariantSelect}
							onrejectall={handleRejectAll}
						/>
					</div>
				</CardContent>
			</Card>

			<!-- Selected Variant Display -->
			{#if selectedVariant}
				<div class="mt-4 rounded-lg bg-muted p-4">
					<p class="font-medium">Selected Variant:</p>
					<p class="mt-1 font-mono text-sm">{selectedVariant.id} - v{selectedVariant.version}</p>
					<p class="mt-1 text-sm text-muted-foreground">{selectedVariant.changeNotes}</p>
				</div>
			{/if}

			<!-- Rejected Count Display -->
			{#if rejectedCount > 0}
				<div class="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
					<p class="font-medium text-destructive">Variants Rejected: {rejectedCount}</p>
				</div>
			{/if}

			<!-- Empty State Test -->
			<Card class="mt-4 w-full">
				<CardHeader>
					<CardTitle>VariantComparison (Empty State)</CardTitle>
					<CardDescription>When no variants are available</CardDescription>
				</CardHeader>
				<CardContent>
					<div id="variant-comparison-empty">
						<VariantComparison parentVersion={sampleParentVersion} variants={[]} />
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- GenealogyTree Component -->
		<div class="mt-6" id="genealogy-tree-section">
			<h3 class="mb-2 text-lg font-medium">GenealogyTree Component</h3>
			<Card class="w-full">
				<CardHeader>
					<CardTitle>Version Genealogy Tree</CardTitle>
					<CardDescription
						>Visual tree showing version evolution with parent-child relationships</CardDescription
					>
				</CardHeader>
				<CardContent>
					<div id="genealogy-tree-container">
						<GenealogyTree
							versions={sampleVersions}
							selectedVersionId={selectedVersion?.id ?? null}
							onversionselect={handleVersionSelect}
						/>
					</div>
				</CardContent>
				<CardFooter class="justify-between">
					<div class="text-sm text-muted-foreground">
						{#if selectedVersion}
							Selected: <span class="font-mono">v{selectedVersion.version}</span>
						{:else}
							No version selected
						{/if}
					</div>
					<Button
						variant="outline"
						size="sm"
						onclick={() => {
							selectedVersion = selectedVersion ? null : sampleVersions[0];
						}}
					>
						Toggle Selection
					</Button>
				</CardFooter>
			</Card>

			<!-- Empty State Test -->
			<Card class="mt-4 w-full">
				<CardHeader>
					<CardTitle>GenealogyTree (Empty State)</CardTitle>
					<CardDescription>When no versions exist</CardDescription>
				</CardHeader>
				<CardContent>
					<div id="genealogy-tree-empty-container">
						<GenealogyTree versions={[]} />
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- PerformanceChart Component -->
		<div class="mt-6" id="performance-chart-section">
			<h3 class="mb-2 text-lg font-medium">PerformanceChart Component</h3>
			<Card class="w-full">
				<CardHeader>
					<CardTitle>Performance Metrics Visualization</CardTitle>
					<CardDescription
						>Line chart for quality scores and bar chart for usage counts</CardDescription
					>
				</CardHeader>
				<CardContent>
					<div id="performance-chart-container">
						<PerformanceChart qualityScores={sampleQualityScores} usageData={sampleUsageData} />
					</div>
				</CardContent>
			</Card>

			<!-- Empty State Test -->
			<Card class="mt-4 w-full">
				<CardHeader>
					<CardTitle>PerformanceChart (Empty State)</CardTitle>
					<CardDescription>When no performance data exists</CardDescription>
				</CardHeader>
				<CardContent>
					<div id="performance-chart-empty-container">
						<PerformanceChart qualityScores={[]} usageData={[]} />
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- MetricsDashboard Component -->
		<div class="mt-6" id="metrics-dashboard-section">
			<h3 class="mb-2 text-lg font-medium">MetricsDashboard Component</h3>
			<div id="metrics-dashboard-container">
				<MetricsDashboard
					totalPrompts={24}
					totalVersions={156}
					avgQualityScore={75}
					improvementsThisWeek={8}
					activePrompts={20}
					lastActivity={new Date().toISOString()}
					qualityTrend="up"
					usageTrend="up"
				/>
			</div>

			<!-- Empty State Test -->
			<Card class="mt-4 w-full">
				<CardHeader>
					<CardTitle>MetricsDashboard (Empty State)</CardTitle>
					<CardDescription>When no metrics exist</CardDescription>
				</CardHeader>
				<CardContent>
					<div id="metrics-dashboard-empty-container">
						<MetricsDashboard
							totalPrompts={0}
							totalVersions={0}
							avgQualityScore={0}
							improvementsThisWeek={0}
							activePrompts={0}
							lastActivity="Never"
						/>
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- Prompt Library Page Test -->
		<div class="mt-6" id="prompt-library-section">
			<h3 class="mb-2 text-lg font-medium">Prompt Library Page Components</h3>
			<p class="mb-4 text-muted-foreground">Components used in the /prompts page layout</p>

			<!-- Page Header Test -->
			<Card class="mb-4 w-full">
				<CardHeader>
					<CardTitle>Page Header</CardTitle>
					<CardDescription>Header with title, description, and New Prompt button</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						<div>
							<h1 class="text-3xl font-bold tracking-tight">Prompt Library</h1>
							<p class="mt-1 text-muted-foreground">Browse and manage your collection of prompts</p>
						</div>
						<div class="flex gap-2">
							<Button href="/prompts/new">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="mr-2"
								>
									<path d="M12 5v14M5 12h14" />
								</svg>
								New Prompt
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Prompt Count Display Test -->
			<Card class="mb-4 w-full">
				<CardHeader>
					<CardTitle>Prompt Count Display</CardTitle>
					<CardDescription>Shows the number of prompts in the library</CardDescription>
				</CardHeader>
				<CardContent>
					<div
						class="flex items-center gap-2 text-sm text-muted-foreground"
						id="prompt-count-display"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
							<polyline points="14 2 14 8 20 8" />
						</svg>
						<span id="prompt-count-value">{samplePrompts.length} prompts in your library</span>
					</div>
				</CardContent>
			</Card>

			<!-- Sidebar Layout Test -->
			<Card class="mb-4 w-full">
				<CardHeader>
					<CardTitle>Sidebar Layout</CardTitle>
					<CardDescription>Sidebar with search, filters, sort, and quick actions</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="grid gap-4 lg:grid-cols-4">
						<aside class="space-y-4 lg:col-span-1">
							<div class="rounded-lg border bg-card p-4" id="search-sidebar-section">
								<h3 class="mb-2 flex items-center gap-2 font-semibold">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
									</svg>
									Search
								</h3>
							</div>
							<div class="rounded-lg border bg-card p-4" id="filter-sidebar-section">
								<h3 class="mb-2 flex items-center gap-2 font-semibold">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
									</svg>
									Filters
								</h3>
							</div>
							<div class="rounded-lg border bg-card p-4" id="sort-sidebar-section">
								<h3 class="mb-2 flex items-center gap-2 font-semibold">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
									</svg>
									Sort
								</h3>
							</div>
							<div class="rounded-lg border bg-card p-4" id="quick-actions-sidebar-section">
								<h3 class="mb-2 flex items-center gap-2 font-semibold">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="12" cy="12" r="3" /><path
											d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
										/>
									</svg>
									Quick Actions
								</h3>
								<div class="space-y-2">
									<Button
										variant="outline"
										size="sm"
										class="w-full justify-start"
										href="/prompts/new"
									>
										Create New Prompt
									</Button>
									<Button variant="outline" size="sm" class="w-full justify-start" href="/">
										Back to Home
									</Button>
								</div>
							</div>
						</aside>
						<main class="lg:col-span-3">
							<div id="prompt-list-container">
								<PromptList prompts={samplePrompts} onPromptSelect={handlePromptSelect} />
							</div>
						</main>
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- New Prompt Page Test -->
		<div class="mt-6" id="new-prompt-page-section">
			<h3 class="mb-2 text-lg font-medium">New Prompt Page Components</h3>
			<p class="mb-4 text-muted-foreground">Components used in the /prompts/new page layout</p>

			<!-- Page Header Test -->
			<Card class="mb-4 w-full">
				<CardHeader>
					<CardTitle>New Prompt Page Header</CardTitle>
					<CardDescription>Header with title, description, Save and Cancel buttons</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4" id="new-prompt-header">
						<div>
							<h1 class="text-3xl font-bold tracking-tight">Create New Prompt</h1>
							<p class="mt-1 text-muted-foreground">Add a new prompt to your collection</p>
						</div>
						<div class="flex gap-2">
							<Button variant="outline" id="cancel-button">Cancel</Button>
							<Button id="save-button">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="mr-2"
								>
									<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
									<polyline points="17 21 17 13 7 13 7 21" />
									<polyline points="7 3 7 8 15 8" />
								</svg>
								Save Prompt
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Prompt Content Editor Test -->
			<Card class="mb-4 w-full">
				<CardHeader>
					<CardTitle>Prompt Content Editor</CardTitle>
					<CardDescription>Monaco editor for entering prompt content</CardDescription>
				</CardHeader>
				<CardContent>
					<div id="prompt-content-editor">
						<PromptEditor
							id="new-prompt-editor"
							value=""
							placeholder="Enter your prompt here..."
							onchange={(value) => console.log('Content:', value)}
						/>
					</div>
				</CardContent>
			</Card>

			<!-- Prompt Metadata Form Test -->
			<Card class="mb-4 w-full">
				<CardHeader>
					<CardTitle>Prompt Metadata Form</CardTitle>
					<CardDescription
						>Form fields for title, description, purpose, platform, and tags</CardDescription
					>
				</CardHeader>
				<CardContent>
					<div id="prompt-metadata-form">
						<PromptMetadata />
					</div>
				</CardContent>
				<CardFooter class="justify-end gap-2">
					<Button variant="outline" id="form-cancel-button">Cancel</Button>
					<Button id="form-save-button">Save Prompt</Button>
				</CardFooter>
			</Card>

			<!-- Tips Card Test -->
			<Card class="mb-4 w-full">
				<CardHeader>
					<CardTitle>Tips Section</CardTitle>
					<CardDescription>Helpful tips for creating prompts</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="rounded-lg border bg-muted/50 p-4" id="tips-section">
						<h3 class="mb-3 flex items-center gap-2 font-semibold">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
								<path d="M12 17h.01" />
							</svg>
							Tips
						</h3>
						<ul class="space-y-2 text-sm text-muted-foreground" id="tips-list">
							<li class="flex items-start gap-2">
								<span class="text-primary">•</span>
								Use descriptive titles to make prompts easy to find
							</li>
							<li class="flex items-start gap-2">
								<span class="text-primary">•</span>
								Add tags to categorize and filter prompts
							</li>
							<li class="flex items-start gap-2">
								<span class="text-primary">•</span>
								Template placeholders like {'{{TASK}}'} allow dynamic content
							</li>
							<li class="flex items-start gap-2">
								<span class="text-primary">•</span>
								Saving will create version 1.0 of your prompt
							</li>
						</ul>
					</div>
				</CardContent>
			</Card>

			<!-- Keyboard Shortcuts Test -->
			<Card class="mb-4 w-full">
				<CardHeader>
					<CardTitle>Keyboard Shortcuts</CardTitle>
					<CardDescription>Keyboard shortcuts for form actions</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="rounded-lg border bg-muted/50 p-4" id="keyboard-shortcuts-section">
						<h3 class="mb-3 flex items-center gap-2 font-semibold">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
								<path d="M6 8h.01" />
								<path d="M10 8h.01" />
								<path d="M14 8h.01" />
								<path d="M18 8h.01" />
								<path d="M8 12h8" />
								<path d="M6 16h.01" />
								<path d="M10 16h.01" />
								<path d="M14 16h.01" />
								<path d="M18 16h.01" />
							</svg>
							Keyboard Shortcuts
						</h3>
						<div class="space-y-2 text-sm" id="shortcuts-list">
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground">Save</span>
								<kbd
									class="pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none"
								>
									<span class="text-xs">⌘</span>S
								</kbd>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground">Cancel</span>
								<kbd
									class="pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none"
								>
									Esc
								</kbd>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Page Layout Test -->
			<Card class="mb-4 w-full">
				<CardHeader>
					<CardTitle>Page Layout</CardTitle>
					<CardDescription>Grid layout with main content and sidebar</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="grid gap-6 lg:grid-cols-3" id="new-prompt-layout">
						<div class="lg:col-span-2" id="new-prompt-main-content">
							<div class="rounded-lg border bg-card">
								<div class="flex flex-col space-y-1.5 p-6">
									<h2 class="text-lg leading-none font-semibold tracking-tight">Prompt Content</h2>
									<p class="text-sm text-muted-foreground">
										Enter the actual prompt text. You can use template placeholders for dynamic
										content.
									</p>
								</div>
							</div>
						</div>
						<aside class="space-y-6" id="new-prompt-sidebar">
							<div class="rounded-lg border bg-card">
								<div class="flex flex-col space-y-1.5 p-6">
									<h2 class="text-lg leading-none font-semibold tracking-tight">Prompt Details</h2>
									<p class="text-sm text-muted-foreground">
										Provide metadata to help organize and find this prompt later.
									</p>
								</div>
							</div>
						</aside>
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- Edit Prompt Page Test -->
		<div class="mt-6" id="edit-prompt-page-section">
			<h3 class="mb-2 text-lg font-medium">Edit Prompt Page Components</h3>
			<p class="mb-4 text-muted-foreground">
				Components used in the /prompts/[id]/edit page layout
			</p>

			<!-- Breadcrumb Test -->
			<Card class="mb-4 w-full">
				<CardHeader>
					<CardTitle>Edit Prompt Breadcrumb</CardTitle>
					<CardDescription>Navigation breadcrumb showing path to edit page</CardDescription>
				</CardHeader>
				<CardContent>
					<nav
						class="mb-2 flex items-center gap-1 text-sm text-muted-foreground"
						id="edit-prompt-breadcrumb"
						aria-label="Breadcrumb"
					>
						<a href="/prompts" class="transition-colors hover:text-foreground">Prompts</a>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="m9 18 6-6-6-6" />
						</svg>
						<a href="/prompts/1" class="transition-colors hover:text-foreground"
							>SQL Query Generator</a
						>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="m9 18 6-6-6-6" />
						</svg>
						<span class="font-medium text-foreground">Edit</span>
					</nav>
				</CardContent>
			</Card>

			<!-- Page Header Test -->
			<Card class="mb-4 w-full">
				<CardHeader>
					<CardTitle>Edit Prompt Page Header</CardTitle>
					<CardDescription>Header with title, description, Save and Cancel buttons</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4" id="edit-prompt-header">
						<div>
							<h1 class="text-3xl font-bold tracking-tight">Edit Prompt</h1>
							<p class="mt-1 text-muted-foreground">
								Update prompt content and metadata. Changes will be saved as a new version.
							</p>
						</div>
						<div class="flex gap-2">
							<Button variant="outline" id="cancel-button">Cancel</Button>
							<Button id="save-changes-button">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="mr-2"
								>
									<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
									<polyline points="17 21 17 13 7 13 7 21" />
									<polyline points="7 3 7 8 15 8" />
								</svg>
								Save Changes
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Page Layout Test -->
			<Card class="mb-4 w-full">
				<CardHeader>
					<CardTitle>Page Layout</CardTitle>
					<CardDescription>Grid layout with main content and sidebar</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="grid gap-6 lg:grid-cols-3" id="edit-prompt-layout">
						<div class="lg:col-span-2" id="edit-prompt-main-content">
							<!-- Prompt Content Editor Test -->
							<div class="mb-6 rounded-lg border bg-card">
								<div class="flex flex-col space-y-1.5 p-6" id="edit-prompt-content-editor">
									<h2 class="text-lg leading-none font-semibold tracking-tight">Prompt Content</h2>
									<p class="text-sm text-muted-foreground">
										Update the actual prompt text. Use template placeholders for dynamic content.
									</p>
								</div>
								<div class="p-6 pt-0">
									<PromptEditor
										id="edit-prompt-editor"
										value="You are a SQL expert. Create optimized queries for user requirements."
										language="sql"
										placeholder="Enter your prompt here..."
										onchange={(value) => console.log('Content:', value)}
									/>
								</div>
							</div>

							<!-- Version Information Test -->
							<div class="rounded-lg border bg-card" id="version-info-section">
								<div class="flex flex-col space-y-1.5 p-6">
									<h2 class="text-lg leading-none font-semibold tracking-tight">
										Version Information
									</h2>
									<p class="text-sm text-muted-foreground">
										Describe what changed in this version.
									</p>
								</div>
								<div class="space-y-4 p-6 pt-0">
									<!-- Change Type Selector -->
									<div class="space-y-2">
										<label class="text-sm font-medium" for="change-type">Change Type</label>
										<div class="grid grid-cols-3 gap-2" id="change-type-selector">
											<button
												type="button"
												class="rounded-md border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
												>Patch</button
											>
											<button type="button" class="rounded-md border px-4 py-2 text-sm font-medium"
												>Minor</button
											>
											<button type="button" class="rounded-md border px-4 py-2 text-sm font-medium"
												>Major</button
											>
										</div>
									</div>

									<!-- Change Notes -->
									<div class="space-y-2">
										<label class="text-sm font-medium" for="change-notes" id="change-notes-label"
											>Change Notes *</label
										>
										<textarea
											id="change-notes-textarea"
											class="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
											placeholder="Describe what you changed and why..."
										></textarea>
									</div>
								</div>
							</div>
						</div>
						<aside class="space-y-6" id="edit-prompt-sidebar">
							<!-- Prompt Metadata Form Test -->
							<div class="rounded-lg border bg-card">
								<div class="flex flex-col space-y-1.5 p-6">
									<h2 class="text-lg leading-none font-semibold tracking-tight">Prompt Details</h2>
									<p class="text-sm text-muted-foreground">
										Update metadata to help organize and find this prompt.
									</p>
								</div>
								<div class="p-6 pt-0" id="edit-prompt-metadata-form">
									<PromptMetadata />
								</div>
							</div>

							<!-- Current Version Info Test -->
							<div class="rounded-lg border bg-muted/50 p-4" id="current-version-section">
								<h3 class="mb-3 flex items-center gap-2 font-semibold">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M12 20h9" />
										<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
									</svg>
									Current Version
								</h3>
								<div class="space-y-2 text-sm">
									<div class="flex justify-between">
										<span class="text-muted-foreground">Version</span>
										<span class="font-medium">v1.2.0</span>
									</div>
									<div class="flex justify-between">
										<span class="text-muted-foreground">Type</span>
										<span class="font-medium capitalize">minor</span>
									</div>
									<div class="border-t pt-2">
										<span class="mb-1 block text-muted-foreground">Notes</span>
										<p class="text-muted-foreground">
											Added new functionality for advanced queries
										</p>
									</div>
								</div>
							</div>

							<!-- Keyboard Shortcuts Test -->
							<div class="rounded-lg border bg-muted/50 p-4" id="edit-keyboard-shortcuts-section">
								<h3 class="mb-3 flex items-center gap-2 font-semibold">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
										<path d="M6 8h.01" />
										<path d="M10 8h.01" />
										<path d="M14 8h.01" />
										<path d="M18 8h.01" />
										<path d="M8 12h8" />
										<path d="M6 16h.01" />
										<path d="M10 16h.01" />
										<path d="M14 16h.01" />
										<path d="M18 16h.01" />
									</svg>
									Keyboard Shortcuts
								</h3>
								<div class="space-y-2 text-sm" id="edit-shortcuts-list">
									<div class="flex items-center justify-between">
										<span class="text-muted-foreground">Save</span>
										<kbd
											class="pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none"
										>
											<span class="text-xs">⌘</span>S
										</kbd>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-muted-foreground">Cancel</span>
										<kbd
											class="pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none"
											>Esc</kbd
										>
									</div>
								</div>
							</div>
						</aside>
					</div>
				</CardContent>
			</Card>

			<!-- Form Actions Test -->
			<Card class="mb-4 w-full">
				<CardHeader>
					<CardTitle>Form Actions</CardTitle>
					<CardDescription>Save Changes and Cancel buttons in header</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex gap-2">
						<Button variant="outline" id="form-cancel-button">Cancel</Button>
						<Button id="form-save-changes-button">Save Changes</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	</section>
</div>
