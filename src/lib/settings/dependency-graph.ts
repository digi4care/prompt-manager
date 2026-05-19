import type { DependencyNode, ImpactAnalysis } from './types';

/**
 * Circular dependency error
 */
export class CircularDependencyError extends Error {
	constructor(public cycles: string[][]) {
		super(`Circular dependencies detected: ${cycles.map(c => c.join(' -> ')).join('; ')}`);
		this.name = 'CircularDependencyError';
	}
}

/**
 * DependencyGraph manages setting relationships as a DAG.
 *
 * Features:
 * - Tracks dependencies between settings
 * - Topological sort for update ordering
 * - Cycle detection
 * - Impact analysis
 */
export class DependencyGraph {
	private nodes = new Map<string, DependencyNode>();
	private edges = new Map<string, Set<string>>();

	/**
	 * Add a node to the graph if it doesn't exist
	 */
	private ensureNode(key: string): DependencyNode {
		if (!this.nodes.has(key)) {
			this.nodes.set(key, {
				key,
				dependencies: new Set(),
				dependents: new Set()
			});
			this.edges.set(key, new Set());
		}
		return this.nodes.get(key)!;
	}

	/**
	 * Add a dependency relationship: key depends on dependency
	 */
	addDependency(key: string, dependency: string): void {
		if (key === dependency) {
			throw new Error(`Setting '${key}' cannot depend on itself`);
		}

		this.ensureNode(key);
		this.ensureNode(dependency);

		const node = this.nodes.get(key)!;
		const depNode = this.nodes.get(dependency)!;

		node.dependencies.add(dependency);
		depNode.dependents.add(key);

		this.edges.get(key)!.add(dependency);
	}

	/**
	 * Add multiple dependencies for a key
	 */
	addDependencies(key: string, dependencies: string[]): void {
		for (const dep of dependencies) {
			this.addDependency(key, dep);
		}
	}

	/**
	 * Remove a dependency relationship
	 */
	removeDependency(key: string, dependency: string): void {
		const node = this.nodes.get(key);
		const depNode = this.nodes.get(dependency);

		if (node) {
			node.dependencies.delete(dependency);
		}
		if (depNode) {
			depNode.dependents.delete(key);
		}

		this.edges.get(key)?.delete(dependency);
	}

	/**
	 * Get direct dependencies of a setting
	 */
	getDependencies(key: string): string[] {
		return Array.from(this.nodes.get(key)?.dependencies ?? []);
	}

	/**
	 * Get direct dependents (what depends on this setting)
	 */
	getDependents(key: string): string[] {
		return Array.from(this.nodes.get(key)?.dependents ?? []);
	}

	/**
	 * Get all dependencies recursively (transitive closure)
	 */
	getAllDependencies(key: string): string[] {
		const visited = new Set<string>();
		const result: string[] = [];

		const visit = (k: string) => {
			if (visited.has(k)) return;
			visited.add(k);

			const deps = this.getDependencies(k);
			for (const dep of deps) {
				visit(dep);
				result.push(dep);
			}
		};

		visit(key);
		return [...new Set(result)];
	}

	/**
	 * Get all dependents recursively (transitive closure)
	 */
	getAllDependents(key: string): string[] {
		const visited = new Set<string>();
		const result: string[] = [];

		const visit = (k: string) => {
			if (visited.has(k)) return;
			visited.add(k);

			const deps = this.getDependents(k);
			for (const dep of deps) {
				visit(dep);
				result.push(dep);
			}
		};

		visit(key);
		return [...new Set(result)];
	}

	/**
	 * Perform topological sort on the graph
	 * Returns keys in order such that dependencies come before dependents
	 */
	topologicalSort(): string[] {
		const visited = new Set<string>();
		const temp = new Set<string>();
		const result: string[] = [];

		const visit = (key: string): void => {
			if (temp.has(key)) {
				throw new CircularDependencyError([[...temp, key]]);
			}
			if (visited.has(key)) return;

			temp.add(key);

			const deps = this.getDependencies(key);
			for (const dep of deps) {
				visit(dep);
			}

			temp.delete(key);
			visited.add(key);
			result.push(key);
		};

		for (const key of this.nodes.keys()) {
			if (!visited.has(key)) {
				visit(key);
			}
		}

		return result;
	}

	/**
	 * Detect all circular dependencies in the graph
	 * Returns array of cycles, where each cycle is an array of keys
	 */
	detectCycles(): string[][] {
		const cycles: string[][] = [];
		const visited = new Set<string>();

		const findCycle = (start: string): string[] | null => {
			const path: string[] = [];
			const pathSet = new Set<string>();
			let cycleStartKey: string | null = null;

			const dfs = (key: string): boolean => {
				if (pathSet.has(key)) {
					cycleStartKey = key;
					return true;
				}

				if (visited.has(key)) return false;

				path.push(key);
				pathSet.add(key);

				for (const dep of this.getDependencies(key)) {
					if (dfs(dep)) {
						return true;
					}
				}

				path.pop();
				pathSet.delete(key);
				return false;
			};

			if (dfs(start) && cycleStartKey !== null) {
				const cycleStart = path.indexOf(cycleStartKey);
				return path.slice(cycleStart);
			}

			return null;
		};

		for (const key of this.nodes.keys()) {
			if (!visited.has(key)) {
				const cycle = findCycle(key);
				if (cycle) {
					cycles.push(cycle);
					for (const k of cycle) {
						visited.add(k);
					}
				}
				visited.add(key);
			}
		}

		return cycles;
	}

	/**
	 * Check if the graph has any circular dependencies
	 */
	hasCycles(): boolean {
		return this.detectCycles().length > 0;
	}

	/**
	 * Get impact analysis for a setting change
	 */
	getImpactAnalysis(key: string): ImpactAnalysis {
		const directlyAffected = this.getDependents(key);
		const transitivelyAffected = this.getAllDependents(key).filter(
			k => !directlyAffected.includes(k)
		);

		// Find blocks that need revalidation (settings in affected blocks)
		const blocksToRevalidate: string[] = [];

		// Settings whose visibility might change (depend on this key)
		const visibilityChanges = this.getAllDependents(key);

		return {
			directlyAffected,
			transitivelyAffected,
			blocksToRevalidate: [...new Set(blocksToRevalidate)],
			visibilityChanges
		};
	}

	/**
	 * Get all nodes in the graph
	 */
	getAllNodes(): string[] {
		return Array.from(this.nodes.keys());
	}

	/**
	 * Check if a node exists in the graph
	 */
	hasNode(key: string): boolean {
		return this.nodes.has(key);
	}

	/**
	 * Remove a node and all its edges from the graph
	 */
	removeNode(key: string): void {
		const node = this.nodes.get(key);
		if (!node) return;

		// Remove from dependents' dependencies
		for (const dependent of node.dependents) {
			this.nodes.get(dependent)?.dependencies.delete(key);
		}

		// Remove from dependencies' dependents
		for (const dependency of node.dependencies) {
			this.nodes.get(dependency)?.dependents.delete(key);
		}

		this.nodes.delete(key);
		this.edges.delete(key);
	}

	/**
	 * Clear all nodes and edges
	 */
	clear(): void {
		this.nodes.clear();
		this.edges.clear();
	}

	/**
	 * Get graph statistics
	 */
	getStats(): { nodes: number; edges: number } {
		let edgeCount = 0;
		for (const deps of this.edges.values()) {
			edgeCount += deps.size;
		}
		return {
			nodes: this.nodes.size,
			edges: edgeCount
		};
	}

	/**
	 * Serialize the graph for debugging
	 */
	toJSON(): Record<string, { dependencies: string[]; dependents: string[] }> {
		const result: Record<string, { dependencies: string[]; dependents: string[] }> = {};
		for (const [key, node] of this.nodes) {
			result[key] = {
				dependencies: Array.from(node.dependencies),
				dependents: Array.from(node.dependents)
			};
		}
		return result;
	}
}
