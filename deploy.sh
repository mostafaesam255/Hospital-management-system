#!/bin/bash
# HMS-AI Deploy Script to AWS S3
# Run this script to build and deploy the Angular app

echo "🏗️  Building Angular app for production..."
ng build --configuration production

echo "📤 Uploading to S3..."
# Upload all assets with long cache
aws s3 sync dist/myapp/browser/ s3://hms-ai-app-094156049477/ \
  --delete \
  --cache-control "max-age=31536000" \
  --exclude "index.html"

# Upload index.html with no-cache (important for Angular routing)
aws s3 cp dist/myapp/browser/index.html s3://hms-ai-app-094156049477/index.html \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

echo "✅ Deployment complete!"
echo "🌐 URL: http://hms-ai-app-094156049477.s3-website-us-east-1.amazonaws.com"
