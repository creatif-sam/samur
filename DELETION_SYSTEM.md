# Account & Data Deletion System

This system implements GDPR-compliant account and data deletion features for the Espirito PWA.

## Overview

Users can request deletion of:
1. **Complete Account** - Permanently deletes all user data and account access
2. **Specific Data Types** - Selectively delete certain data categories while keeping the account active

## Components

### Pages

#### 1. Delete Account Page (`/protected/delete-account`)
- Requires user to enter and confirm their full name
- Shows comprehensive warning about data loss
- Submits deletion request to the database
- Logs user out after successful submission
- **Path**: `app/protected/delete-account/page.tsx`

#### 2. Delete Specific Data Page (`/protected/delete-data`)
- Allows users to select which data types to delete:
  - Goals & Progress
  - Posts & Comments
  - Meditations
  - Planner Data
  - Notes & ThoughtBook
  - Profile Picture
- Shows warnings for selected items
- Submits request and redirects to profile
- **Path**: `app/protected/delete-data/page.tsx`

#### 3. Profile Page Integration
- Added "Account & Data Management" section
- Two buttons: "Delete Specific Data" and "Delete My Account"
- AlertDialog confirms intent before redirecting
- **Path**: `app/protected/profile/page.tsx`

### API Routes

#### 1. Delete Account API (`/api/delete-account`)
- **Method**: POST
- **Body**: `{ full_name: string, user_id: string }`
- **Authentication**: Verifies user is logged in and matches user_id
- **Action**: Creates a deletion request in the database
- **Path**: `app/api/delete-account/route.ts`

#### 2. Delete Data API (`/api/delete-data`)
- **Method**: POST
- **Body**: `{ user_id: string, data_types: string[] }`
- **Authentication**: Verifies user is logged in and matches user_id
- **Action**: Creates a data deletion request in the database with specified data types
- **Path**: `app/api/delete-data/route.ts`

### Database

#### Table: `deletion_requests`

**Schema** (`sql/deletion_requests.sql`):
```sql
CREATE TABLE deletion_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  deletion_type TEXT NOT NULL,  -- 'account' or 'data'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'cancelled'
  requested_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  data_types JSONB,  -- For specific data deletion
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**RLS Policies**:
- Users can view their own deletion requests
- Users can create their own deletion requests
- Users can update their own pending requests

## Installation

### 1. Create the Database Table

Run the SQL script in your Supabase SQL editor:
```bash
# In Supabase Dashboard > SQL Editor
# Run: sql/deletion_requests.sql
```

Or via Supabase CLI:
```bash
supabase db push
```

### 2. Verify Components

Ensure the following UI components exist in `components/ui/`:
- alert.tsx
- alert-dialog.tsx
- button.tsx
- card.tsx
- checkbox.tsx
- input.tsx
- label.tsx

## User Flow

### Account Deletion Flow
1. User clicks "Delete My Account" on profile page
2. AlertDialog confirms intent
3. User redirected to `/protected/delete-account`
4. User enters name twice for confirmation
5. System validates name match
6. Deletion request submitted to database
7. User logged out and redirected to home page
8. Admin processes deletion within 30 days (GDPR requirement)

### Data Deletion Flow
1. User clicks "Delete Specific Data" on profile page
2. AlertDialog confirms intent
3. User redirected to `/protected/delete-data`
4. User selects data types to delete via checkboxes
5. System shows warnings for selected items
6. Deletion request submitted to database
7. User redirected back to profile
8. Admin processes deletion within 7-30 days

## Processing Deletion Requests

Deletion requests are stored in the `deletion_requests` table with status "pending". To process them:

### Manual Processing
1. Query pending requests:
```sql
SELECT * FROM deletion_requests WHERE status = 'pending';
```

2. For account deletions:
```sql
-- Delete user data from all tables
-- Then update the request:
UPDATE deletion_requests 
SET status = 'completed', processed_at = NOW() 
WHERE id = '<request_id>';
```

3. For data deletions:
```sql
-- Check data_types JSONB field
-- Delete specified data types
-- Then update the request
UPDATE deletion_requests 
SET status = 'processing', processed_at = NOW() 
WHERE id = '<request_id>';
```

### Automated Processing (Recommended)
Create a scheduled job (Supabase Edge Function or cron job) to:
1. Query pending requests
2. Delete data based on deletion_type and data_types
3. Update status to 'completed'
4. Send confirmation email to user

## GDPR Compliance

This system complies with GDPR requirements:
- **Right to Erasure (Article 17)**: Users can request deletion of their data
- **Transparency**: Clear information about what will be deleted
- **Verification**: Name confirmation prevents accidental deletion
- **Audit Trail**: All deletion requests are logged with timestamps
- **Processing Timeline**: Requests processed within 30 days

## Future Enhancements

1. **Email Notifications**: Send confirmation emails when request is submitted and completed
2. **Admin Dashboard**: Create an admin interface to review and process deletion requests
3. **Automated Processing**: Implement background jobs to automatically process deletions
4. **Data Export**: Add option to export data before deletion
5. **Cancellation**: Allow users to cancel pending deletion requests
6. **Grace Period**: Implement a 7-day grace period before permanent deletion

## Support

For issues or questions, contact: support@espirito.app
