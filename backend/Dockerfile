FROM python:3.11-slim

RUN apt-get update && apt-get install -y gcc default-libmysqlclient-dev pkg-config libgdk-pixbuf-xlib-2.0-0 libcairo2 libpango-1.0-0 libpangocairo-1.0-0 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install mysqlclient PyMySQL gunicorn gevent

COPY . .

EXPOSE 5000
CMD gunicorn --worker-class gevent -w 1 --bind 0.0.0.0:$PORT run:app
