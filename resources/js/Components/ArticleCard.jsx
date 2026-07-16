import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Eye, Clock, ExternalLink } from 'lucide-react';
import { useArticleImage } from '@/hooks/useArticleImage';

export default function ArticleCard({ article, category, index = 0, actions = null }) {
    // Use externalUrl or source_url (for database articles)
    const articleUrl = article.externalUrl || article.source_url || null;
    const { imageUrl, isLoading, hasImage, fallbackEmoji } = useArticleImage(
        articleUrl,
        article.image || '📄'
    );

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, x: 5 }}
        >
            <Card 
                className={`p-4 md:p-6 bg-white/80 backdrop-blur-lg border-2 border-gray-200 hover:border-green-500 hover:shadow-xl transition-all ${
                    article.externalUrl ? 'cursor-pointer' : ''
                }`}
                onClick={() => {
                    if (article.externalUrl) {
                        window.open(article.externalUrl, '_blank', 'noopener,noreferrer');
                    }
                }}
            >
                <div className="flex gap-4">
                    {/* Image/Icon */}
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-green-100 via-yellow-100 to-orange-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden relative"
                    >
                        {isLoading ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 animate-pulse">
                                <span className="text-2xl">{fallbackEmoji}</span>
                            </div>
                        ) : hasImage && imageUrl ? (
                            <img 
                                src={imageUrl} 
                                alt={article.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                    // Fallback to emoji if image fails to load
                                    e.target.style.display = 'none';
                                    if (!e.target.parentElement.querySelector('.fallback-emoji')) {
                                        const fallback = document.createElement('span');
                                        fallback.className = 'fallback-emoji text-4xl md:text-5xl absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-100 via-yellow-100 to-orange-100';
                                        fallback.textContent = fallbackEmoji;
                                        e.target.parentElement.appendChild(fallback);
                                    }
                                }}
                            />
                        ) : (
                            <span className="text-4xl md:text-5xl">{fallbackEmoji}</span>
                        )}
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                                {category?.label || 'Artikel'}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-gray-500 font-body">
                                <Clock className="w-3 h-3" />
                                {article.readTime}
                            </div>
                        </div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-lg font-heading text-gray-900 line-clamp-2 flex-1">{article.title}</h4>
                            <div className="flex items-center gap-1">
                                {actions}
                                {article.externalUrl && (
                                    <ExternalLink className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2 font-body">{article.excerpt}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2 font-body">
                            <span>{article.date}</span>
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {article.views} views
                            </span>
                        </div>
                        {article.source && (
                            <div className="text-xs text-gray-500 font-body">
                                Sumber: <span className="font-body text-gray-700">{article.source}</span>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}

