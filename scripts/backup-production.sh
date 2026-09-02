#!/usr/bin/env bash
set -Eeuo pipefail

project_dir=${1:?"Falta PROJECT_DIR"}
backend_container=${2:?"Falta BACKEND_CONTAINER"}
backup_root="${project_dir}/backups"
timestamp=$(date -u +%Y%m%d_%H%M%S)
backup_dir="${backup_root}/${timestamp}"

mkdir -p "${backup_dir}"
cd "${project_dir}"

if docker ps --format '{{.Names}}' | grep -Fxq "${backend_container}"; then
  docker exec "${backend_container}" sh -c \
    'cd /app && tar -czf - uploads $(test -d private_uploads && printf private_uploads)' \
    > "${backup_dir}/storage.tar.gz"
  test -s "${backup_dir}/storage.tar.gz"
else
  echo "Primer despliegue: no existe un contenedor backend para respaldar."
fi

db_container=$(docker compose ps -q db)
if [[ -n "${db_container}" ]]; then
  docker compose exec -T db sh -eu -c '
    database=${MYSQL_DATABASE:-${MARIADB_DATABASE:-}}
    username=${MYSQL_USER:-${MARIADB_USER:-root}}
    password=${MYSQL_PASSWORD:-${MARIADB_PASSWORD:-${MYSQL_ROOT_PASSWORD:-${MARIADB_ROOT_PASSWORD:-}}}}
    dump_bin=$(command -v mariadb-dump || command -v mysqldump)
    test -n "$database"
    export MYSQL_PWD="$password"
    exec "$dump_bin" --single-transaction --quick --routines --triggers "$database"
  ' > "${backup_dir}/database.sql"
  test -s "${backup_dir}/database.sql"
elif docker ps -a --format '{{.Names}}' | grep -Fxq "${backend_container}"; then
  echo "No se encontró el servicio db; se cancela para no desplegar sin respaldo." >&2
  exit 1
else
  echo "Primer despliegue: no existe una base de datos para respaldar."
fi

find "${backup_dir}" -type f -exec sha256sum {} + > "${backup_dir}/SHA256SUMS"
while IFS= read -r expired_backup; do
  [[ "${expired_backup}" == "${backup_root}/"* ]] || continue
  rm -rf -- "${expired_backup}"
done < <(
  find "${backup_root}" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
    | sort -nr | tail -n +11 | cut -d' ' -f2-
)

echo "Respaldo verificado: ${backup_dir}"
