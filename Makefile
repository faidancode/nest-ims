# =========================
# ENV
# =========================
include .env
export

# =========================
# APP & DEV
# =========================
.PHONY: run
run:
	npm run start:dev

.PHONY: build
build:
	npm run build

.PHONY: install
install:
	npm install

.PHONY: lint
lint:
	npm run lint

# =========================
# TYPEORM / MIGRATIONS
# =========================
# Cara pakai: make migration-create name=CreateUserTable
.PHONY: migration-create
migration-create:
	npm run typeorm:create-migration -- ./migrations/$(name)

.PHONY: migration-run
migration-run:
	npm run typeorm:run-migrations

.PHONY: migration-revert
migration-revert:
	npm run typeorm:revert-migrations

# =========================
# DOCKER
# =========================
.PHONY: docker-up
docker-up:
	docker-compose up -d --build

.PHONY: docker-down
docker-down:
	docker-compose down

.PHONY: docker-stop
docker-stop:
	docker-compose stop 

.PHONY: docker-infra
docker-infra:
	docker-compose up -d db

.PHONY: docker-infra-stop
docker-infra-stop:
	docker-compose stop db

.PHONY: docker-logs
docker-logs:
	docker-compose logs -f

# =========================
# UTILS
# =========================
.PHONY: clean
clean:
	rm -rf dist node_modules