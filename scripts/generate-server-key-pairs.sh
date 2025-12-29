#!/bin/bash
set -e

# Generate private key (Ed25519)
openssl genpkey -algorithm Ed25519 -out apps/server-node/ec-private.pem

# Extract public key
openssl pkey -in apps/server-node/ec-private.pem -pubout -out apps/server-node/ec-public.pem

echo "Keys generated:"
echo " - apps/server-node/ec-private.pem"
echo " - apps/server-node/ec-public.pem"

echo "Base64 public key"
echo $(cat apps/server-node/ec-public.pem | base64 | tr -d '\n')