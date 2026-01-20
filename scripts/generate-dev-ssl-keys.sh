#!/bin/bash

# Generate a self-signed SSL certificate for development purposes
mkdir -p certs
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 ::1

printf "SSL certificate generated successfully.\n"
