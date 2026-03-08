FROM python:3.11-slim

# Install system dependencies for Manim (cairo, pango, ffmpeg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libcairo2-dev \
    libpango1.0-dev \
    libglib2.0-dev \
    pkg-config \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install --no-cache-dir \
    manim==0.18.1 \
    awslambdaric==2.2.1 \
    boto3>=1.34.0

# Copy handler
WORKDIR /app
COPY lambda_function.py /app/lambda_function.py

# Lambda RIC entrypoint
ENTRYPOINT [ "python", "-m", "awslambdaric" ]
CMD [ "lambda_function.lambda_handler" ]
