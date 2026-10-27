FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node package.json server.js engine.js cards.json ./
COPY --chown=node:node public ./public
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
