# =========================
# ENV
# =========================
include .env
export


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
	docker-compose up -d mysql

.PHONY: docker-infra-stop
docker-infra-stop:
	docker-compose stop mysql

.PHONY: docker-logs
docker-logs:
	docker-compose logs -f