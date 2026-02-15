import { browser } from '$app/environment';
import { getDateFormat, clearDateFormatCache, setDateFormat } from '$lib/utils/date';

// Reactive store for date format setting
class DateFormatStore {
	private _format = $state('M j, Y');
	private _loaded = $state(false);

	constructor() {
		if (browser) {
			this.load();
		}
	}

	get format(): string {
		return this._format;
	}

	get loaded(): boolean {
		return this._loaded;
	}

	async load(): Promise<void> {
		if (!browser) return;

		try {
			const format = await getDateFormat();
			this._format = format;
			this._loaded = true;
		} catch {
			this._loaded = true;
		}
	}

	async refresh(): Promise<void> {
		clearDateFormatCache();
		await this.load();
	}
}

// Singleton instance
export const dateFormatStore = new DateFormatStore();
