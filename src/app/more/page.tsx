import { PageLayout } from '@/components/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MorePage() {
  return (
    <PageLayout currentPageName="More"> {/* Removed showSignIn prop */}
       <div className="flex flex-col items-center justify-center h-full">
         <Card className="w-full max-w-2xl">
           <CardHeader>
             <CardTitle>More Features</CardTitle>
           </CardHeader>
           <CardContent>
             <p className="text-muted-foreground">More functionalities and tools will be added here in the future.</p>
              <div className="mt-4 h-64 border rounded-md flex items-center justify-center bg-secondary/50">
                <p className="text-muted-foreground">Placeholder for Future Features</p>
             </div>
           </CardContent>
         </Card>
      </div>
    </PageLayout>
  );
}
