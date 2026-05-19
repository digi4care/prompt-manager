# Mini-Plan: Settings UX Improvements

## Classification

| Property | Value |
|----------|-------|
| Type | adaptive |
| Scale | medium |
| Risk | low |
| Trigger | User-identified UX gaps in settings-new page |

## Problem Statement

The current SettingsForm renders settings as generic form fields without showing which application features are affected by each setting. Users cannot see that changing "temperature" affects Judge, Improve, and Executor features. Additionally, primitive input types (comma-separated strings for arrays, JSON textareas for objects) provide poor UX.

## Scope

### In Scope

1. **Feature-impact visibility** - Show badges/tags per setting indicating affected features (judge, improve, executor, council, review)
2. **Custom setting renderers** - Allow settings to specify custom Svelte components for rendering (model picker, policy matrix, etc.)
3. **Improved array input** - Replace comma-separated text with a tag-based input (add/remove tags)
4. **Improved object input** - Replace JSON textarea with a key-value editor
5. **Placeholder support** - Add placeholder text to setting definitions

### Out of Scope

- Full feature-driven layout redesign (post-MVP)
- Settings search/filter functionality (post-MVP)
- Settings import/export (post-MVP)

## Acceptance Criteria

1. Each setting in SettingsField shows impacted feature badges when `impactedFeatures` is defined
2. Settings can specify a custom `component` renderer instead of default inputs
3. Array type settings use a tag-based input with add/remove functionality
4. Object type settings use a key-value pair editor
5. All changes maintain backward compatibility with existing settings blocks
6. 177 unit tests continue passing
7. No TypeScript errors introduced

## Verification Method

- Unit tests for new components (TagInput, KeyValueEditor)
- Visual inspection of settings-new page
- Test that existing settings blocks render correctly
- Run `bun run check` for type safety

## Affected Artifacts

- `src/lib/settings/types.ts` - Add component, impactedFeatures, placeholder fields
- `src/lib/components/settings/SettingsField.svelte` - Add feature badges, custom renderers, tag input, key-value editor
- `src/lib/components/settings/SettingsBlock.svelte` - (minor) style adjustments if needed
- `src/lib/settings/blocks/*.ts` - Add impactedFeatures to relevant settings

## Beads Mapping

- Issue: `settings-ux-01` - Core type extensions and SettingsField improvements
- Issue: `settings-ux-02` - TagInput and KeyValueEditor components
- Issue: `settings-ux-03` - Update settings blocks with impactedFeatures metadata

## Decision Log

- DEC-001: Add `component` field to SettingDefinition for custom renderers
- DEC-002: Add `impactedFeatures` field for feature-impact badges
- DEC-003: Keep existing primitive inputs as fallback when no custom component specified
- DEC-004: TagInput and KeyValueEditor are generic reusable components, not settings-specific

## Next Action

Create Beads issues and get user approval on mini-plan before implementation.
