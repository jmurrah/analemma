# analemma

Automated Ring camera timelapse generator that creates daily timelapses from Ring doorbell footage. The system runs autonomously via GitHub Actions and stores results in Cloudflare R2.

![alt text](sign-in.png)

## Overview

This project combines automation, video processing, and cloud infrastructure to create an end-to-end timelapse generation system. Users can view, search, and manage generated videos through a web interface with Google OAuth authentication.

## Tech Stack

- Next.js
- TypeScript
- Cloudflare R2
- Google OAuth2
- GitHub Actions
- FFmpeg

## Key Features

- Fully automated daily timelapse generation
- Web-based video gallery with search and filtering
- OAuth-protected access
- Manual workflow triggering via API
- Favorite/bookmarking system