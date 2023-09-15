FROM node:18-slim

RUN mkdir /app
RUN chown node:node /app
COPY --chown=node:node ./ /app/
WORKDIR /app
RUN npx playwright install --with-deps firefox
USER node
RUN npm install --silent
RUN npx playwright install
ENTRYPOINT npm start
