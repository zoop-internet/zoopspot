FROM alpine:latest
RUN apk add --no-cache iproute2 iptables curl python3
COPY bin/zoop-cloud /usr/local/bin/
COPY bin/zoopd /usr/local/bin/
COPY bin/zoop /usr/local/bin/
WORKDIR /data
