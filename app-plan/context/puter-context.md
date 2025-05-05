+++
id = "PUTER-CONTEXT-001"
title = "Puter API Context Summary"
context_type = "api-context"
status = "active"
last_updated = "2025-05-05"
+++

# Puter API Context

## Overview
Puter.js is a JavaScript SDK that provides serverless auth, cloud, and AI services directly in the browser with no backend code required. It offers file storage, databases, AI capabilities, and more through a simple script inclusion.

## Core Features

### 1. Authentication (puter.auth)
- User sign-in/sign-out management
- User information retrieval
- Session handling
- Automatic authentication flow

### 2. File System (puter.fs)
- File/directory operations (read, write, copy, move, delete)
- Directory listing and traversal
- File metadata and stats
- Storage space management
- Maximum file size: 400KB per write

### 3. Key-Value Store (puter.kv)
- Simple NoSQL database functionality
- CRUD operations
- Key pattern matching
- Atomic increments/decrements
- Key size limit: 1KB
- Value size limit: 400KB

### 4. AI Services (puter.ai)
- Chat capabilities with multiple models
- Image generation (DALL·E 3)
- OCR (image to text)
- Text to speech
- Streaming responses
- Function calling support

### 5. Hosting (puter.hosting)
- Static website hosting
- Subdomain management 
- Directory-to-website publishing
- HTTPS support

## Integration

```html
<!-- Basic Installation -->
<script src="https://js.puter.com/v2/"></script>
```

## Security Model
1. Sandboxed Apps:
   - Each app gets isolated storage space
   - Restricted to own directory in user's storage
   - Private key-value store per app

2. Authentication:
   - Automatic user authentication handling
   - Permission-based access control
   - Token management handled by SDK

3. Default Permissions:
   - App directory access
   - Private key-value store
   - AI services access
   - Hosting capabilities

## Application Management
- App creation and deletion
- File type associations
- Window management
- Menu bar customization
- Event handling

## UI Components
- Alert dialogs
- Color picker
- Font picker
- File/directory pickers
- Window controls
- Social sharing

## Best Practices
1. Error Handling:
   ```javascript
   try {
       await puter.fs.write('file.txt', 'content');
   } catch(error) {
       console.error('File write failed:', error);
   }
   ```

2. Resource Cleanup:
   ```javascript
   // Delete resources when no longer needed
   await puter.fs.delete('temp.txt');
   ```

3. Authentication Flow:
   ```javascript
   if(!puter.auth.isSignedIn()) {
       await puter.auth.signIn();
   }
   ```

## Limitations & Considerations
- File size limits (400KB per write)
- Key size limits (1KB for keys, 400KB for values)
- User authentication required for cloud services
- Browser compatibility considerations
- Rate limiting may apply

## Cost Model
- User-pays model (users cover their own usage costs)
- Free for developers
- No API keys required
- Automatic scaling support