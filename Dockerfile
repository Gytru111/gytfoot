FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm install
RUN npm run build
CMD ["npm", "start"]
