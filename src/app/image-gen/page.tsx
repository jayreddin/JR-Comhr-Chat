'use client';

import { useState } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { PageLayout } from '@/components/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ImageGenPage() {
  const [provider, setProvider] = useState('puter');
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const generateImage = async () => {
    setIsGenerating(true);
    try {
      if (provider === 'puter') {
        // Use the example code implementation
        const image = await window.puter.ai.txt2img(prompt, true);
        if (image) {
          setImages(prev => [image.src, ...prev]);
        } else {
          throw new Error('No image generated');
        }
      } else {
        // Gemini provider selected
        const storedApiKey = localStorage.getItem('geminiApiKey');
        if (!storedApiKey) {
          throw new Error('Please set your Gemini API key in the header menu first');
        }

        // DEBUG: List available models for this API key
        const modelsResponse = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + storedApiKey);
        const modelsData = await modelsResponse.json();
        console.log('Available Gemini models for this API key:', modelsData);

        // Use direct fetch to v1 endpoint for image generation
        const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp-image-generation:generateContent?key=' + storedApiKey, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Failed to generate image');
        }
        const data = await response.json();
        if (
          data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          Array.isArray(data.candidates[0].content.parts)
        ) {
          for (const part of data.candidates[0].content.parts) {
            if (part.inlineData) {
              const imageData = part.inlineData.data;
              const imageUrl = `data:image/png;base64,${imageData}`;
              setImages(prev => [imageUrl, ...prev]);
              break;
            }
          }
        } else {
          throw new Error('No valid image data returned from Gemini');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate image',
        variant: 'destructive'
      });
    }
    setIsGenerating(false);
  };

  return (
    <PageLayout currentPageName="Image Gen">
      <div className="flex flex-col items-center justify-center h-full">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Image Generation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center space-x-8">
              <RadioGroup
                value={provider}
                onValueChange={setProvider}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="puter" id="puter" />
                  <Label htmlFor="puter">Puter</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gemini" id="gemini" />
                  <Label htmlFor="gemini">Gemini</Label>
                </div>
              </RadioGroup>
            </div>

            <Input
              placeholder="Describe what you want to create"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <Button
              onClick={generateImage}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? 'Generating...' : 'Generate Image'}
            </Button>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={cn(
                    "relative aspect-square border rounded-md overflow-hidden cursor-pointer",
                    "hover:ring-2 hover:ring-primary/50 transition-all"
                  )}
                  onClick={() => setExpandedImage(image)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={`Generated image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement save functionality
                      toast({
                        title: 'Image Saved',
                        description: 'Image has been saved successfully.'
                      });
                    }}
                  >
                    Save
                  </Button>
                </div>
              ))}
              {images.length === 0 && (
                <div className="aspect-square border rounded-md flex items-center justify-center bg-secondary/50 col-span-2 sm:col-span-3">
                  <p className="text-muted-foreground">Generated images will appear here</p>
                </div>
              )}
            </div>

            <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Generated Image</DialogTitle>
                </DialogHeader>
                {expandedImage && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={expandedImage}
                      alt="Expanded view"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
