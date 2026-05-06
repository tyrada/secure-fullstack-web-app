# Security Decisions

## Server-side validation

All form fields are validated on the server. This protects the app even if a user bypasses browser validation.

## Input normalization

Email addresses are trimmed and lowercased before storage to reduce duplicate records and improve consistency.

## Access control

The admin page requires an admin key stored in an environment variable. This is basic demo access control, not production-grade authentication.

## Security headers

Helmet is used to add common HTTP security headers.

## Rate limiting

Requests are limited to reduce simple abuse and repeated form submissions.

## Output encoding

HTML output uses escaping to reduce the risk of reflected or stored XSS in the demo admin table.

## Database safety

Prepared statements are used for inserts and reads.
