# Tasks: Add User Support QR Buttons

**Change ID:** `add-user-support-qr-buttons`

## Implementation Tasks

### Phase 1: Backend API and Data Layer (Priority: High)

**Task 1.1: Create QR Code Service**

- Create `src/services/qrCodeService.js` with functions:
  - `createQrCode(type, base64Data, adminId)` - Store new QR code in Redis
  - `getQrCode(type)` - Retrieve QR code by type
  - `updateQrCode(type, base64Data, adminId)` - Update existing QR code
  - `deleteQrCode(type)` - Remove QR code from Redis
  - `getAllQrCodes()` - List all available QR codes
- Use Redis keys: `qr_code:{type}` (e.g., `qr_code:customer_service`)
- Store JSON with fields: `type`, `base64Data`, `updatedAt`, `updatedBy`
- Add error handling for Redis connection failures
- **Validation:** Run unit tests for all service functions
- **Dependencies:** None
- **Estimated time:** 2 hours

**Task 1.2: Add Image Validation Utility**

- Create `src/utils/imageValidator.js` with functions:
  - `validateImageFormat(file)` - Check file type (PNG, JPG, JPEG)
  - `validateImageSize(file, maxSizeKB)` - Check file size limit
  - `convertToBase64(file)` - Convert image buffer to Base64 with data URI prefix
- Support file size limit of 500KB
- Return descriptive error messages for validation failures
- **Validation:** Test with various image formats and sizes
- **Dependencies:** None
- **Estimated time:** 1 hour

**Task 1.3: Create Admin QR Code API Routes**

- Add routes to `src/routes/admin.js`:
  - `POST /admin/qr-codes` - Upload new QR code (requires `authenticateAdmin` middleware)
  - `GET /admin/qr-codes` - List all QR codes
  - `GET /admin/qr-codes/:type` - Get specific QR code
  - `PUT /admin/qr-codes/:type` - Update QR code
  - `DELETE /admin/qr-codes/:type` - Delete QR code
- Use `multer` middleware for file uploads (single file, field name: `image`)
- Validate `type` parameter (only allow "customer_service" or "xianyu_store")
- Call `imageValidator` before processing uploads
- Return appropriate HTTP status codes (201, 200, 204, 400, 403, 404)
- **Validation:** Test all endpoints with Postman or curl
- **Dependencies:** Task 1.1, Task 1.2
- **Estimated time:** 3 hours

**Task 1.4: Create Public QR Code API Route**

- Add route to `src/routes/api.js` or create `src/routes/qrCodeRoutes.js`:
  - `GET /api/qr-codes` - Public endpoint for fetching QR codes (requires user authentication)
- Return array of QR codes with only `type` and `base64Data` fields (exclude metadata)
- Filter out deleted QR codes
- Add response caching header: `Cache-Control: public, max-age=300` (5 minutes)
- **Validation:** Test endpoint with authenticated user token
- **Dependencies:** Task 1.1
- **Estimated time:** 1 hour

**Task 1.5: Update Main Server to Include QR Code Routes**

- Import and mount QR code routes in `src/server.js` or main app file
- Ensure routes are registered after authentication middleware setup
- Add routes to API documentation (if exists)
- **Validation:** Verify routes appear in server startup logs
- **Dependencies:** Task 1.3, Task 1.4
- **Estimated time:** 0.5 hours

### Phase 2: Admin UI for QR Code Management (Priority: High)

**Task 2.1: Create QR Code Management Page Component**

- Create `web/admin-spa/src/views/QrCodeManagementView.vue`
- Display list of existing QR codes (customer_service, xianyu_store) with cards:
  - Show QR code preview image
  - Show type label (e.g., "Customer Service", "Xianyu Store")
  - Show last updated timestamp and admin username
  - Include Edit and Delete buttons per card
- Add "Add New QR Code" button at top
- Support light and dark themes with Tailwind classes
- Use responsive grid layout (1 column on mobile, 2 columns on desktop)
- **Validation:** Verify rendering in both light and dark modes
- **Dependencies:** None (can be developed in parallel)
- **Estimated time:** 3 hours

**Task 2.2: Create QR Code Upload/Edit Modal Component**

- Create `web/admin-spa/src/components/admin/QrCodeModal.vue`
- Modal should support both "Create" and "Edit" modes
- Include fields:
  - Type selector (dropdown: "Customer Service" or "Xianyu Store")
  - Image upload input with drag-and-drop support
  - Image preview area showing selected/existing image
  - Save and Cancel buttons
- Validate image format and size on frontend before upload
- Display upload progress indicator during submission
- Show error messages from backend validation
- Close modal on successful save
- **Validation:** Test upload flow with valid and invalid images
- **Dependencies:** None (can be developed in parallel)
- **Estimated time:** 3 hours

**Task 2.3: Create QR Code API Service Module**

- Create `web/admin-spa/src/services/qrCodeService.js`
- Implement functions using axios:
  - `fetchAllQrCodes()` - GET /admin/qr-codes
  - `fetchQrCode(type)` - GET /admin/qr-codes/:type
  - `createQrCode(type, imageFile)` - POST /admin/qr-codes (multipart/form-data)
  - `updateQrCode(type, imageFile)` - PUT /admin/qr-codes/:type
  - `deleteQrCode(type)` - DELETE /admin/qr-codes/:type
- Add request interceptors for admin authentication token
- Handle network errors and return user-friendly messages
- **Validation:** Test API calls from browser console
- **Dependencies:** Task 1.3
- **Estimated time:** 1.5 hours

**Task 2.4: Add QR Code Management Route**

- Update `web/admin-spa/src/router/index.js`
- Add route for QR code management view:
  ```javascript
  {
    path: '/qr-codes',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'QrCodes',
        component: QrCodeManagementView
      }
    ]
  }
  ```
- Add navigation menu item in admin sidebar/header
- **Validation:** Verify route works and requires admin authentication
- **Dependencies:** Task 2.1
- **Estimated time:** 0.5 hours

**Task 2.5: Integrate QR Code Management into Admin Dashboard**

- Add "QR Codes" navigation link in `web/admin-spa/src/components/layout/MainLayout.vue` or sidebar
- Position link logically (e.g., under Settings or User Management)
- Use appropriate icon (e.g., QR code icon from Heroicons)
- Ensure link is visible only to admin users
- **Validation:** Verify navigation link works in both light and dark themes
- **Dependencies:** Task 2.4
- **Estimated time:** 0.5 hours

### Phase 3: User Dashboard QR Code Display (Priority: High)

**Task 3.1: Create QR Code Button Component**

- Create `web/admin-spa/src/components/user/QrCodeButton.vue`
- Accept props:
  - `type` (string): "customer_service" or "xianyu_store"
  - `base64Data` (string): Base64-encoded image
  - `label` (string): Display label
  - `icon` (component): Icon to display on button
- Render icon button with hover/click handlers
- Implement desktop hover behavior: show popover with QR code
- Implement mobile click behavior: show modal with QR code
- Use CSS transitions for smooth animations (fade-in 200ms, slide-up 300ms)
- Support light and dark themes
- **Validation:** Test on desktop (hover) and mobile (click) devices
- **Dependencies:** None (can be developed in parallel)
- **Estimated time:** 4 hours

**Task 3.2: Create QR Code Display Popover Component**

- Create `web/admin-spa/src/components/user/QrCodePopover.vue`
- Display QR code image at 200x200px (desktop) or 300x300px (mobile)
- Include label text above/below image
- Position popover above button with arrow pointer
- Auto-dismiss on mouse leave (desktop) or close button click (mobile)
- Use glass morphism effect consistent with existing design
- Support light and dark themes
- **Validation:** Verify popover positioning and animations
- **Dependencies:** None (can be developed in parallel)
- **Estimated time:** 2 hours

**Task 3.3: Fetch QR Codes in User Dashboard**

- Update `web/admin-spa/src/views/UserDashboardView.vue`
- Add `onMounted` hook to fetch QR codes via `GET /api/qr-codes`
- Store fetched QR codes in component reactive state
- Handle loading state (show skeleton loaders while fetching)
- Handle error state (show error message if fetch fails)
- Cache QR codes in component to avoid repeated fetches
- **Validation:** Verify QR codes load on dashboard mount
- **Dependencies:** Task 1.4
- **Estimated time:** 1 hour

**Task 3.4: Integrate QR Code Buttons into User Dashboard Navigation**

- Update `web/admin-spa/src/views/UserDashboardView.vue` navigation bar section (around line 73-87)
- Insert QR code buttons left of the Logout button:
  ```vue
  <div class="flex items-center space-x-4">
    <div class="text-sm text-gray-700 dark:text-gray-300">...</div>
    <ThemeToggle mode="icon" />
    <!-- NEW: QR Code Buttons -->
    <QrCodeButton
      v-if="qrCodes.customer_service"
      type="customer_service"
      :base64Data="qrCodes.customer_service.base64Data"
      label="Customer Service"
      :icon="ChatBubbleLeftIcon"
    />
    <QrCodeButton
      v-if="qrCodes.xianyu_store"
      type="xianyu_store"
      :base64Data="qrCodes.xianyu_store.base64Data"
      label="Xianyu Store"
      :icon="ShoppingBagIcon"
    />
    <button @click="handleLogout">Logout</button>
  </div>
  ```
- Import necessary icons from `@heroicons/vue/24/outline`
- Conditionally render buttons only if QR codes exist
- **Validation:** Verify buttons appear and function correctly
- **Dependencies:** Task 3.1, Task 3.3
- **Estimated time:** 1 hour

**Task 3.5: Add Responsive Styles for Mobile**

- Update QR code button component styles for mobile breakpoints
- Use Tailwind responsive classes:
  - `lg:flex` for desktop button visibility
  - `sm:hidden` for mobile adjustments
  - Adjust spacing: `space-x-4 lg:space-x-2 sm:space-x-1`
- Test layout on various screen sizes (320px, 768px, 1024px, 1920px)
- Ensure buttons don't overlap with other navigation elements
- **Validation:** Test on real mobile devices or browser dev tools
- **Dependencies:** Task 3.4
- **Estimated time:** 1 hour

### Phase 4: Testing and Quality Assurance (Priority: Medium)

**Task 4.1: Write Backend Unit Tests**

- Create `tests/services/qrCodeService.test.js`
- Test all qrCodeService functions with Jest:
  - Test successful QR code creation, retrieval, update, delete
  - Test error cases (invalid type, Redis failure)
  - Mock Redis client for isolated tests
- Achieve >80% code coverage for qrCodeService
- **Validation:** Run `npm test` and verify all tests pass
- **Dependencies:** Task 1.1
- **Estimated time:** 2 hours

**Task 4.2: Write Backend Integration Tests**

- Create `tests/routes/admin-qr-codes.test.js`
- Test admin API endpoints with SuperTest:
  - Test POST /admin/qr-codes with valid/invalid images
  - Test GET /admin/qr-codes and GET /admin/qr-codes/:type
  - Test PUT and DELETE endpoints
  - Test authentication and authorization checks
- Achieve >80% code coverage for QR code routes
- **Validation:** Run `npm test` and verify all tests pass
- **Dependencies:** Task 1.3
- **Estimated time:** 2 hours

**Task 4.3: Write Frontend Component Tests**

- Create component tests using Vue Test Utils or Vitest:
  - Test QrCodeButton component rendering and interactions
  - Test QrCodePopover component positioning and animations
  - Test QrCodeModal form validation and submission
- Test both light and dark theme variants
- **Validation:** Run frontend test suite and verify all tests pass
- **Dependencies:** Task 3.1, Task 3.2, Task 2.2
- **Estimated time:** 2 hours

**Task 4.4: Manual End-to-End Testing**

- Test complete admin workflow:
  - Upload new QR code via admin panel
  - View uploaded QR code in admin list
  - Edit existing QR code
  - Delete QR code
- Test complete user workflow:
  - View QR code buttons on user dashboard
  - Hover over buttons (desktop) and verify popover
  - Click buttons (mobile) and verify modal
  - Scan QR code with mobile device
- Test theme switching with QR codes displayed
- Test responsive behavior on multiple screen sizes
- **Validation:** Document test results and screenshots
- **Dependencies:** All previous tasks
- **Estimated time:** 2 hours

**Task 4.5: Cross-Browser Testing**

- Test on major browsers:
  - Chrome/Edge (Chromium)
  - Firefox
  - Safari (macOS/iOS)
- Verify QR code rendering, animations, and interactions
- Check for console errors or warnings
- Test on real mobile devices (iOS and Android)
- **Validation:** Document any browser-specific issues
- **Dependencies:** Task 4.4
- **Estimated time:** 1 hour

**Task 4.6: Performance Testing**

- Measure QR code load time on user dashboard
- Verify Base64 image decoding performance
- Test with slow network conditions (throttle to 3G)
- Ensure QR code display animations are smooth (60fps)
- Check Redis query performance for QR code fetches
- **Validation:** Document performance metrics and any issues
- **Dependencies:** Task 4.4
- **Estimated time:** 1 hour

### Phase 5: Documentation and Deployment (Priority: Low)

**Task 5.1: Update Project Documentation**

- Update `CLAUDE.md`:
  - Add QR code Redis keys to data structure section
  - Document new API endpoints in "Important Endpoints" section
  - Add QR code management to "Web Interface Functionality" section
- Add implementation notes and configuration details
- **Validation:** Verify documentation is clear and accurate
- **Dependencies:** All implementation tasks
- **Estimated time:** 1 hour

**Task 5.2: Create Admin User Guide**

- Create `docs/qr-code-management-guide.md` with:
  - Step-by-step guide for uploading QR codes
  - Instructions for editing and deleting QR codes
  - Best practices for QR code image quality
  - Troubleshooting common issues
- Include screenshots from admin panel
- **Validation:** Have a non-technical user review the guide
- **Dependencies:** Task 2.1-2.5
- **Estimated time:** 1 hour

**Task 5.3: Update API Documentation**

- If API documentation exists (Swagger/OpenAPI), add QR code endpoints
- Document request/response schemas
- Include example requests with curl commands
- Add authentication requirements
- **Validation:** Verify examples work as documented
- **Dependencies:** Task 1.3, Task 1.4
- **Estimated time:** 1 hour

**Task 5.4: Run Code Formatting and Linting**

- Run Prettier on all new/modified files:
  - `npx prettier --write "src/services/qrCodeService.js"`
  - `npx prettier --write "src/routes/admin.js"`
  - `npx prettier --write "web/admin-spa/src/**/*.vue"`
- Run ESLint and fix any issues
- Ensure no console.log statements remain in production code
- **Validation:** Verify `npm run lint` passes without errors
- **Dependencies:** All implementation tasks
- **Estimated time:** 0.5 hours

**Task 5.5: Prepare Deployment Checklist**

- Create deployment checklist:
  - [ ] All tests pass (backend + frontend)
  - [ ] Code formatted with Prettier
  - [ ] Documentation updated
  - [ ] Redis keys do not conflict with existing data
  - [ ] Admin users can access QR code management
  - [ ] Regular users see QR code buttons (if QR codes exist)
  - [ ] No console errors in production build
  - [ ] Mobile responsive design verified
- **Validation:** Complete checklist before deployment
- **Dependencies:** All previous tasks
- **Estimated time:** 0.5 hours

**Task 5.6: Deploy to Staging Environment**

- Deploy changes to staging environment
- Smoke test all QR code functionality
- Verify Redis data persistence
- Test with real QR codes and mobile scanning
- Check logs for any errors or warnings
- **Validation:** Staging environment fully functional
- **Dependencies:** Task 5.5
- **Estimated time:** 1 hour

**Task 5.7: Production Deployment**

- Deploy to production environment following standard procedures
- Monitor logs for errors during and after deployment
- Verify QR code functionality in production
- Notify administrators of new feature availability
- **Validation:** Production deployment successful
- **Dependencies:** Task 5.6
- **Estimated time:** 1 hour

## Task Summary

**Total Tasks:** 32
**Estimated Total Time:** 46 hours (~6 working days for one developer)

**Breakdown by Phase:**

- Phase 1 (Backend): 7.5 hours
- Phase 2 (Admin UI): 8.5 hours
- Phase 3 (User UI): 9 hours
- Phase 4 (Testing): 10 hours
- Phase 5 (Documentation & Deployment): 5.5 hours

**Parallelization Opportunities:**

- Phase 1 (Backend) and Phase 2 (Admin UI) can be developed in parallel after initial setup
- Phase 3 (User UI) frontend components can be developed in parallel with Phase 1/2
- Testing tasks can start as soon as individual components are complete

**Critical Path:**
Task 1.1 → Task 1.3 → Task 2.3 → Task 3.3 → Task 3.4 → Task 4.4 → Task 5.6 → Task 5.7

**Dependencies:**

- Frontend depends on backend API completion (Task 1.3, Task 1.4)
- Integration testing depends on all components (Phase 1-3)
- Deployment depends on all testing (Phase 4)
