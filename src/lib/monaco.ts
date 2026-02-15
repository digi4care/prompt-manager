// Monaco editor module - browser only!
// This file cannot be imported during SSR as Monaco uses UMD format

let monacoInstance: any = null;

export async function getMonaco() {
	if (typeof window === 'undefined') {
		throw new Error('Monaco can only be used in browser environment');
	}

	if (!monacoInstance) {
		monacoInstance = await import('monaco-editor');

		// Configure workers
		const editorWorker = await import('monaco-editor/esm/vs/editor/editor.worker?worker');
		const jsonWorker = await import('monaco-editor/esm/vs/language/json/json.worker?worker');
		const cssWorker = await import('monaco-editor/esm/vs/language/css/css.worker?worker');
		const htmlWorker = await import('monaco-editor/esm/vs/language/html/html.worker?worker');
		const tsWorker = await import('monaco-editor/esm/vs/language/typescript/ts.worker?worker');

		self.MonacoEnvironment = {
			getWorker(_, label) {
				if (label === 'json') {
					return new jsonWorker.default();
				}
				if (label === 'css' || label === 'scss' || label === 'less') {
					return new cssWorker.default();
				}
				if (label === 'html' || label === 'handlebars' || label === 'razor') {
					return new htmlWorker.default();
				}
				if (label === 'typescript' || label === 'javascript') {
					return new tsWorker.default();
				}
				return new editorWorker.default();
			}
		};
	}

	return monacoInstance;
}

export default null; // Default export for SSR compatibility
