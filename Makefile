# Host Makefile.

include Makefile.include

env-up: env-compose-up env-devcontainer     				## Start devcontainer.

env-compose-up:
	docker-compose pull
	docker-compose up --detach --renew-anon-volumes --remove-orphans

env-devcontainer:
	docker exec -it --workdir=/root/go/src/github.com/percona/pmm pmm-managed-server .devcontainer/setup.py

env-down:                                   ## Stop devcontainer.
	docker-compose down --remove-orphans

env-remove:
	docker-compose down --volumes --remove-orphans


TARGET ?= _bash

env:                                        ## Run `make TARGET` in devcontainer (`make env TARGET=help`); TARGET defaults to bash.
	docker exec -it --workdir=/root/go/src/github.com/percona/pmm pmm-managed-server make $(TARGET)

env-up-ex: env-compose-up-ex env-devcontainer-ex     ## Start with pmm-managed.

env-compose-up-ex:
	docker-compose -f docker-compose.external-managed.yml pull
	docker-compose -f docker-compose.external-managed.yml up --detach --renew-anon-volumes --remove-orphans

env-devcontainer-ex:
	docker exec -it --workdir=/root/go/src/github.com/percona/pmm pmm-managed-server-ex .devcontainer/setup.py

env-ex:                                ## Enter modular devcontainer.
	docker exec -it --workdir=/root/go/src/github.com/percona/pmm pmm-managed-server-ex make $(TARGET)

env-down-ex:                           ## Stop modular devcontainer.
	docker-compose -f docker-compose.external-managed.yml down --remove-orphans

env-remove-ex:
	docker-compose -f docker-compose.external-managed.yml down --volumes --remove-orphans
