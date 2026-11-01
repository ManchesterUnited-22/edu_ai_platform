FROM node:20-slim
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 8000
CMD ["npm", "start"]
