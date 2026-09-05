# LotBeacon demo container — one process, SQLite, reseeds the pilot dealership on boot.
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 LOTBEACON_AI_PROVIDER=auto
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Render/Railway/Fly inject $PORT. The DB lives in /tmp so a redeploy always starts from a clean, seeded demo.
ENV LOTBEACON_DATABASE_URL=sqlite:////tmp/lotbeacon.db
CMD ["sh", "-c", "uvicorn lotbeacon.api:app --host 0.0.0.0 --port ${PORT:-8080}"]
