FROM node:22-alpine

WORKDIR /app

# Prisma fájlok és függőségek másolása még az install előtt,
# mert a postinstall futtatja a `prisma generate` parancsot.
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Függőségek másolása és telepítése
COPY package*.json ./
RUN npm install

# Teljes forráskód átmásolása
COPY . .

EXPOSE 3000

# Közvetlenül a te TSX-alapú dev scriptedet futtatjuk, nincs szükség buildelésre!
CMD ["npm", "run", "dev"]