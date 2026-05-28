
import React from 'react';
import { User} from '@supabase/supabase-js';
import { Button} from '@/components/ui/button';
import { Plus, Shield, RefreshCw, BookOpen} from 'lucide-react';

interface DashboardHeaderProps {
 user: User;
 onAddCredential: () => void;
 onRefresh: () => void;
}

export const DashboardHeader = ({ user, onAddCredential, onRefresh}: DashboardHeaderProps) => {

 return (
 <header className="bg-background/80 backdrop-blur-sm border-b border-border">
 <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
 <div className="flex items-center justify-between h-16">
 <div className="flex items-center space-x-3">
 <div className="p-1 bg-primary/15 rounded-lg border border-primary/30">
 <img
 src="/logo.png"
 alt="Keyper Logo"
 className="h-11 w-11 rounded-full object-contain"
 />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-foreground font-sans">Keyper</h1>
 <p className="text-sm text-muted-foreground">Secure credential vault</p>
 </div>
 </div>

 <div className="flex items-center space-x-4">
 <div className="flex items-center space-x-2 text-sm text-foreground">
 <Shield className="h-4 w-4 text-primary" />
 <span className="hidden sm:inline">Self-Hosted Keyper</span>
 </div>

 <Button
 onClick={onRefresh}
 variant="outline"
 size="sm"
 className="flex items-center gap-2"
 >
 <RefreshCw className="h-4 w-4" />
 <span className="hidden sm:inline">Refresh</span>
 </Button>

 <Button asChild variant="outline" size="sm" className="flex items-center gap-2">
 <a
 href="https://keyper.icu"
 target="_blank"
 rel="noopener noreferrer"
 aria-label="Open Keyper documentation website"
 >
 <BookOpen className="h-4 w-4" />
 <span className="hidden sm:inline">Docs</span>
 </a>
 </Button>

 <Button
 onClick={onAddCredential}
 className="bg-primary text-primary-foreground hover:bg-primary/90"
 size="sm"
 >
 <Plus className="h-4 w-4 mr-2" />
 Add Credential
 </Button>
 </div>
 </div>
 </div>
 </header>
 );
};
