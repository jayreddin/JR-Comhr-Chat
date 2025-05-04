import { PageLayout } from '@/components/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';


export default function ImageGenPage() {
  return (
    <PageLayout currentPageName="Image Gen"> {/* Removed showSignIn prop */}
      <div className="flex flex-col items-center justify-center h-full">
         <Card className="w-full max-w-2xl">
           <CardHeader>
             <CardTitle>Image Generation</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <p className="text-muted-foreground">Describe the image you want to create.</p>
             <Textarea placeholder="e.g., A futuristic cityscape at sunset with flying cars..." rows={4} />
             <Button>Generate Image</Button>
              <div className="mt-4 aspect-square border rounded-md flex items-center justify-center bg-secondary/50">
                <p className="text-muted-foreground">Generated Image Area</p>
             </div>
           </CardContent>
         </Card>
      </div>
    </PageLayout>
  );
}
