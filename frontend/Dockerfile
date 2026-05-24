FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite build futtatása
RUN npm run build

# Egy könnyű webszerver (serve) telepítése a buildelt fájlok kiszolgálására
RUN npm install -g serve

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]