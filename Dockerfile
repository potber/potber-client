ARG NODE_IMAGE=node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:alpine@sha256:a6c3ec0c0d249d68b0682df854d4a9e222b90fb607dc3fcf2f1d2fcbc85d347e

FROM ${NODE_IMAGE} AS build
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

COPY .ember-cli babel.config.mjs ember-cli-build.js index.html jsconfig.json tsconfig.json vite.config.mjs ./
COPY app ./app
COPY config ./config
COPY public ./public
COPY translations ./translations
COPY types ./types
RUN npm run build

FROM ${NGINX_IMAGE} AS runtime
COPY ./.nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

USER 1000

EXPOSE 8080
ENTRYPOINT ["nginx", "-g", "daemon off;"]
