FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt /app/backend/requirements.txt
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy application source code
COPY backend/ /app/backend/
COPY enterprise_core/ /app/enterprise_core/
COPY components/ /app/components/
COPY services/ /app/services/
COPY data/ /app/data/
COPY database/ /app/database/
COPY app.py /app/app.py
COPY styles.css /app/styles.css

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV ENV=production

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
