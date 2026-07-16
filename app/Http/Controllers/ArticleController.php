<?php

namespace App\Http\Controllers;

use App\Models\Article;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class ArticleController extends Controller
{
    /**
     * Display a listing of articles for public (all users can access)
     */
    public function indexPublic(Request $request): Response
    {
        $articles = Article::where('status', 'published')
            ->with('creator')
            ->orderBy('publish_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($article) {
                $publishDate = $article->publish_date instanceof \Carbon\Carbon 
                    ? $article->publish_date 
                    : \Carbon\Carbon::parse($article->publish_date);
                
                return [
                    'id' => $article->id,
                    'title' => $article->title,
                    'excerpt' => $article->description,
                    'source' => $this->extractDomainFromUrl($article->source_url),
                    'externalUrl' => $article->source_url,
                    'date' => $publishDate->format('d M Y'),
                    'year' => $article->year,
                    'image' => '📰',
                    'readTime' => '5 min',
                    'views' => 0,
                    'category' => $article->category ?? 'berita',
                ];
            });

        return Inertia::render('ArtikelEdukasi', [
            'dbArticles' => $articles,
        ]);
    }

    /**
     * Store a newly created article (K-Petani only)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'source_url' => 'required|url|max:500',
            'year' => 'required|integer|min:2000|max:' . (date('Y') + 1),
            'publish_date' => 'required|date',
            'description' => 'nullable|string|max:2000',
            'category' => 'required|string|in:berita,tips,teknologi,jenis-mangga,perawatan',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $user = $request->user();
        
        if (!$user) {
            return back()->withErrors(['general' => 'Anda harus login untuk menambahkan artikel.'])->withInput();
        }

        try {
            $article = Article::create([
                'title' => $request->title,
                'source_url' => $request->source_url,
                'year' => $request->year,
                'publish_date' => $request->publish_date,
                'description' => $request->description ?? '',
                'category' => $request->category ?? 'berita',
                'created_by' => $user->id,
                'status' => 'published',
            ]);

            \Log::info('Article created successfully', [
                'article_id' => $article->id,
                'title' => $article->title,
                'user_id' => $user->id,
            ]);

            // Return Inertia response to trigger onSuccess callback
            return redirect()->route('artikel')->with('success', 'Artikel berhasil ditambahkan.');
        } catch (\Exception $e) {
            \Log::error('Failed to create article', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id ?? null,
                'request_data' => $request->except(['password']),
            ]);

            return back()->withErrors([
                'general' => 'Gagal menyimpan artikel: ' . $e->getMessage()
            ])->withInput();
        }
    }

    /**
     * Update the specified article (K-Petani only)
     */
    public function update(Request $request, Article $article)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'source_url' => 'required|url|max:500',
            'year' => 'required|integer|min:2000|max:' . (date('Y') + 1),
            'publish_date' => 'required|date',
            'description' => 'nullable|string|max:2000',
            'category' => 'required|string|in:berita,tips,teknologi,jenis-mangga,perawatan',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        try {
            $article->update([
                'title' => $request->title,
                'source_url' => $request->source_url,
                'year' => $request->year,
                'publish_date' => $request->publish_date,
                'description' => $request->description ?? '',
                'category' => $request->category ?? 'berita',
            ]);

            \Log::info('Article updated successfully', [
                'article_id' => $article->id,
                'title' => $article->title,
            ]);

            return redirect()->route('artikel')->with('success', 'Artikel berhasil diperbarui.');
        } catch (\Exception $e) {
            \Log::error('Failed to update article', [
                'error' => $e->getMessage(),
                'article_id' => $article->id,
            ]);

            return back()->withErrors([
                'general' => 'Gagal memperbarui artikel: ' . $e->getMessage()
            ])->withInput();
        }
    }

    /**
     * Remove the specified article (K-Petani only)
     */
    public function destroy(Article $article)
    {
        try {
            $articleId = $article->id;
            $articleTitle = $article->title;
            
            $article->delete();

            \Log::info('Article deleted successfully', [
                'article_id' => $articleId,
                'title' => $articleTitle,
            ]);

            return redirect()->route('artikel')->with('success', 'Artikel berhasil dihapus.');
        } catch (\Exception $e) {
            \Log::error('Failed to delete article', [
                'error' => $e->getMessage(),
                'article_id' => $article->id,
            ]);

            return back()->withErrors([
                'general' => 'Gagal menghapus artikel: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Generate article data from URL (K-Petani only)
     */
    public function generateFromUrl(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'url' => 'required|url|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $url = $request->url;
            $data = $this->scrapeArticleData($url);

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to generate article data from URL', [
                'error' => $e->getMessage(),
                'url' => $request->url,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data artikel: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Scrape article data from URL
     */
    private function scrapeArticleData(string $url): array
    {
        try {
            // Fetch HTML content with proper headers
            $response = Http::timeout(15)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language' => 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                ])
                ->get($url);
            
            if (!$response->successful()) {
                throw new \Exception('Gagal mengambil konten dari URL: HTTP ' . $response->status());
            }

            $html = $response->body();
            
            if (empty($html)) {
                throw new \Exception('Konten HTML kosong');
            }
            
            // Load HTML into DOMDocument with proper encoding
            libxml_use_internal_errors(true);
            $dom = new \DOMDocument('1.0', 'UTF-8');
            $dom->encoding = 'UTF-8';
            
            // Try to detect encoding
            $encoding = mb_detect_encoding($html, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
            if ($encoding && $encoding !== 'UTF-8') {
                $html = mb_convert_encoding($html, 'UTF-8', $encoding);
            }
            
            @$dom->loadHTML('<?xml encoding="UTF-8">' . $html);
            libxml_clear_errors();
            
            $xpath = new \DOMXPath($dom);

            // Extract title
            $title = $this->extractTitle($xpath, $dom);
            
            // Extract description
            $description = $this->extractDescription($xpath, $dom);
            
            // Extract publish date
            $publishDate = $this->extractPublishDate($xpath, $dom);
            
            // Extract year from publish date or use current year
            $year = $this->extractYear($publishDate);

            // Log extracted data for debugging
            \Log::info('Article data extracted', [
                'url' => $url,
                'title' => $title,
                'description_length' => strlen($description),
                'publish_date' => $publishDate,
                'year' => $year,
            ]);

            return [
                'title' => $title ?: '',
                'description' => $description ?: '',
                'publish_date' => $publishDate ?: date('Y-m-d'),
                'year' => $year ?: date('Y'),
            ];
        } catch (\Exception $e) {
            \Log::error('Scraping error', [
                'url' => $url,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Return fallback data with error message
            return [
                'title' => '',
                'description' => '',
                'publish_date' => date('Y-m-d'),
                'year' => date('Y'),
                'error' => 'Gagal mengambil data: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Extract title from HTML with high accuracy
     */
    private function extractTitle(\DOMXPath $xpath, \DOMDocument $dom): string
    {
        // Priority order: meta tags first (most reliable), then headings
        $selectors = [
            // Open Graph and Twitter Cards (highest priority)
            '//meta[@property="og:title"]/@content',
            '//meta[@name="twitter:title"]/@content',
            '//meta[@name="title"]/@content',
            '//meta[@itemprop="headline"]/@content',
            // Article-specific meta
            '//meta[@property="article:title"]/@content',
            // Standard title tag (but may contain site name)
            '//title',
            // Heading tags in article context
            '//article//h1[1]',
            '//main//h1[1]',
            '//div[contains(@class, "article")]//h1[1]',
            '//div[contains(@class, "post")]//h1[1]',
            '//div[contains(@class, "content")]//h1[1]',
            '//div[contains(@class, "entry")]//h1[1]',
            // Class-based selectors
            '//h1[contains(@class, "title")]',
            '//h1[contains(@class, "heading")]',
            '//h1[contains(@class, "headline")]',
            '//h1[contains(@class, "post-title")]',
            '//h1[contains(@class, "article-title")]',
            // Fallback to first h1
            '//h1[1]',
        ];

        $bestTitle = '';
        $bestScore = 0;

        foreach ($selectors as $selector) {
            try {
                $nodes = $xpath->query($selector);
                if ($nodes && $nodes->length > 0) {
                    $node = $nodes->item(0);
                    $title = '';
                    
                    if ($node->nodeType === XML_ATTRIBUTE_NODE) {
                        $title = trim($node->nodeValue ?? '');
                    } else {
                        $title = trim($node->textContent ?? $node->nodeValue ?? '');
                    }
                    
                    // Clean up title
                    $title = html_entity_decode($title, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                    $title = preg_replace('/\s+/', ' ', $title);
                    $title = trim($title);
                    
                    // Remove common suffixes like " | Site Name"
                    $title = preg_replace('/\s*\|\s*.*$/', '', $title);
                    $title = preg_replace('/\s*-\s*.*$/', '', $title);
                    $title = preg_replace('/\s*:\s*.*$/', '', $title);
                    $title = trim($title);
                    
                    if (!empty($title) && strlen($title) > 5) {
                        // Score based on length and quality
                        $score = strlen($title);
                        // Prefer titles between 20-100 characters
                        if (strlen($title) >= 20 && strlen($title) <= 100) {
                            $score += 50;
                        }
                        // Prefer meta tags (more reliable)
                        if (strpos($selector, 'meta') !== false) {
                            $score += 100;
                        }
                        
                        if ($score > $bestScore) {
                            $bestTitle = $title;
                            $bestScore = $score;
                        }
                    }
                }
            } catch (\Exception $e) {
                continue;
            }
        }

        return $bestTitle;
    }

    /**
     * Extract description from HTML with high accuracy
     */
    private function extractDescription(\DOMXPath $xpath, \DOMDocument $dom): string
    {
        // Priority order: meta tags first, then article content
        $selectors = [
            // Meta tags (highest priority)
            '//meta[@property="og:description"]/@content',
            '//meta[@name="twitter:description"]/@content',
            '//meta[@name="description"]/@content',
            '//meta[@itemprop="description"]/@content',
            // Article content paragraphs
            '//article//p[1]',
            '//article//p[2]',
            '//main//p[1]',
            '//main//p[2]',
            // Content divs
            '//div[contains(@class, "article-content")]//p[1]',
            '//div[contains(@class, "post-content")]//p[1]',
            '//div[contains(@class, "entry-content")]//p[1]',
            '//div[contains(@class, "content")]//p[1]',
            '//div[contains(@class, "article-body")]//p[1]',
            '//div[contains(@class, "post-body")]//p[1]',
            // Class-based
            '//p[contains(@class, "excerpt")]',
            '//p[contains(@class, "summary")]',
            '//p[contains(@class, "lead")]',
            // Fallback to any paragraph
            '//p[1]',
        ];

        $bestDescription = '';
        $bestScore = 0;

        foreach ($selectors as $selector) {
            try {
                $nodes = $xpath->query($selector);
                if ($nodes && $nodes->length > 0) {
                    $node = $nodes->item(0);
                    $description = '';
                    
                    if ($node->nodeType === XML_ATTRIBUTE_NODE) {
                        $description = trim($node->nodeValue ?? '');
                    } else {
                        $description = trim($node->textContent ?? $node->nodeValue ?? '');
                    }
                    
                    // Clean up description
                    $description = html_entity_decode($description, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                    $description = strip_tags($description);
                    $description = preg_replace('/\s+/', ' ', $description);
                    $description = trim($description);
                    
                    // Remove common unwanted patterns
                    $description = preg_replace('/^(Baca juga|Lihat juga|Simak juga|Baca:|Lihat:|Simak:).*$/i', '', $description);
                    $description = preg_replace('/^(Sumber:|Source:).*$/i', '', $description);
                    $description = trim($description);
                    
                    if (!empty($description) && strlen($description) > 50) {
                        // Score based on length and quality
                        $score = strlen($description);
                        // Prefer descriptions between 100-500 characters
                        if (strlen($description) >= 100 && strlen($description) <= 500) {
                            $score += 50;
                        }
                        // Prefer meta tags
                        if (strpos($selector, 'meta') !== false) {
                            $score += 100;
                        }
                        // Prefer article/main context
                        if (strpos($selector, 'article') !== false || strpos($selector, 'main') !== false) {
                            $score += 30;
                        }
                        
                        if ($score > $bestScore) {
                            $bestDescription = $description;
                            $bestScore = $score;
                        }
                    }
                }
            } catch (\Exception $e) {
                continue;
            }
        }

        if (!empty($bestDescription)) {
            // Limit to 4 sentences (max)
            $sentences = preg_split('/(?<=[.!?])\s+/', $bestDescription);
            $limited = implode(' ', array_slice($sentences, 0, 4));
            return trim($limited);
        }

        return '';
    }

    /**
     * Extract publish date from HTML with high accuracy
     */
    private function extractPublishDate(\DOMXPath $xpath, \DOMDocument $dom): string
    {
        // Priority order: meta tags first, then time elements, then text-based
        $selectors = [
            // Meta tags (highest priority)
            '//meta[@property="article:published_time"]/@content',
            '//meta[@property="article:modified_time"]/@content',
            '//meta[@name="publish-date"]/@content',
            '//meta[@name="date"]/@content',
            '//meta[@name="pubdate"]/@content',
            '//meta[@itemprop="datePublished"]/@content',
            '//meta[@itemprop="dateModified"]/@content',
            // Time elements with datetime attribute
            '//time[@datetime]/@datetime',
            '//time[@pubdate]/@datetime',
            '//time/@datetime',
            // Time elements with itemprop
            '//time[@itemprop="datePublished"]/@datetime',
            '//time[@itemprop="dateModified"]/@datetime',
            // Span/div with datetime
            '//span[@datetime]/@datetime',
            '//div[@datetime]/@datetime',
            // Class-based selectors
            '//time[contains(@class, "published")]/@datetime',
            '//time[contains(@class, "date")]/@datetime',
            '//span[contains(@class, "date")]',
            '//span[contains(@class, "published")]',
            '//span[contains(@class, "publish-date")]',
            '//div[contains(@class, "date")]',
            '//div[contains(@class, "published")]',
            '//div[contains(@class, "publish-date")]',
            // Article context
            '//article//time[@datetime]/@datetime',
            '//article//span[contains(@class, "date")]',
        ];

        $dateFormats = [
            'Y-m-d H:i:s',      // 2024-01-15 10:30:00
            'Y-m-d\TH:i:s',     // 2024-01-15T10:30:00
            'Y-m-d\TH:i:s\Z',   // 2024-01-15T10:30:00Z
            'Y-m-d\TH:i:sP',    // 2024-01-15T10:30:00+07:00
            'Y-m-d',            // 2024-01-15
            'd/m/Y',            // 15/01/2024
            'm/d/Y',            // 01/15/2024
            'd-m-Y',            // 15-01-2024
            'Y/m/d',            // 2024/01/15
            'd M Y',            // 15 Jan 2024
            'd F Y',            // 15 January 2024
            'M d, Y',           // Jan 15, 2024
            'F d, Y',           // January 15, 2024
        ];

        foreach ($selectors as $selector) {
            try {
                $nodes = $xpath->query($selector);
                if ($nodes && $nodes->length > 0) {
                    $node = $nodes->item(0);
                    $dateStr = '';
                    
                    if ($node->nodeType === XML_ATTRIBUTE_NODE) {
                        $dateStr = trim($node->nodeValue ?? '');
                    } else {
                        // Try datetime attribute first, then text content
                        $dateStr = trim($node->getAttribute('datetime') ?? $node->textContent ?? $node->nodeValue ?? '');
                    }
                    
                    if (!empty($dateStr)) {
                        // Clean up date string
                        $dateStr = html_entity_decode($dateStr, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                        $dateStr = preg_replace('/\s+/', ' ', $dateStr);
                        $dateStr = trim($dateStr);
                        
                        // Try to parse with various formats
                        $parsedDate = $this->parseDateString($dateStr, $dateFormats);
                        if ($parsedDate) {
                            return $parsedDate;
                        }
                    }
                }
            } catch (\Exception $e) {
                continue;
            }
        }

        // Try regex patterns as fallback
        $html = $dom->saveHTML();
        $datePatterns = [
            '/(\d{4}-\d{2}-\d{2})/',                    // YYYY-MM-DD
            '/(\d{2}\/\d{2}\/\d{4})/',                  // DD/MM/YYYY or MM/DD/YYYY
            '/(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i', // DD Mon YYYY
            '/((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i', // Mon DD, YYYY
        ];

        foreach ($datePatterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $dateStr = $matches[1];
                $parsedDate = $this->parseDateString($dateStr, $dateFormats);
                if ($parsedDate) {
                    return $parsedDate;
                }
            }
        }

        // Fallback to current date
        return date('Y-m-d');
    }

    /**
     * Parse date string with multiple formats
     */
    private function parseDateString(string $dateStr, array $formats): ?string
    {
        // First, try standard DateTime parsing
        try {
            $date = new \DateTime($dateStr);
            return $date->format('Y-m-d');
        } catch (\Exception $e) {
            // Continue to try specific formats
        }

        // Try each format
        foreach ($formats as $format) {
            try {
                $date = \DateTime::createFromFormat($format, $dateStr);
                if ($date) {
                    return $date->format('Y-m-d');
                }
            } catch (\Exception $e) {
                continue;
            }
        }

        // Try to extract date from ISO string
        if (preg_match('/(\d{4}-\d{2}-\d{2})/', $dateStr, $matches)) {
            try {
                $date = new \DateTime($matches[1]);
                return $date->format('Y-m-d');
            } catch (\Exception $e) {
                // Ignore
            }
        }

        return null;
    }

    /**
     * Extract year from date string with high accuracy
     */
    private function extractYear(?string $dateStr): int
    {
        if (empty($dateStr)) {
            return (int) date('Y');
        }

        try {
            // Try to parse as date first
            $date = new \DateTime($dateStr);
            $year = (int) $date->format('Y');
            
            // Validate year is reasonable (between 2000 and current year + 1)
            $currentYear = (int) date('Y');
            if ($year >= 2000 && $year <= $currentYear + 1) {
                return $year;
            }
        } catch (\Exception $e) {
            // Try to extract year from string using regex
            if (preg_match('/(\d{4})/', $dateStr, $matches)) {
                $year = (int) $matches[1];
                $currentYear = (int) date('Y');
                if ($year >= 2000 && $year <= $currentYear + 1) {
                    return $year;
                }
            }
        }

        return (int) date('Y');
    }

    /**
     * Extract domain from URL
     */
    private function extractDomainFromUrl(string $url): string
    {
        $parsed = parse_url($url);
        $host = $parsed['host'] ?? '';
        $host = preg_replace('/^www\./', '', $host);
        $parts = explode('.', $host);
        if (count($parts) >= 2) {
            return ucfirst($parts[count($parts) - 2]) . ' ' . ucfirst($parts[count($parts) - 1]);
        }
        return $host;
    }

    /**
     * Get preview image from URL (Open Graph image)
     */
    public function getPreviewImage(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'url' => 'required|url',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'URL tidak valid',
                'errors' => $validator->errors(),
            ], 400);
        }

        $url = $request->input('url');

        try {
            // Fetch HTML content
            $response = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                ])
                ->get($url);

            if (!$response->successful()) {
                throw new \Exception('Gagal mengambil konten dari URL: HTTP ' . $response->status());
            }

            $html = $response->body();
            
            if (empty($html)) {
                throw new \Exception('Konten HTML kosong');
            }

            // Load HTML into DOMDocument
            libxml_use_internal_errors(true);
            $dom = new \DOMDocument('1.0', 'UTF-8');
            $dom->encoding = 'UTF-8';
            
            $encoding = mb_detect_encoding($html, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
            if ($encoding && $encoding !== 'UTF-8') {
                $html = mb_convert_encoding($html, 'UTF-8', $encoding);
            }
            
            @$dom->loadHTML('<?xml encoding="UTF-8">' . $html);
            libxml_clear_errors();

            $xpath = new \DOMXPath($dom);

            // Helper function to make absolute URL
            $makeAbsoluteUrl = function($imageUrl, $baseUrl) {
                if (empty($imageUrl)) {
                    return null;
                }
                
                // Already absolute
                if (strpos($imageUrl, 'http://') === 0 || strpos($imageUrl, 'https://') === 0) {
                    return $imageUrl;
                }
                
                // Protocol relative (//example.com/image.jpg)
                if (strpos($imageUrl, '//') === 0) {
                    $parsed = parse_url($baseUrl);
                    return $parsed['scheme'] . ':' . $imageUrl;
                }
                
                // Absolute path (/image.jpg)
                if (strpos($imageUrl, '/') === 0) {
                    $parsed = parse_url($baseUrl);
                    return $parsed['scheme'] . '://' . $parsed['host'] . $imageUrl;
                }
                
                // Relative path (image.jpg or path/image.jpg)
                $parsed = parse_url($baseUrl);
                $path = isset($parsed['path']) ? dirname($parsed['path']) : '';
                if ($path === '/' || $path === '.') {
                    $path = '';
                }
                return $parsed['scheme'] . '://' . $parsed['host'] . $path . '/' . ltrim($imageUrl, '/');
            };

            $parsedUrl = parse_url($url);
            $baseUrl = $parsedUrl['scheme'] . '://' . $parsedUrl['host'] . (isset($parsedUrl['path']) ? dirname($parsedUrl['path']) : '');

            // Try to extract Open Graph image or Twitter Card image (highest priority)
            // But skip if it looks like a logo/favicon
            $imageSelectors = [
                '//meta[@property="og:image"]/@content',
                '//meta[@property="og:image:secure_url"]/@content',
                '//meta[@name="twitter:image"]/@content',
                '//meta[@name="twitter:image:src"]/@content',
                '//meta[@itemprop="image"]/@content',
                '//link[@rel="image_src"]/@href',
            ];

            foreach ($imageSelectors as $selector) {
                $nodes = $xpath->query($selector);
                if ($nodes && $nodes->length > 0) {
                    $imageUrl = trim($nodes->item(0)->nodeValue);
                    
                    if (!empty($imageUrl)) {
                        // Skip if it looks like a logo or favicon
                        $imageUrlLower = strtolower($imageUrl);
                        $skipPatterns = ['logo', 'icon', 'favicon', 'avatar', 'brand', 'header'];
                        $isLogo = false;
                        foreach ($skipPatterns as $pattern) {
                            if (stripos($imageUrlLower, $pattern) !== false) {
                                $isLogo = true;
                                break;
                            }
                        }
                        
                        // Also check if image is very small (likely a logo/favicon)
                        // We'll check this later when we can get dimensions, but for now skip if filename suggests it
                        if (!$isLogo) {
                            $absoluteUrl = $makeAbsoluteUrl($imageUrl, $url);
                            if ($absoluteUrl) {
                                // Check if URL suggests it's a content image (not logo)
                                $path = parse_url($absoluteUrl, PHP_URL_PATH);
                                $filename = basename($path);
                                $filenameLower = strtolower($filename);
                                
                                // Skip if filename suggests logo/icon
                                if (stripos($filenameLower, 'logo') === false && 
                                    stripos($filenameLower, 'icon') === false &&
                                    stripos($filenameLower, 'favicon') === false) {
                                    return response()->json([
                                        'success' => true,
                                        'imageUrl' => $absoluteUrl,
                                    ]);
                                }
                            }
                        }
                    }
                }
            }

            // Fallback: Try to find images in article content (prioritize larger, relevant images)
            // Search in article, main content, and content divs
            $contentImageSelectors = [
                '//article//img[@src]',
                '//main//img[@src]',
                '//div[contains(@class, "content")]//img[@src]',
                '//div[contains(@class, "article")]//img[@src]',
                '//div[contains(@class, "post")]//img[@src]',
                '//div[contains(@class, "entry")]//img[@src]',
                '//div[contains(@class, "body")]//img[@src]',
                '//figure//img[@src]',
                '//picture//img[@src]',
            ];

            $foundImages = [];
            foreach ($contentImageSelectors as $selector) {
                $imageNodes = $xpath->query($selector);
                if ($imageNodes && $imageNodes->length > 0) {
                    foreach ($imageNodes as $imgNode) {
                        $src = $imgNode->getAttribute('src');
                        $alt = strtolower($imgNode->getAttribute('alt') ?? '');
                        $title = strtolower($imgNode->getAttribute('title') ?? '');
                        $width = $imgNode->getAttribute('width');
                        $height = $imgNode->getAttribute('height');
                        $class = strtolower($imgNode->getAttribute('class') ?? '');
                        $parentClass = strtolower($imgNode->parentNode->getAttribute('class') ?? '');
                        
                        if (empty($src)) {
                            continue;
                        }

                        // Skip small icons, logos, decorative images, and header/nav images
                        $skipPatterns = [
                            'icon', 'logo', 'avatar', 'header', 'nav', 'navbar', 
                            'menu', 'banner', 'ad', 'advertisement', 'widget',
                            'sidebar', 'footer', 'social', 'share', 'button',
                            'badge', 'thumbnail-small', 'thumb-sm', 'favicon',
                            'brand', 'site-logo', 'site-icon'
                        ];
                        
                        $shouldSkip = false;
                        foreach ($skipPatterns as $pattern) {
                            if (stripos($class, $pattern) !== false || 
                                stripos($parentClass, $pattern) !== false ||
                                stripos($alt, $pattern) !== false ||
                                stripos($title, $pattern) !== false) {
                                $shouldSkip = true;
                                break;
                            }
                        }
                        
                        // Also check image filename and URL
                        $imageFilename = strtolower(basename(parse_url($src, PHP_URL_PATH)));
                        foreach ($skipPatterns as $pattern) {
                            if (stripos($imageFilename, $pattern) !== false ||
                                stripos($src, $pattern) !== false) {
                                $shouldSkip = true;
                                break;
                            }
                        }
                        
                        if ($shouldSkip) {
                            continue;
                        }
                        
                        // Skip very small images (likely icons or decorative elements)
                        // Minimum size for content images
                        if (!empty($width) && (int)$width < 200) {
                            continue;
                        }
                        if (!empty($height) && (int)$height < 200) {
                            continue;
                        }
                        
                        // Skip square images that are too small (likely icons)
                        if (!empty($width) && !empty($height) && 
                            abs((int)$width - (int)$height) < 50 && 
                            (int)$width < 300) {
                            continue;
                        }
                        
                        // Skip images in header/navbar areas (check parent hierarchy)
                        $parent = $imgNode->parentNode;
                        $depth = 0;
                        while ($parent && $depth < 5) {
                            $parentClass = strtolower($parent->getAttribute('class') ?? '');
                            $parentId = strtolower($parent->getAttribute('id') ?? '');
                            $parentTag = strtolower($parent->tagName ?? '');
                            
                            if (stripos($parentClass, 'header') !== false ||
                                stripos($parentClass, 'nav') !== false ||
                                stripos($parentClass, 'menu') !== false ||
                                stripos($parentClass, 'banner') !== false ||
                                stripos($parentId, 'header') !== false ||
                                stripos($parentId, 'nav') !== false ||
                                $parentTag === 'header' ||
                                $parentTag === 'nav') {
                                continue 2; // Skip this image
                            }
                            
                            $parent = $parent->parentNode;
                            $depth++;
                        }

                        // Calculate image score based on relevance
                        $score = 0;
                        
                        // Check if image is related to mango (based on alt, title, class, or surrounding text)
                        $mangoKeywords = ['mangga', 'mango', 'buah', 'fruit', 'pohon', 'tree', 'tanaman', 'plant', 'panen', 'harvest', 'kebun', 'garden', 'indramayu', 'agrimania', 'gedong', 'cengkir', 'irwin', 'bibit', 'seedling', 'budidaya', 'cultivation'];
                        $textContent = $alt . ' ' . $title . ' ' . $class . ' ' . $parentClass;
                        
                        // Also check surrounding text (parent and sibling nodes)
                        $parentText = '';
                        if ($imgNode->parentNode) {
                            $parentText = strtolower($imgNode->parentNode->textContent ?? '');
                        }
                        $textContent .= ' ' . $parentText;
                        
                        $mangoScore = 0;
                        foreach ($mangoKeywords as $keyword) {
                            if (stripos($textContent, $keyword) !== false) {
                                $mangoScore += 10; // Boost score for mango-related images
                            }
                        }
                        $score += $mangoScore;
                        
                        // Also check image filename for mango-related terms
                        $imageFilename = strtolower(basename(parse_url($src, PHP_URL_PATH)));
                        foreach ($mangoKeywords as $keyword) {
                            if (stripos($imageFilename, $keyword) !== false) {
                                $score += 5; // Additional boost if filename contains mango keyword
                            }
                        }

                        // Prefer larger images (content images are usually larger)
                        if (!empty($width) && (int)$width >= 400) {
                            $score += 8; // Large images are more likely to be content images
                        } elseif (!empty($width) && (int)$width >= 300) {
                            $score += 5;
                        } elseif (!empty($width) && (int)$width >= 200) {
                            $score += 2;
                        }
                        
                        if (!empty($height) && (int)$height >= 400) {
                            $score += 8;
                        } elseif (!empty($height) && (int)$height >= 300) {
                            $score += 5;
                        } elseif (!empty($height) && (int)$height >= 200) {
                            $score += 2;
                        }
                        
                        // Prefer images with aspect ratio suitable for content (not too wide or too tall)
                        if (!empty($width) && !empty($height) && (int)$width > 0 && (int)$height > 0) {
                            $aspectRatio = (int)$width / (int)$height;
                            if ($aspectRatio >= 0.8 && $aspectRatio <= 2.0) {
                                $score += 3; // Good aspect ratio for content images
                            }
                        }
                        
                        // Prefer images with alt text (more likely to be content images)
                        if (!empty($alt)) {
                            $score += 3;
                        }

                        // Prefer images in article/main content (highest priority locations)
                        if (strpos($selector, 'article') !== false) {
                            $score += 10; // Article content is most relevant - highest priority
                        }
                        if (strpos($selector, 'main') !== false) {
                            $score += 8; // Main content is also very relevant
                        }
                        
                        // Prefer images in content/body/post/entry divs
                        if (strpos($selector, 'content') !== false ||
                            strpos($selector, 'body') !== false ||
                            strpos($selector, 'post') !== false ||
                            strpos($selector, 'entry') !== false) {
                            $score += 6;
                        }
                        
                        // Prefer images in figure/picture tags (semantic HTML for content images)
                        if (strpos($selector, 'figure') !== false || strpos($selector, 'picture') !== false) {
                            $score += 8;
                        }
                        
                        // Heavily penalize images that might be logos based on position
                        // Images near the top of the page are more likely to be logos
                        // We can't easily check position, but we can check if parent has header-like classes
                        if (stripos($parentClass, 'site') !== false && 
                            (stripos($parentClass, 'header') !== false || stripos($parentClass, 'brand') !== false)) {
                            $score -= 20; // Heavy penalty for site header/brand images
                        }

                        // Prefer featured/hero images
                        if (stripos($class, 'featured') !== false || 
                            stripos($class, 'hero') !== false || 
                            stripos($class, 'cover') !== false ||
                            stripos($parentClass, 'featured') !== false) {
                            $score += 8;
                        }

                        $absoluteUrl = $makeAbsoluteUrl($src, $url);
                        if ($absoluteUrl) {
                            $foundImages[] = [
                                'url' => $absoluteUrl,
                                'score' => $score,
                                'width' => (int)$width,
                                'height' => (int)$height,
                            ];
                        }
                    }
                }
            }

            // Sort by score (highest first) and return the best image
            if (!empty($foundImages)) {
                usort($foundImages, function($a, $b) {
                    if ($a['score'] == $b['score']) {
                        // If scores are equal, prefer larger images
                        $aSize = $a['width'] * $a['height'];
                        $bSize = $b['width'] * $b['height'];
                        return $bSize - $aSize;
                    }
                    return $b['score'] - $a['score'];
                });

                // Filter out images with negative scores (likely logos)
                $validImages = array_filter($foundImages, function($img) {
                    return $img['score'] > 0;
                });

                if (!empty($validImages)) {
                    // Re-index array after filtering
                    $validImages = array_values($validImages);
                    $bestImage = $validImages[0];
                    
                    \Log::info('Using content image', [
                        'url' => $url, 
                        'imageUrl' => $bestImage['url'],
                        'score' => $bestImage['score'],
                        'totalFound' => count($foundImages),
                        'validImages' => count($validImages)
                    ]);
                    
                    return response()->json([
                        'success' => true,
                        'imageUrl' => $bestImage['url'],
                    ]);
                }
            }


            // If no image found at all, return null
            \Log::info('No preview image found', ['url' => $url]);
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada gambar preview ditemukan',
                'imageUrl' => null,
            ]);

        } catch (\Exception $e) {
            \Log::error('Failed to get preview image', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil gambar preview: ' . $e->getMessage(),
                'imageUrl' => null,
            ], 500);
        }
    }
}
