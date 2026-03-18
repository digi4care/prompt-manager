import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph, CircularDependencyError } from '$lib/settings/dependency-graph';

describe('DependencyGraph', () => {
	let graph: DependencyGraph;

	beforeEach(() => {
		graph = new DependencyGraph();
	});

	describe('basic operations', () => {
		it('should add a dependency', () => {
			graph.addDependency('a', 'b');
			expect(graph.getDependencies('a')).toContain('b');
			expect(graph.getDependents('b')).toContain('a');
		});

		it('should add multiple dependencies', () => {
			graph.addDependencies('a', ['b', 'c', 'd']);
			expect(graph.getDependencies('a')).toHaveLength(3);
			expect(graph.getDependencies('a')).toContain('b');
			expect(graph.getDependencies('a')).toContain('c');
			expect(graph.getDependencies('a')).toContain('d');
		});

		it('should remove a dependency', () => {
			graph.addDependency('a', 'b');
			graph.removeDependency('a', 'b');
			expect(graph.getDependencies('a')).not.toContain('b');
			expect(graph.getDependents('b')).not.toContain('a');
		});

		it('should throw when adding self-dependency', () => {
			expect(() => graph.addDependency('a', 'a')).toThrow("Setting 'a' cannot depend on itself");
		});

		it('should check if node exists', () => {
			expect(graph.hasNode('a')).toBe(false);
			graph.addDependency('a', 'b');
			expect(graph.hasNode('a')).toBe(true);
			expect(graph.hasNode('b')).toBe(true);
		});
	});

	describe('transitive relationships', () => {
		beforeEach(() => {
			// Create chain: a -> b -> c -> d
			graph.addDependency('a', 'b');
			graph.addDependency('b', 'c');
			graph.addDependency('c', 'd');
		});

		it('should get all dependencies recursively', () => {
			const deps = graph.getAllDependencies('a');
			expect(deps).toContain('b');
			expect(deps).toContain('c');
			expect(deps).toContain('d');
		});

		it('should get all dependents recursively', () => {
			const deps = graph.getAllDependents('d');
			expect(deps).toContain('c');
			expect(deps).toContain('b');
			expect(deps).toContain('a');
		});
	});

	describe('topological sort', () => {
		it('should sort simple dependencies', () => {
			graph.addDependency('a', 'b');
			graph.addDependency('b', 'c');

			const sorted = graph.topologicalSort();
			expect(sorted.indexOf('c')).toBeLessThan(sorted.indexOf('b'));
			expect(sorted.indexOf('b')).toBeLessThan(sorted.indexOf('a'));
		});

		it('should sort complex dependencies', () => {
			//      a
			//     / \
			//    b   c
			//    |   |
			//    d   e
			//     \ /
			//      f
			graph.addDependency('a', 'b');
			graph.addDependency('a', 'c');
			graph.addDependency('b', 'd');
			graph.addDependency('c', 'e');
			graph.addDependency('d', 'f');
			graph.addDependency('e', 'f');

			const sorted = graph.topologicalSort();
			expect(sorted.indexOf('f')).toBeLessThan(sorted.indexOf('d'));
			expect(sorted.indexOf('f')).toBeLessThan(sorted.indexOf('e'));
			expect(sorted.indexOf('d')).toBeLessThan(sorted.indexOf('b'));
			expect(sorted.indexOf('e')).toBeLessThan(sorted.indexOf('c'));
		});

		it('should handle disconnected nodes', () => {
			graph.addDependency('a', 'b');
			graph.addDependency('x', 'y');

			const sorted = graph.topologicalSort();
			expect(sorted).toContain('a');
			expect(sorted).toContain('b');
			expect(sorted).toContain('x');
			expect(sorted).toContain('y');
		});
	});

	describe('cycle detection', () => {
		it('should detect simple cycle', () => {
			graph.addDependency('a', 'b');
			graph.addDependency('b', 'a');

			const cycles = graph.detectCycles();
			expect(cycles).toHaveLength(1);
			expect(cycles[0]).toContain('a');
			expect(cycles[0]).toContain('b');
		});

		it('should detect complex cycle', () => {
			graph.addDependency('a', 'b');
			graph.addDependency('b', 'c');
			graph.addDependency('c', 'd');
			graph.addDependency('d', 'b');

			const cycles = graph.detectCycles();
			expect(cycles.length).toBeGreaterThan(0);
		});

		it('should return true for hasCycles when cycle exists', () => {
			graph.addDependency('a', 'b');
			graph.addDependency('b', 'a');
			expect(graph.hasCycles()).toBe(true);
		});

		it('should return false for hasCycles when no cycles', () => {
			graph.addDependency('a', 'b');
			graph.addDependency('b', 'c');
			expect(graph.hasCycles()).toBe(false);
		});

		it('should throw CircularDependencyError on sort with cycle', () => {
			graph.addDependency('a', 'b');
			graph.addDependency('b', 'a');

			expect(() => graph.topologicalSort()).toThrow(CircularDependencyError);
		});
	});

	describe('impact analysis', () => {
		beforeEach(() => {
			// a -> b -> c
			//      |
			//      v
			//      d
			graph.addDependency('a', 'b');
			graph.addDependency('b', 'c');
			graph.addDependency('b', 'd');
		});

		it('should identify directly affected settings', () => {
			const impact = graph.getImpactAnalysis('b');
			expect(impact.directlyAffected).toContain('a');
		});

		it('should identify transitively affected settings', () => {
			const impact = graph.getImpactAnalysis('c');
			expect(impact.transitivelyAffected).toContain('a');
			expect(impact.directlyAffected).toContain('b');
		});

		it('should include visibility changes', () => {
			const impact = graph.getImpactAnalysis('b');
			expect(impact.visibilityChanges.length).toBeGreaterThan(0);
		});
	});

	describe('graph operations', () => {
		it('should remove a node completely', () => {
			graph.addDependency('a', 'b');
			graph.addDependency('b', 'c');

			graph.removeNode('b');
			expect(graph.hasNode('b')).toBe(false);
			expect(graph.getDependencies('a')).not.toContain('b');
			expect(graph.getDependents('c')).not.toContain('b');
		});

		it('should clear all nodes', () => {
			graph.addDependency('a', 'b');
			graph.addDependency('c', 'd');

			graph.clear();
			expect(graph.getAllNodes()).toHaveLength(0);
		});

		it('should provide accurate stats', () => {
			graph.addDependency('a', 'b');
			graph.addDependency('a', 'c');
			graph.addDependency('b', 'd');

			const stats = graph.getStats();
			expect(stats.nodes).toBe(4);
			expect(stats.edges).toBe(3);
		});

		it('should serialize to JSON', () => {
			graph.addDependency('a', 'b');
			graph.addDependency('b', 'c');

			const json = graph.toJSON();
			expect(json).toHaveProperty('a');
			expect(json).toHaveProperty('b');
			expect(json).toHaveProperty('c');
			expect(json.a.dependencies).toContain('b');
			expect(json.b.dependents).toContain('a');
		});
	});
});
