FROM python:3.12-alpine
LABEL author=unishelf version=0.1
ENV PYTHONUNBUFFERED=1

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

COPY pyproject.toml .
RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync --no-install-project --no-dev

COPY . /app

RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync --no-dev

ENV PATH="/app/.venv/bin:$PATH"

# Expose port 8000
EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
