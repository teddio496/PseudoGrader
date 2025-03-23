# CSGrader

## GitHub Container Registry Integration

This project uses GitHub Actions to automatically build and publish Docker images to GitHub Container Registry (GHCR).

### How It Works

When you push to the `main` branch, GitHub Actions will:
1. Build the Docker images for both server and web components
2. Push them to GitHub Container Registry with appropriate tags

### Using the Published Images

To use the published Docker images in production:

```bash
# Clone the repository
git clone https://github.com/yourusername/CSGrader.git
cd CSGrader

# Set your GitHub username and repository name
export GITHUB_REPOSITORY=yourusername/CSGrader

# Run using the production configuration
docker-compose -f docker-compose.prod.yml up -d
```

### Local Development

For local development, use the regular Docker Compose file:

```bash
docker-compose up --build
```

### Required Environment Variables

Set these environment variables before running the application:

- `GOOGLE_API_KEY` - Your Google API key
- `COHERE_API_KEY` - Your Cohere API key 
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to Google credentials file
- `GITHUB_REPOSITORY` - Your GitHub username and repository name (for production) 