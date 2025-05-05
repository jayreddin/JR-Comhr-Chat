/**
 * Gemini WebSocket Client
 *
 * Handles WebSocket communication for streaming audio/video/chat to a Gemini backend.
 *
 * TODO:
 * - Implement robust error handling and reconnection logic.
 * - Define clear message types for both sending and receiving.
 * - Potentially add configuration options (e.g., API key, model).
 */
export class GeminiWsClient {
    private ws: WebSocket | null = null;
    private url: string;
    private onMessageCallback: ((data: any) => void) | null = null;
    private onErrorCallback: ((error: Event) => void) | null = null;
    private onCloseCallback: ((event: CloseEvent) => void) | null = null;
    private onOpenCallback: (() => void) | null = null;

    constructor(url: string) {
        this.url = url;
        console.log(`GeminiWsClient initialized with URL: ${url}`);
    }

    connect(): void {
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            console.log("WebSocket already connecting or open.");
            return;
        }

        console.log(`Attempting to connect to WebSocket: ${this.url}`);
        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log("WebSocket connection established.");
                if (this.onOpenCallback) {
                    this.onOpenCallback();
                }
            };

            this.ws.onmessage = (event) => {
                // console.log("WebSocket message received:", event.data); // Raw data
                if (this.onMessageCallback) {
                    try {
                        const data = JSON.parse(event.data);
                        this.onMessageCallback(data);
                    } catch (error) {
                        console.error("Failed to parse WebSocket message:", error, event.data);
                        // Optionally call error callback or handle differently
                        if (this.onErrorCallback) {
                            // Create a synthetic error event or pass the parsing error
                            this.onErrorCallback(new ErrorEvent("messageparseerror", { error: error, message: "Failed to parse message" }));
                        }
                    }
                }
            };

            this.ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                if (this.onErrorCallback) {
                    this.onErrorCallback(error);
                }
            };

            this.ws.onclose = (event) => {
                console.log(`WebSocket connection closed: Code=${event.code}, Reason=${event.reason}`);
                this.ws = null; // Clear the reference on close
                if (this.onCloseCallback) {
                    this.onCloseCallback(event);
                }
                // TODO: Implement reconnection logic if desired
            };
        } catch (error) {
            console.error("Failed to create WebSocket:", error);
             if (this.onErrorCallback) {
                 // Pass the instantiation error
                 this.onErrorCallback(new ErrorEvent("createerror", { error: error, message: "Failed to create WebSocket" }));
             }
        }
    }

    send(data: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                const message = JSON.stringify(data);
                // console.log("Sending WebSocket message:", message); // Debugging
                this.ws.send(message);
            } catch (error) {
                console.error("Failed to stringify or send WebSocket message:", error, data);
            }
        } else {
            console.warn("WebSocket not open. Cannot send message. State:", this.ws?.readyState);
            // TODO: Queue message or handle error?
        }
    }

    close(): void {
        if (this.ws) {
            console.log("Closing WebSocket connection.");
            this.ws.close();
            // onclose handler will set this.ws to null
        }
    }

    // --- Public Getter for Connection Status ---
    public get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
    // -----------------------------------------

    setOnOpen(callback: () => void): void {
        this.onOpenCallback = callback;
    }

    setOnMessage(callback: (data: any) => void): void {
        this.onMessageCallback = callback;
    }

    setOnError(callback: (error: Event) => void): void {
        this.onErrorCallback = callback;
    }

    setOnClose(callback: (event: CloseEvent) => void): void {
        this.onCloseCallback = callback;
    }
}