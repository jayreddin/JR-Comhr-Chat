+++
id = "WORKING-APP-CONTEXT-001" 
title = "Working Example App Context Summary"
context_type = "app-context"
status = "active"
last_updated = "2025-05-05"
+++

# Working Example App Context

## Overview
A vanilla JavaScript implementation of a multimodal live API client that enables real-time interaction with AI models through text, audio, video, and screen sharing capabilities.

## Core Architecture

### 1. Main Agent (GeminiAgent)
- Central orchestrator class managing all components
- Handles WebSocket connections
- Coordinates audio/video streams
- Manages tool integrations
- Implements event system

### 2. Key Components

#### Audio Processing
```javascript
// Components
- AudioRecorder: Handles microphone input
- AudioStreamer: Manages audio output streaming
- AudioVisualizer: Provides visual feedback
```

#### Media Capture
```javascript
// Components
- CameraManager: Handles video capture
- ScreenManager: Manages screen sharing
```

#### Communication
```javascript
// Components
- WebSocketClient: Handles API communication
- DeepgramTranscriber: Real-time speech transcription
```

#### Tool Management
```javascript
// Functionality
- Function calling support
- Tool declaration handling
- Response processing
```

## Implementation Details

### 1. Initialization Flow
```javascript
async initialize() {
    // Setup audio context
    this.audioContext = new AudioContext();
    this.audioStreamer.initialize();
    
    // Initialize visualizer
    this.visualizer = new AudioVisualizer();
    
    // Setup transcription if available
    if (this.deepgramApiKey) {
        // Initialize transcribers
    }
}
```

### 2. Media Handling
- Camera capture at configurable FPS
- Screen sharing with quality settings
- Audio streaming with interruption support
- Real-time transcription integration

### 3. Event System
```javascript
// Core events
- 'audio': Incoming audio data
- 'interrupted': Model interruption
- 'turn_complete': Model finished speaking
- 'tool_call': Function calling
- 'transcription': Speech transcription
```

### 4. Resource Management
- Proper cleanup of audio contexts
- WebSocket connection handling
- Stream disposal
- Keep-alive mechanisms

## Configuration Options

```javascript
{
    name: 'GeminiAgent',
    url: 'ws://api-endpoint',
    config: {
        // API configuration
    },
    deepgramApiKey: 'optional-key',
    transcribeModelsSpeech: true,
    transcribeUsersSpeech: false,
    modelSampleRate: 24000
}
```

## Technical Requirements
1. Browser Support:
   - WebRTC
   - WebSocket
   - Web Audio API
   - Canvas for visualization

2. API Dependencies:
   - AI Model API access
   - Deepgram API (optional)

3. Performance Considerations:
   - Frame rate management
   - Audio buffer handling
   - Resource cleanup

## Best Practices from Implementation

1. Resource Management:
```javascript
async disconnect() {
    // Ordered cleanup
    await this.stopMediaCapture();
    await this.cleanupAudio();
    await this.cleanupTranscribers();
    this.client.disconnect();
}
```

2. Error Handling:
```javascript
try {
    await this.startMediaStream();
} catch (error) {
    await this.disconnect();
    throw new Error('Failed to start: ' + error);
}
```

3. Event-Driven Architecture:
```javascript
// Event emission
this.emit('event_name', data);

// Event handling
this.on('event_name', (data) => {
    // Handle event
});
```

## Security Considerations
- API key management
- Media permission handling
- Secure WebSocket connections
- Resource access controls

## Integration Points
1. AI Model API
2. Speech-to-Text Services
3. Media Capture APIs
4. WebSocket Communication
5. Tool/Function Integration

This implementation provides a robust foundation for building multimodal AI interactions with clean separation of concerns and proper resource management.
## ImageGenPage Component Summary

The `ImageGenPage` component provides a user interface for generating images based on text descriptions.

**Purpose:**

The component allows users to input a text description of an image they want to generate.

**UI Elements:**

*   **Textarea:** A `Textarea` component where users can enter the text description for the desired image.
*   **Generate Image Button:** A `Button` component that triggers the image generation process based on the text description provided in the `Textarea`.
*   **Generated Image Area:** A `div` element that will display the generated image. Currently, it displays placeholder text "Generated Image Area".