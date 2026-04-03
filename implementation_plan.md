# Implementation Plan - Correct Firestore Security Rules

The current `firestore.rules` has a structural flaw where subcollection matches (incomes, expenses, etc.) are defined outside the `match /users/{userId}` block, causing them to fail to match the hierarchical data path used by the application (`/users/{userId}/userProfiles/{profileId}/...`). Additionally, new users are experiencing permission denials when listing their profiles.

## User Review Required

> [!IMPORTANT]
> This change will strictly enforce that all data must be nested under `/users/{userId}/userProfiles/{profileId}/`. Any data living in other paths will become inaccessible.

## Proposed Changes

### [Firestore Rules](file:///c:/Users/maina/Downloads/fintrack-main/fintrack-main/firestore.rules)

#### [MODIFY]
- **Structural Nesting**: Move all subcollection matches (`incomes`, `expenses`, `savingsAccounts`, `debts`, `transactions`) inside the `match /users/{userId}/userProfiles/{userProfileId}` block.
- **Relational Integrity**: Ensure `hasValidSubcollectionData(userProfileId)` correctly validates that the `profileId` in the document matches the ID in the path.
- **Root Permissions**: Verify that `isOwner(userId)` is correctly applied to the `/users/{userId}` and `/userProfiles/{userProfileId}` paths to allow initial profile listing and creation.

## Verification Plan

### Automated Tests
- Use the browser subagent to test:
    1. Login with an existing user and verify they can see their dashboard data.
    2. Signup with a **new user** and verify they can see the "Select Profile" (empty) state without permission errors.
    3. Create a new profile as the new user and verify it succeeds.
    4. Add an expense to the new profile and verify it succeeds.

### Manual Verification
- Confirm that no "Missing or insufficient permissions" toasts appear on the dashboard for new users.
