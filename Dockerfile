FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY data/ ./data/
COPY scripts/ ./scripts/
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
