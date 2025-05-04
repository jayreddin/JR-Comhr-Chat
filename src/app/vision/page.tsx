import { PageLayout } from '@/components/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';


export default function VisionPage() {
  return (
    <PageLayout currentPageName="Vision"> {/* Removed showSignIn prop */}
       <div className="flex flex-col items-center justify-center h-full">
         <Card className="w-full max-w-2xl">
           <CardHeader>
             <CardTitle>Image Vision Analysis</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <p className="text-muted-foreground">Upload an image to analyze its content.</p>
             <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center space-y-2">
                <Upload className="w-12 h-12 text-muted-foreground" />
                <p className="text-muted-foreground">Drag & drop an image here, or</p>
                <Button variant="outline">Browse Files</Button>
             </div>
              <div className="mt-4 h-48 border rounded-md flex items-center justify-center bg-secondary/50">
                <p className="text-muted-foreground">Analysis Results Area</p>
             </div>
           </CardContent>
         </Card>
      </div>
    </PageLayout>
  );
}
