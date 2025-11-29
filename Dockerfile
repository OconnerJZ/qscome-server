FROM node:22

WORKDIR /app

# Instalar netcat (para wait-for-db.sh)
RUN apt-get update && apt-get install -y netcat-openbsd curl && rm -rf /var/lib/apt/lists/*

# Copiar dependencias
COPY package*.json ./

# Instalar TODAS las dependencias (prod + dev) para compilar TS
RUN npm ci

# Copiar código fuente
COPY src ./src
COPY server.ts .
COPY tsconfig.json .

# Compilar TS a JS
RUN npx tsc

# Verificar que la compilación fue exitosa
RUN ls -la dist/ && test -f dist/server.js || (echo "Error: dist/server.js no fue generado" && exit 1)


# Eliminar devDependencies para producción (reduce tamaño)
RUN npm prune --production

# Crear carpeta para uploads con permisos correctos
RUN mkdir -p /app/uploads && \
    adduser --system --group appuser && \
    chown -R appuser:appuser /app

# Copiar script de espera
COPY wait-for-db.sh /app/wait-for-db.sh
RUN chmod +x /app/wait-for-db.sh

# Cambiar a usuario no-root
USER appuser

EXPOSE 3000

# Ejecutar JS compilado
CMD ["/app/wait-for-db.sh", "db", "node", "dist/server.js"]