# Spec: QR Code Management

**Capability:** `qr-code-management`
**Related to:** `add-user-support-qr-buttons`

## Overview

This capability enables administrators to manage QR code images for customer service and Xianyu store buttons displayed on the user dashboard. Users can view these QR codes through animated hover/click interactions in the navigation bar.

## ADDED Requirements

### Requirement: Admin QR Code Management API

The system SHALL provide dedicated API endpoints that allow administrators to create, read, update, and delete QR code configurations.

#### Scenario: Upload new QR code image

**Given** an administrator is authenticated with valid admin credentials
**And** the administrator has a QR code image file (PNG, JPG, or JPEG format)
**And** the image file size is less than 500KB
**When** the administrator uploads the image via `POST /admin/qr-codes` with fields:

- `type` (string): Either "customer_service" or "xianyu_store"
- `image` (file): The QR code image file
  **Then** the system converts the image to Base64 encoding
  **And** stores the QR code data in Redis with key pattern `qr_code:{type}`
  **And** records metadata including `updatedAt` timestamp and `updatedBy` admin ID
  **And** returns HTTP 201 with the created QR code object containing:
- `type`: The QR code type
- `base64Data`: The Base64-encoded image string
- `updatedAt`: ISO 8601 timestamp
- `updatedBy`: Admin username
  **And** the QR code becomes immediately available to users

#### Scenario: Upload QR code with invalid format

**Given** an administrator is authenticated with valid admin credentials
**When** the administrator attempts to upload a file that is not PNG, JPG, or JPEG
**Then** the system returns HTTP 400 with error message "Invalid image format. Only PNG, JPG, and JPEG are supported."
**And** no data is stored in Redis

#### Scenario: Upload QR code exceeding size limit

**Given** an administrator is authenticated with valid admin credentials
**When** the administrator attempts to upload an image larger than 500KB
**Then** the system returns HTTP 400 with error message "Image size exceeds maximum allowed size of 500KB."
**And** no data is stored in Redis

#### Scenario: Retrieve existing QR code

**Given** a QR code of type "customer_service" exists in the system
**When** an administrator requests `GET /admin/qr-codes/customer_service`
**Then** the system returns HTTP 200 with the QR code object containing:

- `type`: "customer_service"
- `base64Data`: The Base64-encoded image string
- `updatedAt`: ISO 8601 timestamp of last update
- `updatedBy`: Username of admin who last updated

#### Scenario: Retrieve non-existent QR code

**Given** no QR code of type "xianyu_store" exists in the system
**When** an administrator requests `GET /admin/qr-codes/xianyu_store`
**Then** the system returns HTTP 404 with error message "QR code not found."

#### Scenario: Update existing QR code

**Given** a QR code of type "customer_service" exists in the system
**And** an administrator is authenticated with valid admin credentials
**When** the administrator uploads a new image via `PUT /admin/qr-codes/customer_service`
**Then** the system replaces the existing Base64 data with the new image
**And** updates the `updatedAt` timestamp to current time
**And** updates the `updatedBy` field to the current admin's username
**And** returns HTTP 200 with the updated QR code object
**And** users immediately see the new QR code without page refresh

#### Scenario: Delete QR code

**Given** a QR code of type "xianyu_store" exists in the system
**And** an administrator is authenticated with valid admin credentials
**When** the administrator sends `DELETE /admin/qr-codes/xianyu_store`
**Then** the system removes the QR code from Redis
**And** returns HTTP 204 with no content
**And** users no longer see the Xianyu store button on the dashboard

#### Scenario: List all QR codes

**Given** two QR codes exist in the system ("customer_service" and "xianyu_store")
**And** an administrator is authenticated with valid admin credentials
**When** the administrator requests `GET /admin/qr-codes`
**Then** the system returns HTTP 200 with an array containing both QR code objects
**And** each object includes `type`, `base64Data`, `updatedAt`, and `updatedBy` fields
**And** QR codes are sorted alphabetically by type

#### Scenario: Unauthorized access to QR code management

**Given** a user is authenticated as a regular user (not admin)
**When** the user attempts to access any QR code management endpoint
**Then** the system returns HTTP 403 with error message "Admin access required."
**And** no QR code data is returned or modified

### Requirement: User QR Code Display

The system SHALL display interactive buttons in the user dashboard navigation bar that allow users to view QR codes.

#### Scenario: Load user dashboard with available QR codes

**Given** both "customer_service" and "xianyu_store" QR codes exist in the system
**And** a user is authenticated and viewing the user dashboard
**When** the dashboard loads
**Then** the system displays two icon buttons in the navigation bar, left of the Logout button:

- Customer service button with a headset or chat icon
- Xianyu store button with a shopping or store icon
  **And** both buttons are styled consistently with the existing theme (light/dark mode)

#### Scenario: Hover over QR code button on desktop

**Given** a user is viewing the dashboard on a desktop device
**And** the "customer_service" QR code exists
**When** the user hovers their mouse over the customer service button
**Then** a popover appears above the button with smooth fade-in animation (200ms)
**And** the popover displays the QR code image decoded from Base64
**And** the popover includes a label "Customer Service"
**When** the user moves the mouse away from the button
**Then** the popover fades out with smooth animation (200ms)
**And** the popover is removed from the DOM after animation completes

#### Scenario: Click QR code button on mobile

**Given** a user is viewing the dashboard on a mobile device
**And** the "xianyu_store" QR code exists
**When** the user taps the Xianyu store button
**Then** a modal dialog appears with slide-up animation (300ms)
**And** the modal displays the QR code image at an appropriate size for scanning
**And** the modal includes a title "Xianyu Store" and a close button
**When** the user taps the close button or outside the modal
**Then** the modal slides down and closes (300ms)
**And** the user returns to the normal dashboard view

#### Scenario: Missing QR code configuration

**Given** the "customer_service" QR code has been deleted by an administrator
**And** a user is viewing the user dashboard
**When** the dashboard loads
**Then** the customer service button does not appear in the navigation bar
**And** only the Xianyu store button appears (if it exists)

#### Scenario: Public QR code retrieval endpoint

**Given** a QR code of type "customer_service" exists in the system
**And** a user is authenticated (regular user or admin)
**When** the user's browser requests `GET /api/qr-codes`
**Then** the system returns HTTP 200 with an array of available QR code objects
**And** each object includes only `type` and `base64Data` fields (no metadata)
**And** this endpoint does not require admin privileges

### Requirement: Theme Compatibility

All QR code UI components SHALL support both light and dark themes seamlessly.

#### Scenario: Display QR code buttons in light mode

**Given** the user has selected light theme
**And** QR codes exist in the system
**When** the user dashboard loads
**Then** the QR code buttons use light theme colors:

- Button background: `text-gray-600 hover:text-gray-900`
- Popover background: `bg-white border-gray-200`
- Text color: `text-gray-900`

#### Scenario: Display QR code buttons in dark mode

**Given** the user has selected dark theme
**And** QR codes exist in the system
**When** the user dashboard loads
**Then** the QR code buttons use dark theme colors:

- Button background: `text-gray-400 hover:text-gray-200`
- Popover background: `bg-gray-800 border-gray-700`
- Text color: `text-white`

#### Scenario: Switch theme with QR code popover open

**Given** the user is viewing a QR code popover in light mode
**When** the user switches to dark theme via the theme toggle
**Then** the popover immediately updates to dark theme colors
**And** the QR code image remains clearly visible
**And** no layout shift or flickering occurs

### Requirement: Responsive Design

QR code display SHALL adapt to different screen sizes and input methods.

#### Scenario: Desktop responsive behavior (width ≥ 1024px)

**Given** the user is viewing the dashboard on a desktop device with width ≥ 1024px
**When** the user interacts with QR code buttons
**Then** hover interactions are enabled with popovers
**And** QR codes are displayed at 200x200px size
**And** buttons are spaced 8px apart in the navigation bar

#### Scenario: Tablet responsive behavior (768px ≤ width < 1024px)

**Given** the user is viewing the dashboard on a tablet device with 768px ≤ width < 1024px
**When** the user taps QR code buttons
**Then** modal dialogs are shown instead of popovers
**And** QR codes are displayed at 250x250px size
**And** buttons are spaced 6px apart in the navigation bar

#### Scenario: Mobile responsive behavior (width < 768px)

**Given** the user is viewing the dashboard on a mobile device with width < 768px
**When** the user taps QR code buttons
**Then** full-screen modal dialogs are shown
**And** QR codes are displayed at 300x300px size for easy scanning
**And** buttons are displayed with icon-only (no text labels) to save space
**And** buttons are spaced 4px apart in the navigation bar

### Requirement: Data Persistence

QR code data SHALL be reliably stored in and retrieved from Redis.

#### Scenario: Store QR code in Redis

**Given** an administrator uploads a QR code for "customer_service"
**When** the system processes the upload
**Then** a Redis key `qr_code:customer_service` is created
**And** the value is a JSON string containing:

```json
{
  "type": "customer_service",
  "base64Data": "data:image/png;base64,iVBORw0KG...",
  "updatedAt": "2025-11-12T10:30:00.000Z",
  "updatedBy": "admin"
}
```

**And** the key has no expiration (persists until explicitly deleted)

#### Scenario: Retrieve QR code from Redis

**Given** a QR code exists with key `qr_code:xianyu_store`
**When** a user dashboard loads and requests QR codes
**Then** the system executes `GET qr_code:xianyu_store` in Redis
**And** parses the JSON value into a QR code object
**And** returns the object to the frontend
**And** the operation completes in less than 50ms

#### Scenario: Handle Redis connection failure gracefully

**Given** Redis connection is temporarily unavailable
**When** a user attempts to view QR codes
**Then** the system logs the error with Winston logger
**And** returns HTTP 503 with error message "Service temporarily unavailable"
**And** the user dashboard displays a friendly error message
**And** other dashboard functionality remains operational

## MODIFIED Requirements

None - this is a new capability with no modifications to existing requirements.

## REMOVED Requirements

None - no existing requirements are removed by this change.
