.PHONY: all build test tests format lint clean clean-all help dev-cloud dev-web build-web integration-tests

GO ?= go
BIN_DIR ?= bin

all: build test

build:
	@mkdir -p $(BIN_DIR)
	$(GO) build -v -o $(BIN_DIR)/zoopspot-cloud ./cmd/zoopspot-cloud
	$(GO) build -v -o $(BIN_DIR)/zoopspot-router ./cmd/zoopspot-router

test:
	$(GO) test -v ./...

tests: test

integration-tests:
	$(GO) run test/integration/direct_connectivity.go
	$(GO) run test/integration/nat_traversal.go
	$(GO) run test/integration/relay_fallback.go
	$(GO) run test/integration/connection_recovery.go
	$(GO) run test/integration/security_hardening.go
	$(GO) run test/integration/router_integration.go

dev-cloud:
	$(GO) run ./cmd/zoopspot-cloud

dev-web:
	cd web && npm run dev

build-web:
	cd web && npm run build

format:
	gofmt -s -w .

lint:
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run ./...; \
	else \
		$(GO) vet ./...; \
	fi

clean:
	rm -rf $(BIN_DIR)
	$(GO) clean

clean-all: clean
	rm -rf web/dist web/build coverage.txt *.out

help:
	@echo "ZoopSpot Build System"
	@echo "  make build              - Compile zoopspot-cloud and zoopspot-router into bin/"
	@echo "  make test               - Run all Go unit and integration tests"
	@echo "  make format             - Auto-format Go code using gofmt"
	@echo "  make lint               - Run linters (golangci-lint / go vet)"
	@echo "  make dev-cloud          - Run ZoopSpot Cloud locally with in-memory store"
	@echo "  make dev-web            - Start local Vite development server for web console"
	@echo "  make build-web          - Compile production web bundle"
	@echo "  make clean              - Remove compiled Go binaries"
	@echo "  make clean-all          - Remove compiled binaries, web dist, and test artifacts"
