#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${AWS_S3_BUCKET:-}" ]]; then
  echo "Defina AWS_S3_BUCKET antes de publicar."
  exit 1
fi

npm run build

aws s3 sync dist "s3://${AWS_S3_BUCKET}" \
  --delete \
  --exclude "index.html" \
  --cache-control "public,max-age=31536000,immutable"

aws s3 cp dist/index.html "s3://${AWS_S3_BUCKET}/index.html" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache,no-store,must-revalidate"

if [[ -n "${AWS_CLOUDFRONT_DISTRIBUTION_ID:-}" ]]; then
  aws cloudfront create-invalidation \
    --distribution-id "${AWS_CLOUDFRONT_DISTRIBUTION_ID}" \
    --paths "/*"
fi

echo "Publicação concluída no bucket ${AWS_S3_BUCKET}."
