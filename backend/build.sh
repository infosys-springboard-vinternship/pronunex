#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=== Starting Render Build Process ==="

# Upgrade pip
pip install --upgrade pip

# Install CPU-only PyTorch first from PyTorch index (saves ~1.8GB vs CUDA version)
echo "Installing CPU-only PyTorch..."
pip install torch==2.2.2+cpu torchaudio==2.2.2+cpu --extra-index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies (torch already satisfied, will be skipped)
echo "Installing dependencies..."
pip install -r requirements.txt

# Create necessary directories
echo "Creating directories..."
mkdir -p media staticfiles

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --no-input

# Run database migrations
echo "Running migrations..."
python manage.py migrate --no-input

# Create superuser from environment variables (if set)
echo "Checking superuser..."
python manage.py create_superuser_if_not_exists

echo "=== Build Complete ==="
