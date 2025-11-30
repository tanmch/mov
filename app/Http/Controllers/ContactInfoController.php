<?php

namespace App\Http\Controllers;

use App\Models\ContactInfo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class ContactInfoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $contactInfo = ContactInfo::first();
        
        // For K-Petani, also load guest chats and FAQs
        $guestPrivateChats = [];
        $faqs = [];
        $categories = [];
        
        if (auth()->check() && auth()->user()->role === 'k-petani') {
            try {
                // Get all guest chats (visible to all K-Petani) - user_1_id is null
                $kPetani = auth()->user();
                
                // Query guest chats: user_1_id is null AND user_2_id is null AND user_2_email is not null
                // IMPORTANT: Include ALL guest chats regardless of taken_by_id status
                // This ensures chats remain visible even after K-Petani replies
                $guestPrivateChatsQuery = \App\Models\PrivateChat::whereNull('user_1_id')
                    ->whereNull('user_2_id')
                    ->whereNotNull('user_2_email')
                    ->where('is_active', true);
                
                // Get all guest chats (including taken ones)
                $allGuestChats = $guestPrivateChatsQuery
                    ->with(['messages' => function ($query) {
                        $query->latest()->limit(1);
                    }])
                    ->with('takenBy:id,name,email') // Load taken_by user info
                    ->orderByRaw('COALESCE(last_message_at, created_at) DESC') // Use last_message_at or created_at as fallback
                    ->get();
                
                $guestPrivateChats = $allGuestChats->map(function ($chat) use ($kPetani) {
                        $isTaken = $chat->taken_by_id !== null;
                        $isTakenByMe = $chat->taken_by_id === $kPetani->id;
                        $canTake = !$isTaken; // Can take if not taken yet
                        
                        // Get last message (most recent)
                        $lastMessage = $chat->messages->first();
                        
                        return [
                            'id' => $chat->id,
                            'guest_name' => $chat->user_2_name,
                            'guest_email' => $chat->user_2_email,
                            'last_message' => $lastMessage ? [
                                'id' => $lastMessage->id,
                                'message' => $lastMessage->message,
                                'sender_id' => $lastMessage->sender_id,
                                'sender_name' => $lastMessage->sender_name,
                                'sender_email' => $lastMessage->sender_email,
                                'created_at' => $lastMessage->created_at?->toISOString(),
                                'is_read' => $lastMessage->is_read ?? false,
                            ] : null,
                            'last_message_at' => $chat->last_message_at?->toISOString(),
                            'taken_by_id' => $chat->taken_by_id,
                            'taken_at' => $chat->taken_at?->toISOString(),
                            'taken_by' => $chat->takenBy ? [
                                'id' => $chat->takenBy->id,
                                'name' => $chat->takenBy->name,
                                'email' => $chat->takenBy->email,
                            ] : null,
                            'is_taken' => $isTaken,
                            'is_taken_by_me' => $isTakenByMe,
                            'can_take' => $canTake,
                        ];
                    });
                
                // Debug log (only in development)
                if (config('app.debug')) {
                    \Log::info('Guest chats loaded for K-Petani', [
                        'k_petani_id' => $kPetani->id,
                        'guest_chats_count' => $guestPrivateChats->count(),
                        'guest_chats' => $guestPrivateChats->map(function($chat) {
                            return [
                                'id' => $chat['id'],
                                'guest_name' => $chat['guest_name'],
                                'guest_email' => $chat['guest_email'],
                                'has_last_message' => $chat['last_message'] !== null,
                            ];
                        })->toArray(),
                    ]);
                }

                // Get FAQs for management
                $faqs = \App\Models\FAQ::orderBy('order', 'asc')
                    ->orderBy('created_at', 'desc')
                    ->with(['creator', 'updater'])
                    ->get()
                    ->map(function ($faq) {
                        return [
                            'id' => $faq->id,
                            'question' => $faq->question,
                            'answer' => $faq->answer,
                            'category' => $faq->category,
                            'order' => $faq->order,
                            'is_active' => $faq->is_active,
                            'created_at' => $faq->created_at?->toISOString(),
                            'updated_at' => $faq->updated_at?->toISOString(),
                            'creator' => $faq->creator ? [
                                'name' => $faq->creator->name,
                            ] : null,
                            'updater' => $faq->updater ? [
                                'name' => $faq->updater->name,
                            ] : null,
                        ];
                    });

                // Get unique categories
                $categories = \App\Models\FAQ::whereNotNull('category')
                    ->distinct()
                    ->pluck('category')
                    ->toArray();
            } catch (\Exception $e) {
                // If table doesn't exist or other error, return empty array
                \Log::warning('Failed to load guest chats or FAQs: ' . $e->getMessage());
                $guestPrivateChats = [];
                $faqs = [];
                $categories = [];
            }
        }
        
        return Inertia::render('CustomerService', [
            'contactInfo' => $contactInfo ? [
                'id' => $contactInfo->id,
                'whatsapp' => $contactInfo->whatsapp,
                'phone' => $contactInfo->phone,
                'email' => $contactInfo->email,
                'operational_hours' => $contactInfo->operational_hours,
            ] : null,
            'guestPrivateChats' => $guestPrivateChats,
            'faqs' => $faqs,
            'categories' => $categories,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'whatsapp' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'operational_hours' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        // Check if contact info already exists
        $contactInfo = ContactInfo::first();
        
        if ($contactInfo) {
            $contactInfo->update($request->only(['whatsapp', 'phone', 'email', 'operational_hours']));
        } else {
            $contactInfo = ContactInfo::create($request->only(['whatsapp', 'phone', 'email', 'operational_hours']));
        }

        return back()->with('success', 'Informasi kontak berhasil disimpan!');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $validator = Validator::make($request->all(), [
            'whatsapp' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'operational_hours' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $contactInfo = ContactInfo::findOrFail($id);
        $contactInfo->update($request->only(['whatsapp', 'phone', 'email', 'operational_hours']));

        return back()->with('success', 'Informasi kontak berhasil diupdate!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $contactInfo = ContactInfo::findOrFail($id);
        $contactInfo->delete();

        return back()->with('success', 'Informasi kontak berhasil dihapus!');
    }
}
