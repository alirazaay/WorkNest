FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY .sequelizerc ./
COPY README.md ./
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "src/server.js"]
