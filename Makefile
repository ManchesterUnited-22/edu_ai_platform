up:
	docker compose up -d --build

down:
	docker compose down

migrate:
	cd backend && npx prisma migrate dev

seed:
	cd backend && npm run seed

test:
	cd backend && npm test

eval:
	cd backend && npm run eval

graph-up:
	docker compose --profile graph up -d --build

graph-rebuild:
	cd backend && npm run graph:rebuild
