FROM python:3.11

# Install PostgreSQL development libraries
RUN apt-get update && apt-get install -y libpq-dev && apt-get clean

WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt

# Run the app with python app.py, binding to $PORT
CMD exec python app.py