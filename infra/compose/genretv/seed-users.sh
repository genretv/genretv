#!/bin/sh
set -eu

api_url="${GENRETV_INTERNAL_API_URL:-http://envoy:8000}"
secret_key="${GENRETV_SECRET_KEY:?GENRETV_SECRET_KEY is required}"
password="${GENRETV_LOCAL_USER_PASSWORD:-genretv-local-password}"

until curl -fsS "${api_url}/auth/v1/health" >/dev/null; do
  sleep 1
done

create_user() {
  email="$1"
  roles_json="$2"
  body="{\"email\":\"${email}\",\"password\":\"${password}\",\"email_confirm\":true,\"app_metadata\":{\"roles\":${roles_json}}}"

  if curl -fsS -X POST "${api_url}/auth/v1/admin/users" \
    -H "apikey: ${secret_key}" \
    -H "Authorization: Bearer ${secret_key}" \
    -H "Content-Type: application/json" \
    -d "${body}" >/dev/null; then
    echo "Seeded ${email}"
  else
    echo "Skipped ${email}; it may already exist"
  fi
}

create_user "maintainer@genretv.local" "[\"canonical_maintainer\",\"publisher\"]"
create_user "publisher@genretv.local" "[\"publisher\"]"
create_user "import-bot@genretv.local" "[\"publisher\"]"
create_user "user@genretv.local" "[]"

echo "Local user password: ${password}"
