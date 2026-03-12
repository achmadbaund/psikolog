FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/
# Specs di-mount dari ../openapi saat runtime (docker-compose)
RUN mkdir -p /usr/share/nginx/html/specs
EXPOSE 80
