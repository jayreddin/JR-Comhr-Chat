import { PageLayout } from '@/components/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ChatPage() {
  return (
    <PageLayout currentPageName="Chat" showSignIn={true}>
      <div className="flex flex-col items-center justify-center h-full">
         <Card className="w-full max-w-2xl">
           <CardHeader>
             <CardTitle>Chat Interface</CardTitle>
           </CardHeader>
           <CardContent>
             <p className="text-muted-foreground">The main chat interface will be implemented here.</p>
             {/* Placeholder for chat messages and input */}
             <div className="mt-4 h-64 border rounded-md flex items-center justify-center bg-secondary/50">
                <p className="text-muted-foreground">Chat Area</p>
             </div>
             <div className="mt-4 h-16 border rounded-md flex items-center justify-center bg-secondary/50">
                <p className="text-muted-foreground">Input Area</p>
             </div>
           </CardContent>
         </Card>
      </div>
    </PageLayout>
  );
}
