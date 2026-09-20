#!/usr/bin/env bash
# Trusted host-side script. Run as root, not from the downloaded artifact.
set -Eeuo pipefail
umask 077
archive=${1:?Usage: bash deploy-frontend.sh /absolute/path/package.tgz}
deploy=/opt/cxj-blog/deploy
base="$deploy/docker-compose.prod.yml"
backend_override="$deploy/docker-compose.flow.yml"
override="$deploy/docker-compose.frontend.flow.yml"
for tool in docker python3 sha256sum flock mktemp; do command -v "$tool" >/dev/null; done
test -f "$archive" && test -f "$base" && test -f "$deploy/.env"
cd "$deploy"
exec 9>"$deploy/.deployment.lock"
flock -w 600 9
dc=(docker compose --project-directory "$deploy" --env-file "$deploy/.env" -f "$base")
if test -f "$backend_override"; then dc+=(-f "$backend_override"); fi
if test -f "$override"; then dc+=(-f "$override"); fi
"${dc[@]}" config --quiet
frontend_id=$("${dc[@]}" ps -q frontend)
test -n "$frontend_id" || { echo 'Existing frontend required for rollback.' >&2; exit 1; }
old_image=$(docker inspect --format '{{.Image}}' "$frontend_id")
for service in backend nginx; do
  id=$("${dc[@]}" ps -q "$service")
  test -n "$id" && test "$(docker inspect --format '{{.State.Running}}' "$id")" = true
done
mkdir -p "$deploy/releases"
release=$(mktemp -d "$deploy/releases/frontend-XXXXXXXX")
# Only regular static files/directories. Reject links, traversal and oversized archives.
python3 - "$archive" "$release/site" <<'PY'
import pathlib, shutil, sys, tarfile
source, destination = sys.argv[1:]
root = pathlib.Path(destination)
root.mkdir(mode=0o755)
with tarfile.open(source, 'r:gz') as archive:
    entries = []
    paths = set()
    size = 0
    for item in archive:
        path = pathlib.PurePosixPath(item.name)
        if path.is_absolute() or '..' in path.parts or '\\' in item.name:
            raise ValueError('Unsafe archive path')
        if not (item.isfile() or item.isdir()):
            raise ValueError('Only regular files and directories are allowed')
        if path in paths:
            raise ValueError('Duplicate archive path')
        paths.add(path)
        size += item.size
        entries.append((item, path))
        if len(entries) > 20000 or size > 512 * 1024 * 1024:
            raise ValueError('Artifact exceeds deployment limits')
    if not any(path.as_posix() == 'index.html' and item.isfile() and item.size > 0 for item, path in entries):
        raise ValueError('Artifact root must contain index.html; do not include dist directory')
    for item, path in entries:
        target = root.joinpath(*path.parts)
        target.parent.mkdir(parents=True, exist_ok=True)
        if item.isdir():
            target.mkdir(exist_ok=True)
        else:
            with archive.extractfile(item) as incoming, target.open('xb') as output:
                shutil.copyfileobj(incoming, output)
    for path in root.rglob('*'):
        path.chmod(0o755 if path.is_dir() else 0o644)
PY
digest=$(sha256sum "$archive"); digest=${digest%% *}
index_digest=$(sha256sum "$release/site/index.html"); index_digest=${index_digest%% *}
new_image="cxj-blog-frontend:flow-$digest"
cat > "$release/default.conf" <<'NGINX'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location = /index.html { add_header Cache-Control "no-cache"; }
    location ~* \.(?:css|js|mjs|svg|png|jpg|jpeg|gif|ico|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
        try_files $uri =404;
    }
}
NGINX
cat > "$release/Dockerfile" <<'DOCKERFILE'
FROM nginx:1.27-alpine
COPY default.conf /etc/nginx/conf.d/default.conf
COPY site/ /usr/share/nginx/html/
RUN chmod 644 /etc/nginx/conf.d/default.conf && nginx -t
EXPOSE 80
DOCKERFILE
docker build -t "$new_image" "$release"
write_override() {
  local tmp
  tmp=$(mktemp "$deploy/.frontend-flow-XXXXXXXX")
  printf 'services:\n  frontend:\n    image: "%s"\n' "$1" > "$tmp"
  mv "$tmp" "$override"
}
dc=(docker compose --project-directory "$deploy" --env-file "$deploy/.env" -f "$base")
if test -f "$backend_override"; then dc+=(-f "$backend_override"); fi
dc+=(-f "$override")
healthy() {
  local attempt
  for ((attempt=0; attempt<24; attempt++)); do
    if "${dc[@]}" exec -T nginx wget -T 5 -qO- http://frontend/index.html > "$release/health.html"; then
      if test -s "$release/health.html"; then
        if test -z "${1:-}"; then return 0; fi
        local actual
        actual=$(sha256sum "$release/health.html"); actual=${actual%% *}
        if test "$actual" = "$1"; then return 0; fi
      fi
    fi
    sleep 5
  done
  return 1
}
reload_nginx() {
  "${dc[@]}" exec -T nginx nginx -t && "${dc[@]}" exec -T nginx nginx -s reload
}
rollback() {
  local result=$?
  trap - ERR
  set +e
  "${dc[@]}" logs --no-color --tail 150 frontend >&2
  echo 'Frontend deployment failed; restoring previous image.' >&2
  write_override "$old_image"
  "${dc[@]}" up -d --no-deps --no-build --pull never frontend
  if healthy && reload_nginx; then
    echo 'Previous frontend restored and healthy; pipeline still fails.' >&2
  else
    echo 'Rollback failed; manual intervention required.' >&2
  fi
  exit "$result"
}
trap rollback ERR
write_override "$new_image"
"${dc[@]}" config --quiet
"${dc[@]}" up -d --no-deps --no-build --pull never frontend
healthy "$index_digest"
reload_nginx
trap - ERR
printf 'FRONTEND_DEPLOY_SUCCESS image=%s\n' "$new_image"
