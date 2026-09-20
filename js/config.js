/* Supabase connection for পছন্দ.
 *
 * These two values are meant to be public. The anon key carries the "anon"
 * role, and what it may touch is decided by the row level security rules in
 * supabase/02_security.sql, not by keeping the key secret.
 *
 * Never put the service_role key or the database password in this file.
 */
window.SUPABASE = {
  url: 'https://slnmhiiwuudqqxnkqusk.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsbm1oaWl3dXVkcXF4bmtxdXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDExODUsImV4cCI6MjEwNTQ3NzE4NX0.6P_VwyyNlRMSOv3lIdqSAqlDVS_Dd_E9jsWtcLTsw7g',
  /* A sleeping free-tier project must not hold the page hostage. */
  timeoutMs: 4000
};
