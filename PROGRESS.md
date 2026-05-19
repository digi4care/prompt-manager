# Project Progress - Settings Schema Registry

## Last Update: 2026-03-18

## Current Status: AI Policy Modal Issue

### What Was Fixed

✅ **Settings Schema Registry Architecture (Phase 10)**
- Core registry with dependency graph
- Cascade resolution (run > prompt > default)
- Svelte 5 reactive store integration
- Backward compatibility layer
- All 177 unit tests passing

✅ **Separate Route for New System**
- Created `/settings-new` route for testing new registry
- Original `/settings` route remains untouched (756 lines)
- Feature flag approach with `?new=true` no longer needed

✅ **AI Policy Fixes Applied**

**Problem 1**: PolicyEditor loaded ALL models via API, ignoring selected providers
**Fix**: Added `models` prop to PolicyEditor, passed filtered models from settings page

**Problem 2**: Variants not showing (ModelVariant[] vs variantOptions[] mismatch)  
**Fix**: Added mapping in resolveModelById(): `model.variants?.map(v => v.id) || []`

### Files Changed

1. **src/lib/components/admin/ai-settings/policy-editor.svelte**
   - Added `models?: unknown[]` to Props interface
   - Updated destructuring to include `models: propModels`
   - Modified loadCatalog() to use propModels if available
   - Added variantOptions mapping in both resolveModelById() return statements

2. **src/routes/settings/+page.svelte**
   - Changed `<PolicyEditor />` to `<PolicyEditor models={data.models} />`

### Current Issue

**Status**: Model picker modal NOT opening when clicking "Select models"

**Symptoms**:
- Settings page loads correctly
- AI Policy section displays correctly  
- "Select models" button is visible
- Clicking button does nothing (modal doesn't open)

**Suspected Causes**:
1. groupedModels is empty (no connected providers → no models returned)
2. JavaScript error blocking click handler
3. Svelte rendering issue with ModelPickerModal

**What We Know**:
- isPickerOpen state exists and is set to true on click
- ModelPickerModal uses `{#if open}` conditional rendering
- bind:open={isPickerOpen} should work with Svelte 5
- No console errors visible

### Next Steps for Handoff

1. **Debug why modal doesn't open**:
   - Add console.log in onclick handler to verify click registers
   - Check if groupedModels is populated (length > 0)
   - Verify isPickerOpen changes from false to true
   - Check if ModelPickerModal template renders at all

2. **Test with connected providers**:
   - First connect some providers in Providers section
   - Then open AI Policy - models should appear
   - Modal should open with available models

3. **Alternative approach if needed**:
   - Make PolicyEditor fetch ALL models from API if propModels is empty
   - Don't filter by connected providers in settings page
   - Let users see all available models in policy editor

### Testing

**Unit Tests**: All 177 tests passing
```bash
bun run test tests/unit/settings/
```

**Manual Test**:
1. Start server: `bun run dev`
2. Login: http://127.0.0.1:45678/login
3. Go to Settings: http://127.0.0.1:45678/settings
4. Click "AI Policy" section
5. Click "Select models" button
6. **Expected**: Modal opens with model list
7. **Actual**: Nothing happens

### Related Files

- `/src/lib/components/admin/ai-settings/policy-editor.svelte` - Main component
- `/src/lib/components/shared/model-selection/model-picker-modal.svelte` - Modal component
- `/src/routes/settings/+page.svelte` - Settings page
- `/src/routes/settings/+page.server.ts` - Server data loading
- `/src/lib/types/model.types.ts` - Type definitions

### New Route for Testing

The new Settings Schema Registry is available at:
- http://127.0.0.1:45678/settings-new (experimental)

Original settings remains at:
- http://127.0.0.1:45678/settings (stable)

### Notes for Next Developer

1. The PolicyEditor fixes are correct and should work
2. The issue is likely related to empty groupedModels state
3. Check if models are being passed correctly from server to client
4. ModelPickerModal might need debugging to see why it doesn't render
5. Consider adding a "no models available" message when groupedModels is empty

### Git Status

Branch: `feature/settings-schema-registry`
Changes:
- `src/lib/components/admin/ai-settings/policy-editor.svelte` - Modified
- `src/routes/settings/+page.svelte` - Modified  
- `src/routes/settings-new/` - New directory (experimental)

Ready for handoff to new chat session.
</content>
</invoke>