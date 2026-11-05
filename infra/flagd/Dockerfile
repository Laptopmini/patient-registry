# flagd ships as a distroless image with no shell, so a Compose health check can't run in it.
# This copies the same binary onto Alpine, which adds wget for the management-port health check.
FROM ghcr.io/open-feature/flagd:v0.18.2 AS flagd

FROM alpine:3.24
COPY --from=flagd /flagd-build /usr/local/bin/flagd
USER 65532:65532
EXPOSE 8013 8014
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=10 \
  CMD wget -q -O /dev/null http://127.0.0.1:8014/healthz || exit 1
ENTRYPOINT ["/usr/local/bin/flagd"]
CMD ["start", "--uri", "file:/etc/flagd/flags.json"]
