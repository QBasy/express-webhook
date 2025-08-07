node:20-alpine

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 6005

CMD ["npm run start"]
