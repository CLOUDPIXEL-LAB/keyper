
import React from 'react';
import { Input} from '@/components/ui/input';
import { Button} from '@/components/ui/button';
import { Badge} from '@/components/ui/badge';
import { 
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X} from 'lucide-react';
import { Category} from '../SelfHostedDashboard';

interface SearchAndFiltersProps {
 searchTerm: string;
 setSearchTerm: (term: string) => void;
 selectedCategory: string;
 setSelectedCategory: (category: string) => void;
 selectedType: string;
 setSelectedType: (type: string) => void;
 selectedTags: string[];
 setSelectedTags: (tags: string[]) => void;
 categories: Category[];
 allTags: string[];
}

export const SearchAndFilters = ({
 searchTerm,
 setSearchTerm,
 selectedCategory,
 setSelectedCategory,
 selectedType,
 setSelectedType,
 selectedTags,
 setSelectedTags,
 categories,
 allTags,
}: SearchAndFiltersProps) => {
 const credentialTypes = [
 { value: 'api_key', label: 'API Key'},
 { value: 'login', label: 'Login'},
 { value: 'secret', label: 'Secret'},
 { value: 'token', label: 'Token'},
 { value: 'certificate', label: 'Certificate'},
 { value: 'document', label: 'Document'},
 { value: 'misc', label: 'Miscellaneous'},
 ];

 const toggleTag = (tag: string) => {
 setSelectedTags(
 selectedTags.includes(tag)
 ? selectedTags.filter(t => t !== tag)
 : [...selectedTags, tag]
 );
};

 const clearFilters = () => {
 setSearchTerm('');
 setSelectedCategory('all');
 setSelectedType('all');
 setSelectedTags([]);
};

 const hasActiveFilters = searchTerm || selectedCategory !== 'all' || selectedType !== 'all' || selectedTags.length > 0;

 return (
 <div className="space-y-4 mb-8">
 {/* Search Bar */}
 <div className="relative">
 <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder="Search credentials, categories, tags..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="pl-10 bg-card/60 border-border text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-neutral-500"
 />
 </div>

 {/* Filters */}
 <div className="flex flex-wrap items-center gap-4">
 <div className="flex items-center space-x-2">
 <Filter className="h-4 w-4 text-muted-foreground" />
 <span className="text-sm text-muted-foreground">Filters:</span>
 </div>

 <Select value={selectedCategory} onValueChange={setSelectedCategory}>
 <SelectTrigger className="w-40 bg-card/60 border-border text-foreground focus:ring-1 focus:ring-neutral-500">
 <SelectValue placeholder="Category" />
 </SelectTrigger>
 <SelectContent className="bg-card border-border text-foreground">
 <SelectItem value="all" className="text-foreground">All Categories</SelectItem>
 {categories.map((category) => (
 <SelectItem key={category.id} value={category.name} className="text-foreground">
 {category.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>

 <Select value={selectedType} onValueChange={setSelectedType}>
 <SelectTrigger className="w-40 bg-card/60 border-border text-foreground focus:ring-1 focus:ring-neutral-500">
 <SelectValue placeholder="Type" />
 </SelectTrigger>
 <SelectContent className="bg-card border-border text-foreground">
 <SelectItem value="all" className="text-foreground">All Types</SelectItem>
 {credentialTypes.map((type) => (
 <SelectItem key={type.value} value={type.value} className="text-foreground">
 {type.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>

 {hasActiveFilters && (
 <Button
 onClick={clearFilters}
 variant="ghost"
 size="sm"
 className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
 >
 <X className="h-4 w-4 mr-1" />
 Clear
 </Button>
 )}
 </div>

 {/* Tags */}
 {allTags.length > 0 && (
 <div className="space-y-2">
 <span className="text-sm text-muted-foreground">Tags:</span>
 <div className="flex flex-wrap gap-2">
 {allTags.map((tag) => (
 <Badge
 key={tag}
 variant={selectedTags.includes(tag) ?"default" :"secondary"}
 className={`cursor-pointer transition-colors border ${
 selectedTags.includes(tag)
 ? 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-500'
 : 'bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border-cyan-300 dark:bg-cyan-900/50 dark:hover:bg-cyan-800/50 dark:text-cyan-300 dark:border-cyan-700'
}`}
 onClick={() => toggleTag(tag)}
 >
 {tag}
 </Badge>
 ))}
 </div>
 </div>
 )}
 </div>
 );
};
