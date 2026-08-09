.PHONY: all build test lint clean help

GO ?= go
BIN_DIR ?= bin

all: build test

build:
	@mkdir -p $(BIN_DIR)
	$(GO) build -v -o $(BIN_DIR)/zoop-agent ./agent
	$(GO) build -v -o $(BIN_DIR)/zoop-cloud ./cloud
	$(GO) build -v -o $(BIN_DIR)/zoop-router ./router

test:
	$(GO) test -v ./...

lint:
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run ./...; \
	else \
		$(GO) vet ./...; \
	fi

clean:
	rm -rf $(BIN_DIR)
	$(GO) clean

help:
	@echo "Zoop Build System"
	@echo "  make build  - Compile all Go binaries into bin/"
	@echo "  make test   - Run unit test suites"
	@echo "  make lint   - Run linters (golangci-lint / go vet)"
	@echo "  make clean  - Remove built binaries and caches"
