# Authentication

The data structure includes:
- Anonymous Users:
  - Auth cookie
  - Backup code

- Users:
  - Auth cookie
  - Backup code
  - Email (for future logins)
  - Other fields

Potential Users can migrate to full user.
Data for both potential and full users must be stored in the same table so they can function the same.
Anonymous users can only log back in with backup code - on a different device or after cookie expiry, etc.
Anonymous users can migrate to a complete user account by adding their email.


Upon landing page, user can:
- Continue without account
- Log in to existing account

Continuing without account will:
- Create an authenticated "Anonymous user".
- Log in the user with a cookie.