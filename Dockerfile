ARG NODE_VERSION=18.20.3
FROM node:${NODE_VERSION}-bullseye

ARG NODE_ENV
ARG MODEL_URL
ARG FIRESTORE_DATABASE_ID

ENV NODE_ENV=NODE_ENV
ENV MODEL_URL=MODEL_URL
ENV FIRESTORE_DATABASE_ID=FIRESTORE_DATABASE_ID

RUN apt-get update && apt-get install -y \
    libc6 \
    libgcc1 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY . .

RUN npm install

EXPOSE 3000

CMD npm start