
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
        // Add any necessary headers if OpenRouter requires them,
        // but typically for public model lists, none are needed.
        // headers: {
        //     'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` // Example if API key were needed
        // }
        cache: 'no-store', // Disable caching to always get the latest list
    });

    if (!response.ok) {
      // Forward the error status and message from OpenRouter if possible
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch models from OpenRouter.' }));
      console.error("OpenRouter API Error:", response.status, errorData);
      return NextResponse.json({ message: errorData.message || 'Failed to fetch models from OpenRouter.' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error in OpenRouter proxy:", error);
    return NextResponse.json({ message: 'Internal Server Error fetching OpenRouter models.' }, { status: 500 });
  }
}

// Optional: Add configuration for edge runtime if desired
// export const runtime = 'edge';
