\set postgres_password `echo "$POSTGRES_PASSWORD"`

ALTER ROLE supabase_auth_admin WITH LOGIN PASSWORD :'postgres_password';
ALTER SCHEMA auth OWNER TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
