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

	# =========================
# TESTING
# =========================
.PHONY: test
test:
	npm run test

.PHONY: test-watch
test-watch:
	npm run test:watch

.PHONY: test-e2e
test-e2e:
	npm run test:e2e

.PHONY: test-cov
test-cov:
	npm run test:cov

.PHONY: test-debug
test-debug:
	node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand

# =========================
# TESTING (Advanced)
# =========================

# Cara pakai: make test-module name=auth
.PHONY: test-module
test-module:
	npm run test -- $(name)

# Cara pakai: make test-module-watch name=auth
.PHONY: test-module-watch
test-module-watch:
	npm run test:watch -- $(name)

# Cara pakai: make test-module-cov name=auth
.PHONY: test-module-cov
test-module-cov:
	npm run test -- $(name) --coverage	