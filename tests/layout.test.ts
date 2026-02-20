import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';

// Test that layout components files exist and have valid structure
describe('Layout Components Structure', () => {
	it('should have header component file', () => {
		const headerPath = 'src/lib/components/layout/header.svelte';
		expect(fs.existsSync(headerPath)).toBe(true);
		const content = fs.readFileSync(headerPath, 'utf-8');
		expect(content).toContain('<script');
		expect(content).toContain('<header'); // Header renders a <header> element
	});

	it('should have sidebar component file', () => {
		const sidebarPath = 'src/lib/components/layout/sidebar.svelte';
		expect(fs.existsSync(sidebarPath)).toBe(true);
		const content = fs.readFileSync(sidebarPath, 'utf-8');
		expect(content).toContain('<script');
		expect(content).toContain('<aside'); // Sidebar renders an <aside> element
	});

	it('should have mobile nav component file', () => {
		const mobileNavPath = 'src/lib/components/layout/mobile-nav.svelte';
		expect(fs.existsSync(mobileNavPath)).toBe(true);
		const content = fs.readFileSync(mobileNavPath, 'utf-8');
		expect(content).toContain('<script');
		expect(content).toContain('fixed inset-y-0'); // MobileNav has fixed positioning
	});

	it('should have layout index exports', () => {
		const indexPath = 'src/lib/components/layout/index.ts';
		expect(fs.existsSync(indexPath)).toBe(true);
		const content = fs.readFileSync(indexPath, 'utf-8');
		expect(content).toContain('Header');
		expect(content).toContain('Sidebar');
		expect(content).toContain('MobileNav');
	});
});

describe('Layout Components Props', () => {
	it('Header component should accept onMenuToggle prop', () => {
		const headerPath = 'src/lib/components/layout/header.svelte';
		const content = fs.readFileSync(headerPath, 'utf-8');
		expect(content).toContain('onMenuToggle');
		expect(content).toContain('class?: string');
	});

	it('Sidebar component should use $page store', () => {
		const sidebarPath = 'src/lib/components/layout/sidebar.svelte';
		const content = fs.readFileSync(sidebarPath, 'utf-8');
		expect(content).toContain('$page');
		expect(content).toContain('$app/stores');
	});

	it('MobileNav component should accept open and onclose props', () => {
		const mobileNavPath = 'src/lib/components/layout/mobile-nav.svelte';
		const content = fs.readFileSync(mobileNavPath, 'utf-8');
		expect(content).toContain('open = $bindable');
		expect(content).toContain('onclose');
	});
});

describe('Navigation Items', () => {
	it('Header should define the top navigation items', () => {
		const headerPath = 'src/lib/components/layout/header.svelte';
		const content = fs.readFileSync(headerPath, 'utf-8');
		expect(content).toContain('navItems');
		expect(content).toContain("href: '/prompts'");
		expect(content).toContain("href: '/analytics'");
		expect(content).toContain("href: '/settings'");
	});
});

describe('Component Features', () => {
	it('Header should include theme toggle functionality', () => {
		const headerPath = 'src/lib/components/layout/header.svelte';
		const content = fs.readFileSync(headerPath, 'utf-8');
		expect(content).toContain('toggleTheme');
		expect(content).toContain('isDark');
		expect(content).toContain('dark');
		expect(content).toContain('light');
	});

	it('Header should have hamburger menu button', () => {
		const headerPath = 'src/lib/components/layout/header.svelte';
		const content = fs.readFileSync(headerPath, 'utf-8');
		expect(content).toContain('Toggle menu');
		expect(content).toContain('md:hidden');
	});

	it('MobileNav should have close button', () => {
		const mobileNavPath = 'src/lib/components/layout/mobile-nav.svelte';
		const content = fs.readFileSync(mobileNavPath, 'utf-8');
		expect(content).toContain('Close menu');
	});

	it('Sidebar should have active state highlighting', () => {
		const sidebarPath = 'src/lib/components/layout/sidebar.svelte';
		const content = fs.readFileSync(sidebarPath, 'utf-8');
		expect(content).toContain('isActive');
		expect(content).toContain('active');
		expect(content).toContain('variant={active');
	});

	it('MobileNav should have slide-in animation', () => {
		const mobileNavPath = 'src/lib/components/layout/mobile-nav.svelte';
		const content = fs.readFileSync(mobileNavPath, 'utf-8');
		expect(content).toContain('translate-x-0');
		expect(content).toContain('-translate-x-full');
		expect(content).toContain('transition-transform');
	});
});

describe('Layout Integration', () => {
	it('+layout.svelte should import layout components', () => {
		const layoutPath = 'src/routes/+layout.svelte';
		expect(fs.existsSync(layoutPath)).toBe(true);
		const content = fs.readFileSync(layoutPath, 'utf-8');
		expect(content).toContain('import { Header }');
		expect(content).toContain('$lib/components/layout');
	});

	it('+layout.svelte should have max width wrapper', () => {
		const layoutPath = 'src/routes/+layout.svelte';
		const content = fs.readFileSync(layoutPath, 'utf-8');
		expect(content).toContain('max-w-[1440px]');
		expect(content).toContain('min-h-screen');
	});

	it('+layout.svelte should have main content wrapper', () => {
		const layoutPath = 'src/routes/+layout.svelte';
		const content = fs.readFileSync(layoutPath, 'utf-8');
		expect(content).toContain('<main');
		expect(content).toContain('px-4');
		expect(content).toContain('py-6');
	});
});

describe('Accessibility', () => {
	it('Header hamburger button should have aria-label', () => {
		const headerPath = 'src/lib/components/layout/header.svelte';
		const content = fs.readFileSync(headerPath, 'utf-8');
		expect(content).toContain('aria-label="Toggle menu"');
	});

	it('MobileNav backdrop should have role button', () => {
		const mobileNavPath = 'src/lib/components/layout/mobile-nav.svelte';
		const content = fs.readFileSync(mobileNavPath, 'utf-8');
		expect(content).toContain('role="button"');
	});

	it('MobileNav should have role navigation', () => {
		const mobileNavPath = 'src/lib/components/layout/mobile-nav.svelte';
		const content = fs.readFileSync(mobileNavPath, 'utf-8');
		expect(content).toContain('role="navigation"');
		expect(content).toContain('aria-label="Mobile navigation"');
	});

	it('Sidebar should have navigation structure', () => {
		const sidebarPath = 'src/lib/components/layout/sidebar.svelte';
		const content = fs.readFileSync(sidebarPath, 'utf-8');
		expect(content).toContain('<nav');
	});
});
