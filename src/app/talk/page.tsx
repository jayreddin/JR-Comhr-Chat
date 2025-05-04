import { PageLayout } from '@/components/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';

export default function TalkPage() {
  // Placeholder state - in a real app, manage recording state properly
  const isRecording = false;

  return (
    <PageLayout currentPageName="Talk"> {/* Removed showSignIn prop */}
      <div className="flex flex-col items-center justify-center h-full">
         <Card className="w-full max-w-2xl">
           <CardHeader>
             <CardTitle>Voice Interaction</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4 text-center">
             <p className="text-muted-foreground">Click the microphone to start talking.</p>
              <Button size="lg" className="rounded-full w-20 h-20 bg-accent hover:bg-accent/90 text-accent-foreground">
               {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
             </Button>
              <div className="mt-4 h-48 border rounded-md flex items-center justify-center bg-secondary/50">
                <p className="text-muted-foreground">Transcript / Response Area</p>
             </div>
           </CardContent>
         </Card>
      </div>
    </PageLayout>
  );
}
