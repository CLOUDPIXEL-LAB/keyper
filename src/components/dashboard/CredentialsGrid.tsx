import React from 'react';
import { Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import { Badge} from '@/components/ui/badge';
import { Button} from '@/components/ui/button';
import { Skeleton} from '@/components/ui/skeleton';
import { 
 Key, 
 User, 
 Shield, 
 Code, 
 Award,
 FileText,
 Braces,
 Clock,
 Eye
} from 'lucide-react';
import { Credential} from '../SelfHostedDashboard';

interface CredentialsGridProps {
 credentials: Credential[];
 loading: boolean;
 onCredentialClick: (credential: Credential) => void;
 viewMode?: 'grid' | 'list';
}

export const CredentialsGrid = ({ 
 credentials, 
 loading, 
 onCredentialClick,
 viewMode = 'grid'
}: CredentialsGridProps) => {
 const getTypeIcon = (type: string) => {
 switch (type) {
 case 'api_key':
 return <Key className="h-4 w-4" />;
 case 'login':
 return <User className="h-4 w-4" />;
 case 'secret':
 return <Shield className="h-4 w-4" />;
 case 'token':
 return <Code className="h-4 w-4" />;
 case 'certificate':
 return <Award className="h-4 w-4" />;
 case 'document':
 return <FileText className="h-4 w-4" />;
 case 'misc':
 return <Braces className="h-4 w-4" />;
 default:
 return <Key className="h-4 w-4" />;
}
};

 const getPriorityColor = (priority: string) => {
 switch (priority) {
 case 'critical':
 return 'bg-red-600 text-white';
 case 'high':
 return 'bg-orange-600 text-white';
 case 'medium':
 return 'bg-yellow-600 text-white';
 case 'low':
 return 'bg-green-600 text-foreground';
 default:
 return 'bg-neutral-600 text-white';
}
};

 const formatDate = (dateString: string) => {
 return new Date(dateString).toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 year: 'numeric'
});
};

  if (loading) {
    if (viewMode === 'list') {
      return (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-card/40 border border-border/50 rounded-lg">
              <div className="flex items-center space-x-4 flex-1">
                <Skeleton className="h-8 w-8 rounded bg-muted" />
                <div className="space-y-2 flex-1 max-w-xs">
                  <Skeleton className="h-4 w-3/4 bg-muted" />
                  <Skeleton className="h-3 w-1/2 bg-muted animate-pulse" />
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <Skeleton className="h-4 w-16 bg-muted hidden md:block" />
                <Skeleton className="h-4 w-20 bg-muted hidden sm:block" />
                <Skeleton className="h-8 w-8 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {[...Array(10)].map((_, i) => (
          <Card key={i} className="bg-card/60 border-border">
            <CardHeader>
              <Skeleton className="h-4 w-3/4 bg-muted" />
              <Skeleton className="h-3 w-1/2 bg-muted" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-full bg-muted mb-2" />
              <Skeleton className="h-3 w-2/3 bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

 if (credentials.length === 0) {
 return (
 <div className="text-center py-12">
 <Shield className="h-16 w-16 text-neutral-600 mx-auto mb-4" />
 <h3 className="text-xl font-semibold text-foreground mb-2">No credentials found</h3>
 <p className="text-muted-foreground">Add your first credential to get started</p>
 </div>
 );
}

  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {credentials.map((credential) => (
          <div
            key={credential.id}
            className="flex items-center justify-between p-4 bg-card/60 hover:bg-card/80 border border-border rounded-lg transition-colors cursor-pointer group"
            onClick={() => onCredentialClick(credential)}
          >
            {/* Left side: Icon, Title, Priority, Description */}
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <div className="shrink-0 p-2 rounded-md bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
                {getTypeIcon(credential.credential_type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-foreground truncate">{credential.title}</span>
                  <Badge className={`${getPriorityColor(credential.priority)} text-[10px] py-0 px-1.5`}>
                    {credential.priority}
                  </Badge>
                </div>
                {credential.description && (
                  <p className="text-xs text-muted-foreground truncate max-w-xl mt-0.5">
                    {credential.description}
                  </p>
                )}
              </div>
            </div>

            {/* Right side: Category, Tags, Expiration, Updated, Action */}
            <div className="flex items-center space-x-6 text-sm text-muted-foreground ml-4 shrink-0">
              {credential.category && (
                <span className="hidden md:inline-block bg-muted/40 px-2 py-0.5 rounded text-xs text-foreground">
                  {credential.category}
                </span>
              )}
              
              {credential.tags.length > 0 && (
                <div className="hidden lg:flex items-center space-x-1">
                  {credential.tags.slice(0, 2).map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="text-[10px] py-0 px-1 bg-primary/10 text-primary border-primary/20"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {credential.tags.length > 2 && (
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] py-0 px-1 bg-muted text-foreground"
                    >
                      +{credential.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}

              {credential.expires_at && (
                <span className="hidden sm:flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(credential.expires_at)}
                </span>
              )}

              <span className="text-xs hidden sm:inline-block">
                Updated {formatDate(credential.updated_at)}
              </span>

              <Button 
                size="sm" 
                variant="ghost" 
                className="text-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

 return (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
 {credentials.map((credential) => (
 <Card 
 key={credential.id}
 className="bg-card/60 border-border hover:bg-card/80 transition-colors cursor-pointer group"
 onClick={() => onCredentialClick(credential)}
 >
 <CardHeader className="pb-3">
 <div className="flex items-start justify-between">
 <div className="flex items-center space-x-2">
 {getTypeIcon(credential.credential_type)}
 <CardTitle className="text-lg text-foreground group-hover:text-foreground transition-colors">
 {credential.title}
 </CardTitle>
 </div>
 <Badge className={getPriorityColor(credential.priority)}>
 {credential.priority}
 </Badge>
 </div>
 {credential.description && (
 <p className="text-sm text-muted-foreground line-clamp-2">
 {credential.description}
 </p>
 )}
 </CardHeader>
 
 <CardContent className="space-y-3">
 <div className="flex items-center justify-between text-sm">
 <span className="text-muted-foreground">Type</span>
 <span className="text-foreground capitalize">
 {credential.credential_type.replace('_', ' ')}
 </span>
 </div>

 {credential.category && (
 <div className="flex items-center justify-between text-sm">
 <span className="text-muted-foreground">Category</span>
 <span className="text-foreground">{credential.category}</span>
 </div>
 )}

 {credential.expires_at && (
 <div className="flex items-center justify-between text-sm">
 <span className="text-muted-foreground flex items-center">
 <Clock className="h-3 w-3 mr-1" />
 Expires
 </span>
 <span className="text-foreground">
 {formatDate(credential.expires_at)}
 </span>
 </div>
 )}

 {credential.tags.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-3">
 {credential.tags.slice(0, 3).map((tag) => (
 <Badge 
 key={tag} 
 variant="secondary" 
 className="text-xs bg-primary/10 text-primary border-primary/25"
 >
 {tag}
 </Badge>
 ))}
 {credential.tags.length > 3 && (
 <Badge 
 variant="secondary" 
 className="text-xs bg-muted text-foreground"
 >
 +{credential.tags.length - 3}
 </Badge>
 )}
 </div>
 )}

 <div className="flex items-center justify-between pt-3 border-t border-border">
 <span className="text-xs text-muted-foreground">
 Updated {formatDate(credential.updated_at)}
 </span>
 <Button 
 size="sm" 
 variant="ghost" 
 className="text-foreground hover:bg-accent hover:text-accent-foreground"
 >
 <Eye className="h-4 w-4" />
 </Button>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 );
};
