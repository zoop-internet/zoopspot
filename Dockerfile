# ==============================================================================
# Multi-stage Dockerfile for Zoop Internet
# Builds all core binaries from source and packages them into a lightweight Alpine image
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Binaries
# ------------------------------------------------------------------------------
FROM golang:1.25-alpine AS builder

WORKDIR /src

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Cache Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source tree and compile binaries
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/zoopspot-cloud ./cmd/zoopspot-cloud && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/zoopspot-router ./cmd/zoopspot-router

# ------------------------------------------------------------------------------
# Stage 2: Minimal Runtime Image
# ------------------------------------------------------------------------------
FROM alpine:3.21

# Install network utilities required for WireGuard TUN allocation and routing
RUN apk add --no-cache iproute2 iptables ip6tables ca-certificates tzdata curl

# Copy compiled binaries from builder stage
COPY --from=builder /out/zoopspot-cloud /usr/local/bin/zoopspot-cloud
COPY --from=builder /out/zoopspot-router /usr/local/bin/zoopspot-router

WORKDIR /data

# Default entrypoint
CMD ["/usr/local/bin/zoopspot-cloud"]
