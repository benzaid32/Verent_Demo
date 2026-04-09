FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./package.json
COPY backend/package*.json ./backend/
RUN npm --prefix backend ci
RUN ln -s /app/backend/node_modules /app/node_modules

COPY shared ./shared
COPY backend ./backend
RUN npm --prefix backend run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/backend/package*.json ./backend/
RUN npm --prefix backend ci --omit=dev
COPY --from=build /app/backend/dist ./backend/dist

EXPOSE 4000
CMD ["node", "backend/dist/backend/src/server.js"]
