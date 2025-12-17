# Feature Plan Template

Use this template when planning new features for the UE5 Question Generator.

## Overview

Brief description of the feature (1-2 sentences).

## Agent Assignment

Which agent(s) will implement this feature?

- [ ] AGENT A - Critique Pipeline Engineer
- [ ] AGENT B - Improvement Modal Engineer
- [ ] AGENT C - Question List UI Integrator
- [ ] AGENT D - Toolbar & Test Mode Engineer
- [ ] AGENT E - MainLayout & Routing Engineer
- [ ] AGENT F - Security, Types, README, DX Engineer

## Files Modified

List all files that will be modified:

- `path/to/file.js` - Description of changes
- `path/to/other.jsx` - Description of changes

## Files Created

List all new files that will be created:

- `path/to/new/file.js` - Purpose of file

## Integration Points

How does this feature integrate with other agents' work?

- **Agent X → Agent Y**: Description of data flow
- **Shared Dependencies**: List any shared resources

## Type Definitions

Will this feature require new type definitions? If yes, list them:

```javascript
/**
 * @typedef {Object} NewType
 * @property {string} field - Description
 */
```

## Testing Strategy

What tests will be added?

### Unit Tests

- Test case 1
- Test case 2

### Integration Tests

- Test case 1
- Test case 2

### Manual Testing

- Step 1
- Step 2

## Security Considerations

- [ ] No client-side API calls
- [ ] Input sanitization
- [ ] Authentication/authorization checks
- [ ] Data validation

## Rollout Plan

1. **Development**: Implement in feature branch
2. **Testing**: Run full test suite
3. **Review**: Code review and approval
4. **Deployment**: Merge to main and deploy

## Rollback Plan

If issues arise:

1. Revert commit: `git revert <commit-hash>`
2. Redeploy previous version
3. Investigate and fix issues
4. Re-deploy when ready

## Success Criteria

- [ ] All tests pass
- [ ] No new lint warnings
- [ ] Feature works as expected
- [ ] Documentation updated
- [ ] No performance degradation
