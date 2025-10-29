# YouTube Video Downloader

## Overview

This is a YouTube video downloader web application built with Node.js and Express. The application allows users to extract video information and download YouTube videos through a simple web interface. It uses the ytdl-core library to interact with YouTube's API and provides both video metadata retrieval and download capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture

**Framework**: Express.js (v5.1.0)
- **Decision**: Use Express as the web server framework
- **Rationale**: Express provides a minimal, flexible Node.js web application framework with robust routing and middleware capabilities
- **Pros**: Lightweight, extensive middleware ecosystem, easy to set up and configure
- **Cons**: Minimal structure means architectural decisions are left to the developer

**API Design**: RESTful endpoints
- **Decision**: Implement REST-style GET endpoints for video operations
- **Endpoints**:
  - `GET /` - Serves the main HTML interface
  - `GET /api/info?url={YouTube_URL}` - Retrieves video metadata (title, author, duration, views, thumbnail, description)
  - `GET /api/download/video?url={YouTube_URL}` - Downloads video file (highest quality with audio)
  - `GET /api/download/audio?url={YouTube_URL}` - Downloads audio-only file (highest quality audio)
- **Rationale**: Simple, stateless communication pattern appropriate for video information retrieval and download operations
- **Pros**: Easy to consume from frontend, cacheable, well-understood pattern, both web interface and direct API access supported
- **Cons**: Less efficient for real-time updates compared to WebSocket alternatives

**Static File Serving**: Express static middleware
- **Decision**: Serve frontend assets from a `/public` directory
- **Rationale**: Keeps frontend and backend code organized and allows Express to efficiently serve static HTML, CSS, and JavaScript
- **Pros**: Simple deployment, single server for both API and frontend
- **Cons**: Doesn't scale as well as dedicated CDN for larger applications

### Frontend Architecture

**Technology Stack**: Vanilla HTML/CSS/JavaScript
- **Decision**: Use plain HTML with embedded CSS (visible in index.html)
- **Rationale**: Simple application doesn't require a complex frontend framework
- **Pros**: No build process, fast load times, minimal dependencies
- **Cons**: Less maintainable for complex UIs, no component reusability

**Styling Approach**: Embedded CSS with gradient backgrounds
- **Decision**: Modern gradient design with responsive layout
- **Rationale**: Creates visually appealing interface without external CSS frameworks
- **Pros**: Self-contained, no external dependencies, full control over styling
- **Cons**: Harder to maintain consistent design system across multiple pages

### Error Handling Strategy

**Validation**: URL validation using ytdl-core's built-in validator
- **Decision**: Validate YouTube URLs before processing
- **Rationale**: Prevents unnecessary API calls and provides early feedback to users
- **Error responses**: Return appropriate HTTP status codes (400 for bad requests, 500 for server errors)

**Try-catch blocks**: Async error handling in all API endpoints
- **Decision**: Wrap async operations in try-catch blocks
- **Rationale**: Prevents server crashes and provides meaningful error messages to clients
- **Pros**: Graceful error handling, detailed logging
- **Cons**: Requires consistent implementation across all endpoints

### CORS Configuration

**Decision**: Enable CORS for all origins using cors middleware
- **Rationale**: Allows frontend to make requests from different origins during development
- **Consideration**: In production, this should be restricted to specific origins for security
- **Pros**: Simple development setup, works across different deployment scenarios
- **Cons**: Overly permissive for production environments

## External Dependencies

### Core Libraries

**@distube/ytdl-core** (v4.16.12)
- **Purpose**: YouTube video information extraction and download functionality
- **Usage**: 
  - `ytdl.validateURL()` - Validates YouTube URLs
  - `ytdl.getInfo()` - Retrieves video metadata
  - Used for streaming video downloads
- **Note**: This is an actively maintained fork of ytdl-core that fixes compatibility issues with YouTube. The original ytdl-core is no longer maintained and was replaced on October 29, 2025 to resolve "Could not extract functions" errors
- **Note**: This library interacts directly with YouTube without requiring API keys, but may be subject to rate limiting or changes in YouTube's structure

**Express** (v5.1.0)
- **Purpose**: Web application framework
- **Usage**: HTTP server, routing, middleware support

**cors** (v2.8.5)
- **Purpose**: Cross-Origin Resource Sharing middleware
- **Usage**: Enables API access from different origins

**@types/node** (v22.13.11)
- **Purpose**: TypeScript type definitions for Node.js
- **Usage**: Provides IDE intellisense and type checking (though project appears to use JavaScript)

### Node.js Built-in Modules

**path**: File path manipulation for serving static files
**express.json()**: JSON request body parsing middleware
**express.static()**: Static file serving middleware

### External Services

**YouTube**: Primary data source
- **Integration method**: Via ytdl-core library (unofficial API)
- **Data retrieved**: Video metadata, streaming URLs
- **Limitations**: No official API key usage means potential rate limiting and fragility to YouTube changes
- **Consideration**: Application depends on ytdl-core's ability to parse YouTube's page structure