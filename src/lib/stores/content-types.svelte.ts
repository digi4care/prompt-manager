import { browser } from '$app/environment';

// Admin content types (purposes and LLM providers)
class ContentTypesStore {
	private _purposes = $state<string[]>([]);
	private _llmProviders = $state<string[]>([]);
	private _loaded = $state(false);

	constructor() {
		if (browser) {
			this.load();
		}
	}

	get purposes(): string[] {
		return this._purposes;
	}

	get llmProviders(): string[] {
		return this._llmProviders;
	}

	get loaded(): boolean {
		return this._loaded;
	}

	async load(): Promise<void> {
		if (!browser) return;

		try {
			const response = await fetch('/api/admin/settings');
			if (!response.ok) throw new Error('Failed to load settings');

			const data = await response.json();
			const displaySettings = data.data.display || {};

			// Parse purposes and llm_providers from settings
			this._purposes = this.parseList(displaySettings.purposes || 'development,writing,analysis,creative,general');
			this._llmProviders = this.parseList(displaySettings.llm_providers || 'anthropic,openai,openrouter,minimax,deepseek,gemini');
			this._loaded = true;
		} catch (err) {
			console.error('Failed to load content types:', err);
			// Use defaults if loading fails
			this._purposes = ['development', 'writing', 'analysis', 'creative', 'general'];
			this._llmProviders = ['anthropic', 'openai', 'openrouter', 'minimax', 'deepseek', 'gemini'];
			this._loaded = true;
		}
	}

	async refresh(): Promise<void> {
		this._loaded = false;
		await this.load();
	}

	private parseList(value: string): string[] {
		return value.split(',').map((s: string) => s.trim()).filter(Boolean);
	}
}

// Singleton instance
export const contentTypesStore = new ContentTypesStore();
