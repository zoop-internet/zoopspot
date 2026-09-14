.PHONY: all build test lint format clean clean-all help mobile-test mobile-cshared build-android-core build-ios-core test-all dev-cloud dev-web build-web

GO ?= go
BIN_DIR ?= bin

all: build test

build:
	@mkdir -p $(BIN_DIR)
	$(GO) build -v -o $(BIN_DIR)/zoop-cloud ./cloud
	$(GO) build -v -o $(BIN_DIR)/zoop-router ./router
	$(GO) build -v -o $(BIN_DIR)/zoop ./cmd/zoop
	$(GO) build -v -o $(BIN_DIR)/zoopd ./cmd/zoopd

test:
	$(GO) test -v ./...

tests: test

test-all: test mobile-test

integration-tests:
	$(GO) run test/integration/direct_connectivity.go
	$(GO) run test/integration/nat_traversal.go
	$(GO) run test/integration/relay_fallback.go
	$(GO) run test/integration/connection_recovery.go
	$(GO) run test/integration/security_hardening.go
	$(GO) run test/integration/platform_implementations.go
	$(GO) run test/integration/router_integration.go

mobile-test:
	$(GO) test -v ./packages/platform/mobile/...

mobile-cshared:
	@mkdir -p $(BIN_DIR)
	GOOS=android CGO_ENABLED=1 $(GO) build -v -buildmode=c-shared -ldflags="-checklinkname=0" -o $(BIN_DIR)/libzoop.so ./cmd/zoop-mobile

build-android-core:
	@mkdir -p android/app/libs
	gomobile bind -target=android -androidapi 26 -o android/app/libs/zoopcore.aar ./packages/platform/mobile

build-ios-core:
	@mkdir -p ios/Frameworks
	gomobile bind -target=ios -o ios/Frameworks/ZoopCore.xcframework ./packages/platform/mobile

dev-cloud:
	$(GO) run ./cloud

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
	@echo "Zoop Build System"
	@echo "  make build              - Compile all Go binaries into bin/"
	@echo "  make test               - Run all Go unit tests"
	@echo "  make test-all           - Run Go unit tests and mobile binding tests"
	@echo "  make format             - Auto-format Go code using gofmt"
	@echo "  make lint               - Run linters (golangci-lint / go vet)"
	@echo "  make mobile-test        - Run mobile binding tests"
	@echo "  make mobile-cshared     - Build C-shared library (libzoop.so) for native mobile integration"
	@echo "  make build-android-core - Build Android AAR library (zoopcore.aar) using gomobile"
	@echo "  make build-ios-core     - Build iOS XCFramework (ZoopCore.xcframework) using gomobile"
	@echo "  make dev-cloud          - Run Zoop Cloud locally with in-memory store"
	@echo "  make dev-web            - Start local Vite development server for web console"
	@echo "  make build-web          - Compile production web bundle"
	@echo "  make clean              - Remove compiled Go binaries"
	@echo "  make clean-all          - Remove compiled binaries, web dist, and test artifacts"
