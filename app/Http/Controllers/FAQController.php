<?php

namespace App\Http\Controllers;

use App\Models\FAQ;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class FAQController extends Controller
{
    /**
     * Display a listing of FAQs (K-Petani only for management, public for viewing)
     */
    public function index(Request $request): Response
    {
        $user = auth()->user();
        
        // For K-Petani: show management interface
        if ($user && $user->role === 'k-petani') {
            $search = $request->get('search', '');
            $category = $request->get('category', 'all');
            
            $query = FAQ::query();
            
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('question', 'like', "%{$search}%")
                      ->orWhere('answer', 'like', "%{$search}%");
                });
            }
            
            if ($category !== 'all') {
                $query->where('category', $category);
            }
            
            $faqs = $query->orderBy('order', 'asc')
                ->orderBy('created_at', 'desc')
                ->with(['creator', 'updater'])
                ->get();
            
            // Get unique categories
            $categories = FAQ::whereNotNull('category')
                ->distinct()
                ->pluck('category')
                ->toArray();
            
            return Inertia::render('CustomerService/FAQManagement', [
                'faqs' => $faqs,
                'categories' => $categories,
                'filters' => [
                    'search' => $search,
                    'category' => $category,
                ],
            ]);
        }
        
        // For public/guest: show only active FAQs
        $category = $request->get('category', 'all');
        
        $query = FAQ::where('is_active', true);
        
        if ($category !== 'all') {
            $query->where('category', $category);
        }
        
        $faqs = $query->orderBy('order', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();
        
        // Get unique categories
        $categories = FAQ::where('is_active', true)
            ->whereNotNull('category')
            ->distinct()
            ->pluck('category')
            ->toArray();
        
        return response()->json([
            'success' => true,
            'faqs' => $faqs,
            'categories' => $categories,
        ]);
    }

    /**
     * Store a newly created FAQ (K-Petani only)
     */
    public function store(Request $request)
    {
        $user = auth()->user();
        
        if (!$user || $user->role !== 'k-petani') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }
        
        $validator = Validator::make($request->all(), [
            'question' => 'required|string|max:500',
            'answer' => 'required|string|max:5000',
            'category' => 'nullable|string|max:255',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $faq = FAQ::create([
            'question' => $request->question,
            'answer' => $request->answer,
            'category' => $request->category,
            'order' => $request->order ?? 0,
            'is_active' => $request->is_active ?? true,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'FAQ berhasil dibuat',
            'faq' => $faq->load(['creator', 'updater']),
        ]);
    }

    /**
     * Update the specified FAQ (K-Petani only)
     */
    public function update(Request $request, $id)
    {
        $user = auth()->user();
        
        if (!$user || $user->role !== 'k-petani') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }
        
        $faq = FAQ::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'question' => 'required|string|max:500',
            'answer' => 'required|string|max:5000',
            'category' => 'nullable|string|max:255',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $faq->update([
            'question' => $request->question,
            'answer' => $request->answer,
            'category' => $request->category,
            'order' => $request->order ?? $faq->order,
            'is_active' => $request->is_active ?? $faq->is_active,
            'updated_by' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'FAQ berhasil diupdate',
            'faq' => $faq->fresh(['creator', 'updater']),
        ]);
    }

    /**
     * Remove the specified FAQ (K-Petani only)
     */
    public function destroy($id)
    {
        $user = auth()->user();
        
        if (!$user || $user->role !== 'k-petani') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }
        
        $faq = FAQ::findOrFail($id);
        $faq->delete();

        return response()->json([
            'success' => true,
            'message' => 'FAQ berhasil dihapus',
        ]);
    }

    /**
     * Get FAQs for public display (guest)
     */
    public function getPublicFAQs(Request $request)
    {
        $category = $request->get('category', 'all');
        
        $query = FAQ::where('is_active', true);
        
        if ($category !== 'all') {
            $query->where('category', $category);
        }
        
        $faqs = $query->orderBy('order', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();
        
        // Get unique categories
        $categories = FAQ::where('is_active', true)
            ->whereNotNull('category')
            ->distinct()
            ->pluck('category')
            ->toArray();
        
        return response()->json([
            'success' => true,
            'faqs' => $faqs,
            'categories' => $categories,
        ]);
    }
}
