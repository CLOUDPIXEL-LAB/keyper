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
}

export const CredentialsGrid = ({ 
 credentials, 
 loading, 
 onCredentialClick 
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
 className="text-xs bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-700"
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
 className="text-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground"
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
