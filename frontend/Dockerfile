FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

RUN ls -la
RUN cat .env.production || true

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]