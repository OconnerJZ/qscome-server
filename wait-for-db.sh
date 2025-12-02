#!/bin/sh
# Script para esperar a que MySQL esté listo

set -e

host="$1"
shift
cmd="$@"

echo "Esperando a que MySQL esté listo en $host..."

until nc -z "$host" 3306; do
  >&2 echo "MySQL no está listo - esperando..."
  sleep 2
done

>&2 echo "MySQL está listo - ejecutando comando"
exec $cmd
