# Proposal: Add User Support QR Buttons

**Change ID:** `add-user-support-qr-buttons`
**Status:** Draft
**Author:** Claude Code
**Date:** 2025-11-12

## Summary

Add customer service and Xianyu store buttons with QR code display functionality to the user dashboard. These buttons will appear in the navigation bar (left of the Logout button) and show QR codes with smooth animations on hover or click. Administrators can manage and update QR codes through the admin backend.

## Motivation

Users need easy access to customer support and purchase services directly from the platform. Currently, there is no built-in way for users to find customer service or the Xianyu store. This feature will:

- Provide direct access to customer service contact via QR code
- Allow users to quickly find the Xianyu store for purchases
- Enable administrators to update QR codes without code changes
- Improve user experience with animated QR code displays

## Goals

1. Add two buttons (Customer Service and Xianyu Store) to the user dashboard navigation bar
2. Implement smooth hover/click animations to display QR codes
3. Store QR code images as Base64 strings in Redis
4. Create admin management UI for uploading and updating QR codes
5. Support both light and dark themes for all new components
6. Ensure mobile responsiveness for all screen sizes

## Non-Goals

- Support for multiple QR codes per button (only one QR code per button type)
- QR code generation functionality (admins upload pre-generated QR codes)
- Analytics tracking for QR code views or scans
- Custom button positioning beyond navigation bar

## Scope

### In Scope

- **Frontend Changes:**
  - Add QR code buttons component to user dashboard navigation
  - Implement hover/click animation for QR code display
  - Add admin UI for QR code management (upload, preview, update, delete)
  - Support light/dark theme for all new components
  - Ensure mobile responsive design

- **Backend Changes:**
  - Create API endpoints for QR code CRUD operations (admin only)
  - Store QR code Base64 data in Redis with metadata
  - Add authentication middleware for admin-only access
  - Implement Base64 encoding for uploaded images

- **Data Model:**
  - Redis keys: `qr_code:customer_service`, `qr_code:xianyu_store`
  - Fields: type, base64Data, updatedAt, updatedBy

### Out of Scope

- QR code analytics or tracking
- Multiple QR codes per type
- Automatic QR code generation
- Custom button styling per user
- QR code expiration or rotation

## User Stories

**As a user**, I want to:

- See customer service and Xianyu store buttons in my dashboard navigation
- View QR codes by hovering over or clicking the buttons
- Scan the QR codes with my mobile device to access services

**As an administrator**, I want to:

- Upload new QR code images through the admin panel
- Preview QR codes before saving
- Update existing QR codes when contact information changes
- Delete QR codes if no longer needed
- See who last updated each QR code and when

## Design Decisions

### QR Code Storage: Base64 in Redis

**Decision:** Store QR code images as Base64-encoded strings directly in Redis.

**Rationale:**

- No file system or cloud storage dependency required
- Simplified deployment (no additional storage setup)
- Fast retrieval with single Redis GET operation
- Consistent with project's Redis-first architecture
- Small data size (typical QR code < 50KB Base64)

**Alternatives Considered:**

- File system storage: Requires persistent volume management in Docker
- External image hosting: Adds external dependency and potential availability issues

### Button Position: Navigation Bar Right Side

**Decision:** Place buttons in the navigation bar, left of the Logout button.

**Rationale:**

- User selected this option as most appropriate
- Consistent with existing navigation UI patterns
- Always visible without scrolling
- Natural grouping with other navigation actions

### Display Interaction: Hover or Click

**Decision:** Support both hover (desktop) and click (mobile/desktop) interactions.

**Rationale:**

- Hover provides quick preview on desktop
- Click works universally across all devices
- Click on mobile shows QR code in a modal or popover
- Smooth animation enhances user experience

## Security Considerations

- **Admin-only access:** QR code management endpoints require admin authentication
- **Input validation:** Validate uploaded images (file type, size, dimensions)
- **Base64 encoding:** Sanitize Base64 strings to prevent injection attacks
- **Rate limiting:** Apply existing rate limiting to prevent abuse
- **File size limit:** Restrict QR code image size (max 500KB)

## Performance Impact

- **Minimal impact:** QR code data cached in frontend after first load
- **Redis storage:** ~100KB per QR code (negligible compared to typical Redis usage)
- **Frontend bundle:** +~5KB for new components (minified + gzipped)
- **API calls:** 1-2 additional requests on user dashboard load (cached)

## Testing Strategy

- **Unit tests:** Test QR code upload validation and Base64 encoding
- **Integration tests:** Test admin API endpoints for CRUD operations
- **Frontend tests:** Test component rendering in light/dark themes
- **Manual testing:** Verify animations, responsiveness, and mobile UX
- **Cross-browser testing:** Ensure compatibility with major browsers

## Rollout Plan

1. **Phase 1:** Backend API implementation (admin endpoints, Redis storage)
2. **Phase 2:** Admin UI for QR code management
3. **Phase 3:** User dashboard button components and animations
4. **Phase 4:** Testing and bug fixes
5. **Phase 5:** Documentation and deployment

## Documentation

- Update `CLAUDE.md` with new Redis keys and API endpoints
- Add admin guide for QR code management
- Document frontend components and props
- Update API documentation with new endpoints

## Open Questions

None - all decisions clarified with user.

## Related Changes

None - this is a new standalone feature.

## References

- User dashboard: `web/admin-spa/src/views/UserDashboardView.vue`
- Admin routes: `src/routes/admin.js`
- Redis data structure conventions: `openspec/project.md`
