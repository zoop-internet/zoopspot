.PHONY: all build test lint clean help mobile-test mobile-cshared

GO ?= go
BIN_DIR ?= bin

all: build test

build:
	@mkdir -p $(BIN_DIR)
	$(GO) build -v -o $(BIN_DIR)/zoop-agent ./agent
	$(GO) build -v -o $(BIN_DIR)/zoop-cloud ./cloud
	$(GO) build -v -o $(BIN_DIR)/zoop-router ./router
	$(GO) build -v -o $(BIN_DIR)/zoop ./cmd/zoop
	$(GO) build -v -o $(BIN_DIR)/zoopd ./cmd/zoopd
	$(GO) build -v -o $(BIN_DIR)/zoop-desktop ./desktop

desktop-build:
	@cd desktop/frontend && npx vite build
	@mkdir -p $(BIN_DIR)
	$(GO) build -v -o $(BIN_DIR)/zoop-desktop ./desktop


test:
	$(GO) test -v ./...

mobile-test:
	$(GO) test -v ./packages/platform/mobile/...

mobile-cshared:
	@mkdir -p $(BIN_DIR)
	CGO_ENABLED=1 $(GO) build -v -buildmode=c-shared -o $(BIN_DIR)/libzoop.so ./cmd/zoop-mobile

build-android-core:
	@mkdir -p android/app/libs
	gomobile bind -target=android -androidapi 26 -o android/app/libs/zoopcore.aar ./packages/platform/mobile

build-ios-core:
	@mkdir -p ios/Frameworks
	gomobile bind -target=ios -o ios/Frameworks/ZoopCore.xcframework ./packages/platform/mobile

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
	@echo "  make build              - Compile all Go binaries into bin/"
	@echo "  make desktop-build      - Build desktop frontend and compile zoop-desktop (Wails binary)"
	@echo "  make test               - Run unit test suites"
	@echo "  make mobile-test        - Run mobile binding tests"
	@echo "  make mobile-cshared     - Build C-shared library (libzoop.so) for native mobile integration"
	@echo "  make build-android-core - Build Android AAR library (zoopcore.aar) using gomobile"
	@echo "  make build-ios-core     - Build iOS XCFramework (ZoopCore.xcframework) using gomobile"
	@echo "  make lint               - Run linters (golangci-lint / go vet)"
	@echo "  make clean              - Remove built binaries and caches"

