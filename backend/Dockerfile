FROM node:22-alpine

WORKDIR /app

# Függőségek másolása és telepítése
COPY package*.json ./
RUN npm install

# Prisma kliens generálása
COPY prisma ./prisma/
RUN npx prisma generate

# Teljes forráskód átmásolása
COPY . .

EXPOSE 3000

# Közvetlenül a te TSX-alapú dev scriptedet futtatjuk, nincs szükség buildelésre!
CMD ["npm", "run", "dev"]