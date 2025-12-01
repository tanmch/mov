<?php

namespace App\Http\Controllers;

use App\Models\ChatGroup;
use App\Models\ChatParticipant;
use App\Models\PrivateChat;
use App\Models\Message;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    // Static cache to prevent duplicate notifications within same request
    private static $notificationCache = [];
    
    /**
     * Helper function to create chat notification for group chat
     */
    private function createChatNotificationForGroup($groupId, $message, $sender)
    {
        try {
            // Prevent duplicate calls in same request
            $cacheKey = "group_{$groupId}_msg_{$message->id}";
            if (isset(self::$notificationCache[$cacheKey])) {
                return; // Already processed in this request
            }
            self::$notificationCache[$cacheKey] = true;
            
            $group = ChatGroup::find($groupId);
            if (!$group) return;

            $participants = ChatParticipant::where('chat_group_id', $group->id)
                ->where('user_id', '!=', $sender->id ?? 0)
                ->where('is_active', true)
                ->with('user')
                ->get();
            
            foreach ($participants as $participant) {
                if ($participant->user) {
                    // Check if notification already exists for this message and user (cooldown 2 minutes)
                    $existingNotification = Notification::where('user_id', $participant->user->id)
                        ->where('type', 'chat')
                        ->where('related_type', 'ChatGroup')
                        ->where('related_id', $group->id)
                        ->where('created_at', '>=', now()->subMinutes(2))
                        ->get()
                        ->first(function ($notif) use ($message) {
                            $data = $notif->data ?? [];
                            return isset($data['message_id']) && $data['message_id'] == $message->id;
                        });
                    
                    if ($existingNotification) {
                        continue; // Skip if notification already exists within 2 minutes
                    }
                    
                    Notification::create([
                        'user_id' => $participant->user->id,
                        'title' => 'Pesan Baru di Grup',
                        'message' => "{$sender->name} mengirim pesan di grup: " . substr($message->message, 0, 100) . (strlen($message->message) > 100 ? '...' : ''),
                        'type' => 'chat',
                        'related_type' => 'ChatGroup',
                        'related_id' => $group->id,
                        'data' => [
                            'chat_id' => $group->id,
                            'message_id' => $message->id,
                            'sender_name' => $sender->name,
                            'sender_id' => $sender->id,
                            'is_group' => true,
                        ],
                        'is_read' => false,
                    ]);
                }
            }
        } catch (\Exception $e) {
            \Log::error('Failed to create group chat notification: ' . $e->getMessage());
        }
    }

    /**
     * Helper function to create chat notification for private chat
     */
    private function createChatNotification($chat, $message, $sender)
    {
        try {
            if ($message->private_chat_id) {
                // Prevent duplicate calls in same request
                $cacheKey = "private_{$message->private_chat_id}_msg_{$message->id}";
                if (isset(self::$notificationCache[$cacheKey])) {
                    return; // Already processed in this request
                }
                self::$notificationCache[$cacheKey] = true;
                
                // Private chat message
                $privateChat = PrivateChat::find($message->private_chat_id);
                if (!$privateChat) return;
                
                $isGuestChat = is_null($privateChat->user_1_id) && is_null($privateChat->user_2_id) && !is_null($privateChat->user_2_email);
                
                if ($isGuestChat) {
                    // Guest chat - notify all K-Petani (except sender if sender is K-Petani)
                    $kPetaniUsers = User::where('role', 'k-petani')
                        ->where('is_active', true)
                        ->where('id', '!=', $sender->id ?? 0)
                        ->get();
                    
                    foreach ($kPetaniUsers as $recipient) {
                        // Check if notification already exists for this message and user (cooldown 2 minutes)
                        $existingNotification = Notification::where('user_id', $recipient->id)
                            ->where('type', 'chat')
                            ->where('related_type', 'PrivateChat')
                            ->where('related_id', $privateChat->id)
                            ->where('created_at', '>=', now()->subMinutes(2))
                            ->get()
                            ->first(function ($notif) use ($message) {
                                $data = $notif->data ?? [];
                                return isset($data['message_id']) && $data['message_id'] == $message->id;
                            });
                        
                        if ($existingNotification) {
                            continue; // Skip if notification already exists within 2 minutes
                        }
                        
                        Notification::create([
                            'user_id' => $recipient->id,
                            'title' => 'Pesan Baru dari Guest',
                            'message' => "{$privateChat->user_2_name} mengirim pesan: " . substr($message->message, 0, 100) . (strlen($message->message) > 100 ? '...' : ''),
                            'type' => 'chat',
                            'related_type' => 'PrivateChat',
                            'related_id' => $privateChat->id,
                            'data' => [
                                'chat_id' => $privateChat->id,
                                'message_id' => $message->id,
                                'sender_name' => $privateChat->user_2_name,
                                'sender_email' => $privateChat->user_2_email,
                                'is_guest' => true,
                            ],
                            'is_read' => false,
                        ]);
                    }
                } else {
                    // Regular private chat - notify the other participant
                    $recipientId = null;
                    $recipientName = null;
                    
                    if ($privateChat->user_1_id == ($sender->id ?? 0)) {
                        $recipientId = $privateChat->user_2_id;
                        $recipientName = $privateChat->user_2_name;
                    } elseif ($privateChat->user_2_id == ($sender->id ?? 0)) {
                        $recipientId = $privateChat->user_1_id;
                        $recipientName = $privateChat->user_1_name;
                    }
                    
                    if ($recipientId) {
                        // Check if notification already exists for this message and user (cooldown 2 minutes)
                        $existingNotification = Notification::where('user_id', $recipientId)
                            ->where('type', 'chat')
                            ->where('related_type', 'PrivateChat')
                            ->where('related_id', $privateChat->id)
                            ->where('created_at', '>=', now()->subMinutes(2))
                            ->get()
                            ->first(function ($notif) use ($message) {
                                $data = $notif->data ?? [];
                                return isset($data['message_id']) && $data['message_id'] == $message->id;
                            });
                        
                        if ($existingNotification) {
                            return; // Skip if notification already exists within 2 minutes
                        }
                        
                        Notification::create([
                            'user_id' => $recipientId,
                            'title' => 'Pesan Baru',
                            'message' => "{$sender->name} mengirim pesan: " . substr($message->message, 0, 100) . (strlen($message->message) > 100 ? '...' : ''),
                            'type' => 'chat',
                            'related_type' => 'PrivateChat',
                            'related_id' => $privateChat->id,
                            'data' => [
                                'chat_id' => $privateChat->id,
                                'message_id' => $message->id,
                                'sender_name' => $sender->name,
                                'sender_id' => $sender->id,
                                'is_private' => true,
                            ],
                            'is_read' => false,
                        ]);
                    }
                }
            }
        } catch (\Exception $e) {
            \Log::error('Failed to create chat notification: ' . $e->getMessage());
        }
    }

    /**
     * Display chat interface (grup chat dan chat pribadi)
     */
    public function index(): Response
    {
        $user = auth()->user();
        $contactInfo = \App\Models\ContactInfo::first();

        // Get default group chat (MOV Center Group)
        $defaultGroup = ChatGroup::where('type', 'public')
            ->where('is_active', true)
            ->first();

        // If no default group exists, create it
        if (!$defaultGroup) {
            $defaultGroup = ChatGroup::create([
                'name' => 'Grup MOV Center',
                'description' => 'Grup diskusi untuk Petani dan K-Petani',
                'type' => 'public',
                'created_by' => $user?->id,
                'is_active' => true,
            ]);
        }

        // Ensure current user is a participant of the default group
        if ($user && $defaultGroup) {
            $existingParticipant = ChatParticipant::where('chat_group_id', $defaultGroup->id)
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->first();
            
            if (!$existingParticipant) {
                ChatParticipant::create([
                    'chat_group_id' => $defaultGroup->id,
                    'user_id' => $user->id,
                    'role' => 'member',
                    'joined_at' => now(),
                    'is_active' => true,
                ]);
            }
        }

        // Get user's groups (excluding default group to prevent duplication)
        $userGroups = [];
        if ($user) {
            $userGroups = ChatGroup::whereHas('participants', function ($query) use ($user) {
                $query->where('user_id', $user->id)->where('is_active', true);
            })
            ->where('is_active', true)
            ->where('id', '!=', $defaultGroup?->id) // Exclude default group
            ->with(['participants.user', 'messages' => function ($query) {
                $query->latest()->limit(1);
            }])
            ->get();
        }

        // Get user's private chats
        $privateChats = [];
        if ($user) {
            $privateChats = PrivateChat::where(function ($query) use ($user) {
                $query->where('user_1_id', $user->id)
                    ->orWhere('user_2_id', $user->id);
            })
            ->where('is_active', true)
            ->with(['user1', 'user2', 'messages' => function ($query) {
                $query->latest()->limit(1);
            }])
            ->orderBy('last_message_at', 'desc')
            ->get()
            ->map(function ($chat) use ($user) {
                $otherUser = $chat->getOtherUser($user->id);
                return [
                    'id' => $chat->id,
                    'other_user' => $otherUser ? [
                        'id' => $otherUser->id ?? null,
                        'name' => $otherUser->name ?? ($chat->user_1_id == $user->id ? $chat->user_2_name : $chat->user_1_name),
                        'email' => $otherUser->email ?? ($chat->user_1_id == $user->id ? $chat->user_2_email : $chat->user_1_email),
                    ] : null,
                    'last_message' => $chat->messages->first() ? [
                        'id' => $chat->messages->first()->id,
                        'message' => $chat->messages->first()->message,
                        'created_at' => $chat->messages->first()->created_at?->toISOString(),
                    ] : null,
                    'last_message_at' => $chat->last_message_at?->toISOString(),
                ];
            });
        }

        return Inertia::render('Chat/Index', [
            'contactInfo' => $contactInfo ? [
                'id' => $contactInfo->id,
                'whatsapp' => $contactInfo->whatsapp,
                'phone' => $contactInfo->phone,
                'email' => $contactInfo->email,
                'operational_hours' => $contactInfo->operational_hours,
            ] : null,
            'defaultGroup' => [
                'id' => $defaultGroup->id,
                'name' => $defaultGroup->name,
                'description' => $defaultGroup->description,
            ],
            'userGroups' => $userGroups,
            'privateChats' => $privateChats,
        ]);
    }

    /**
     * Get group messages
     */
    public function getGroupMessages($groupId)
    {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }
        
        // Check if user is participant
        $participant = ChatParticipant::where('chat_group_id', $groupId)
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        if (!$participant) {
            // Auto-join user to default group
            $participant = ChatParticipant::create([
                'chat_group_id' => $groupId,
                'user_id' => $user->id,
                'role' => 'member',
                'joined_at' => now(),
                'is_active' => true,
            ]);
        }

        // Get ALL messages from the group (no participant filter needed for public groups)
        // All authenticated users can see all messages in the group
        // Get last 100 messages ordered by created_at DESC, then reverse to show oldest first
        $messages = Message::where('chat_group_id', $groupId)
            ->where('is_deleted', false)
            ->select('id', 'sender_id', 'sender_name', 'sender_email', 'message', 'message_type', 'created_at', 'is_read')
            ->orderBy('created_at', 'desc') // Get newest first
            ->limit(100) // Limit to last 100 messages for performance
            ->get()
            ->reverse() // Reverse to show oldest first in UI
            ->values() // Re-index array
            ->map(function ($message) {
                return [
                    'id' => $message->id,
                    'sender_id' => $message->sender_id,
                    'sender_name' => $message->sender_name,
                    'sender_email' => $message->sender_email,
                    'message' => $message->message,
                    'message_type' => $message->message_type,
                    'created_at' => $message->created_at->toISOString(),
                    'is_read' => $message->is_read,
                ];
            });

        return response()->json([
            'success' => true,
            'messages' => $messages,
            'debug' => [
                'group_id' => $groupId,
                'user_id' => $user->id,
                'participant_id' => $participant->id,
                'message_count' => $messages->count(),
            ],
        ]);
    }

    /**
     * Send message to group
     */
    public function sendGroupMessage(Request $request, $groupId)
    {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        // Allow all authenticated users (Petani and K-Petani) to send messages to group
        // No restriction needed for MOV Center group
        
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Get or create participant
        $participant = ChatParticipant::where('chat_group_id', $groupId)
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        if (!$participant) {
            $participant = ChatParticipant::create([
                'chat_group_id' => $groupId,
                'user_id' => $user->id,
                'role' => 'member',
                'joined_at' => now(),
                'is_active' => true,
            ]);
        }

        $message = Message::create([
            'chat_group_id' => $groupId,
            'chat_participant_id' => $participant->id,
            'sender_id' => $user->id,
            'sender_name' => $user->name,
            'sender_email' => $user->email,
            'message' => $request->message,
            'message_type' => 'text',
        ]);

        // Create notification for group participants
        // For group chat, we pass the group and message directly
        $this->createChatNotificationForGroup($groupId, $message, $user);

        return response()->json([
            'success' => true,
            'message' => $message->load('sender'),
        ]);
    }

    /**
     * Get private chat messages
     */
    public function getPrivateChatMessages($chatId)
    {
        $user = auth()->user();
        
        // Find the chat - could be guest chat or regular private chat
        $privateChat = PrivateChat::where('id', $chatId)
            ->where('is_active', true)
            ->first();

        if (!$privateChat) {
            return response()->json([
                'success' => false,
                'message' => 'Chat not found',
            ], 404);
        }
        
        // Check access permissions
        $isGuestChat = is_null($privateChat->user_1_id) && is_null($privateChat->user_2_id) && !is_null($privateChat->user_2_email);
        $isRegularChat = !is_null($privateChat->user_1_id) || !is_null($privateChat->user_2_id);
        
        if ($isGuestChat) {
            // Guest chat - only K-Petani can view
            if (!$user || $user->role !== 'k-petani') {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only K-Petani can view guest chats.',
                ], 403);
            }
            
            // Check if taken by another K-Petani
            if ($privateChat->taken_by_id && $privateChat->taken_by_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chat ini sedang ditangani oleh K-Petani lain',
                    'taken_by' => [
                        'id' => $privateChat->takenBy->id ?? null,
                        'name' => $privateChat->takenBy->name ?? null,
                    ],
                ], 403);
            }
        } elseif ($isRegularChat) {
            // Regular private chat - only participants can view
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }
            
            $isParticipant = ($privateChat->user_1_id == $user->id) || ($privateChat->user_2_id == $user->id);
            if (!$isParticipant) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chat not found',
                ], 404);
            }
        } else {
            // Invalid chat structure
            return response()->json([
                'success' => false,
                'message' => 'Chat not found',
            ], 404);
        }

        // Optimize query - limit to last 100 messages and use select specific columns
        $messagesQuery = Message::where('private_chat_id', $chatId)
            ->where('is_deleted', false);
        
        // Debug logging
        \Log::info('Getting messages for chat', [
            'chat_id' => $chatId,
            'is_guest_chat' => $isGuestChat,
            'user_id' => $user->id ?? null,
            'taken_by_id' => $privateChat->taken_by_id ?? null,
            'message_count' => $messagesQuery->count(),
        ]);
        
        $messages = $messagesQuery
            ->select('id', 'sender_id', 'sender_name', 'sender_email', 'message', 'message_type', 'created_at', 'is_read')
            ->orderBy('created_at', 'asc') // Changed to asc to get oldest first
            ->limit(100) // Limit to last 100 messages for performance
            ->get()
            ->map(function ($message) {
                return [
                    'id' => $message->id,
                    'sender_id' => $message->sender_id,
                    'sender_name' => $message->sender_name,
                    'sender_email' => $message->sender_email,
                    'message' => $message->message,
                    'message_type' => $message->message_type,
                    'created_at' => $message->created_at->toISOString(),
                    'is_read' => $message->is_read,
                ];
            })
            ->values(); // Re-index array

        \Log::info('Messages retrieved', [
            'chat_id' => $chatId,
            'messages_count' => $messages->count(),
            'first_message' => $messages->first(),
        ]);

        return response()->json([
            'success' => true,
            'messages' => $messages,
        ]);
    }

    /**
     * Start or get private chat with another user
     */
    public function getOrCreatePrivateChat(Request $request)
    {
        $user = auth()->user();
        $otherUserId = $request->input('user_id');
        $otherUserEmail = $request->input('email'); // For guest

        if (!$otherUserId && !$otherUserEmail) {
            return response()->json([
                'success' => false,
                'message' => 'User ID or email is required',
            ], 422);
        }

        // Find existing private chat
        $privateChat = PrivateChat::where(function ($query) use ($user, $otherUserId, $otherUserEmail) {
            if ($user && $otherUserId) {
                $query->where(function ($q) use ($user, $otherUserId) {
                    $q->where('user_1_id', $user->id)
                        ->where('user_2_id', $otherUserId);
                })->orWhere(function ($q) use ($user, $otherUserId) {
                    $q->where('user_1_id', $otherUserId)
                        ->where('user_2_id', $user->id);
                });
            } elseif ($user && $otherUserEmail) {
                $query->where(function ($q) use ($user, $otherUserEmail) {
                    $q->where('user_1_id', $user->id)
                        ->where('user_2_email', $otherUserEmail);
                })->orWhere(function ($q) use ($user, $otherUserEmail) {
                    $q->where('user_1_email', $otherUserEmail)
                        ->where('user_2_id', $user->id);
                });
            }
        })
        ->where('is_active', true)
        ->first();

        // Create new private chat if not exists
        if (!$privateChat) {
            if ($user && $otherUserId) {
                $otherUser = User::find($otherUserId);
                $privateChat = PrivateChat::create([
                    'user_1_id' => $user->id,
                    'user_2_id' => $otherUserId,
                    'is_active' => true,
                ]);
            } elseif ($user && $otherUserEmail) {
                $privateChat = PrivateChat::create([
                    'user_1_id' => $user->id,
                    'user_2_email' => $otherUserEmail,
                    'is_active' => true,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'chat_id' => $privateChat->id,
            'other_user' => $privateChat->getOtherUser($user?->id, $otherUserEmail),
        ]);
    }

    /**
     * Send message to private chat
     */
    public function sendPrivateMessage(Request $request, $chatId)
    {
        $user = auth()->user();
        
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $privateChat = PrivateChat::where('id', $chatId)
            ->where('is_active', true)
            ->first();

        if (!$privateChat) {
            return response()->json([
                'success' => false,
                'message' => 'Chat not found',
            ], 404);
        }
        
        // Check access permissions
        $isGuestChat = is_null($privateChat->user_1_id) && is_null($privateChat->user_2_id) && !is_null($privateChat->user_2_email);
        $isRegularChat = !is_null($privateChat->user_1_id) || !is_null($privateChat->user_2_id);
        
        if ($isGuestChat) {
            // Guest chat - only K-Petani can send messages
            if (!$user || $user->role !== 'k-petani') {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only K-Petani can send messages in guest chats.',
                ], 403);
            }
            
            // Check if taken by another K-Petani
            if ($privateChat->taken_by_id && $privateChat->taken_by_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chat ini sedang ditangani oleh K-Petani lain',
                ], 403);
            }
            
            // Auto-take chat if not taken yet
            if (!$privateChat->taken_by_id) {
                $privateChat->update([
                    'taken_by_id' => $user->id,
                    'taken_at' => now(),
                ]);
            }
        } elseif ($isRegularChat) {
            // Regular private chat - only participants can send
            $isParticipant = ($privateChat->user_1_id == $user->id) || ($privateChat->user_2_id == $user->id);
            if (!$isParticipant) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chat not found',
                ], 404);
            }
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Chat not found',
            ], 404);
        }

        $message = Message::create([
            'private_chat_id' => $chatId,
            'sender_id' => $user?->id,
            'sender_name' => $user?->name,
            'sender_email' => $user?->email,
            'message' => $request->message,
            'message_type' => 'text',
        ]);

        // Update last message time
        $privateChat->update([
            'last_message_at' => now(),
        ]);

        // Create notification for recipient(s)
        $this->createChatNotification($privateChat, $message, $user);

        return response()->json([
            'success' => true,
            'message' => $message->load('sender'),
        ]);
    }

    /**
     * Guest access to MOV Center
     */
    public function guestIndex(): Response
    {
        $contactInfo = \App\Models\ContactInfo::first();

        // Get default group chat
        $defaultGroup = ChatGroup::where('type', 'public')
            ->where('is_active', true)
            ->first();

        // If no default group exists, create it
        if (!$defaultGroup) {
            $defaultGroup = ChatGroup::create([
                'name' => 'Grup MOV Center',
                'description' => 'Grup diskusi untuk Petani dan K-Petani',
                'type' => 'public',
                'created_by' => null,
                'is_active' => true,
            ]);
        }

        return Inertia::render('Chat/GuestIndex', [
            'contactInfo' => $contactInfo ? [
                'id' => $contactInfo->id,
                'whatsapp' => $contactInfo->whatsapp,
                'phone' => $contactInfo->phone,
                'email' => $contactInfo->email,
                'operational_hours' => $contactInfo->operational_hours,
            ] : null,
            'defaultGroup' => [
                'id' => $defaultGroup->id,
                'name' => $defaultGroup->name,
                'description' => $defaultGroup->description,
            ],
        ]);
    }

    /**
     * Get available users for starting private chat
     */
    public function getAvailableUsers(Request $request)
    {
        $user = auth()->user();
        $search = $request->input('search', '');
        
        $query = User::where('id', '!=', $user->id)
            ->where('is_active', true);
        
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        $users = $query->orderBy('name', 'asc')
            ->limit(20)
            ->get()
            ->map(function ($u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $u->role,
                ];
            });
        
        return response()->json([
            'success' => true,
            'users' => $users,
        ]);
    }

    /**
     * Guest send message to private chat with K-Petani
     */
    public function guestSendPrivateMessage(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:5000',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Find or create guest chat (user_1_id is null so all K-Petani can see it)
        $privateChat = PrivateChat::whereNull('user_1_id')
            ->whereNull('user_2_id')
            ->where('user_2_email', $request->email)
            ->where('is_active', true)
            ->first();

        if (!$privateChat) {
            // Create new guest chat - no K-Petani assigned yet (visible to all K-Petani)
            $privateChat = PrivateChat::create([
                'user_1_id' => null, // No K-Petani assigned - visible to all
                'user_2_id' => null, // Guest doesn't have user_id
                'user_1_email' => null,
                'user_2_email' => $request->email,
                'user_1_name' => null,
                'user_2_name' => $request->name,
                'last_message_at' => now(),
                'is_active' => true,
                'taken_by_id' => null, // Not taken yet
                'taken_at' => null,
            ]);
        } else {
            // Update last message time and name
            $privateChat->update([
                'last_message_at' => now(),
                'user_2_name' => $request->name, // Update name in case it changed
            ]);
        }

        // Create message
        $message = Message::create([
            'private_chat_id' => $privateChat->id,
            'sender_name' => $request->name,
            'sender_email' => $request->email,
            'message' => $request->message,
            'message_type' => 'text',
        ]);

        // Create notification for K-Petani (guest message)
        // Create a dummy sender object for guest
        $guestSender = (object)[
            'id' => null,
            'name' => $request->name,
            'email' => $request->email,
        ];
        $this->createChatNotification($privateChat, $message, $guestSender);

        return response()->json([
            'success' => true,
            'message' => $message,
            'chat_id' => $privateChat->id,
        ]);
    }

    /**
     * Guest get private chat messages
     */
    public function guestGetPrivateMessages(Request $request, $chatId)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = $request->input('email');

        // Verify this chat belongs to this guest
        $privateChat = PrivateChat::where('id', $chatId)
            ->where(function ($query) use ($email) {
                $query->where('user_1_email', $email)
                    ->orWhere('user_2_email', $email);
            })
            ->where('is_active', true)
            ->first();

        if (!$privateChat) {
            return response()->json([
                'success' => false,
                'message' => 'Chat not found',
            ], 404);
        }

        $messages = Message::where('private_chat_id', $chatId)
            ->where('is_deleted', false)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($message) {
                return [
                    'id' => $message->id,
                    'sender_id' => $message->sender_id,
                    'sender_name' => $message->sender_name,
                    'sender_email' => $message->sender_email,
                    'message' => $message->message,
                    'message_type' => $message->message_type,
                    'created_at' => $message->created_at->toISOString(),
                    'is_read' => $message->is_read,
                ];
            });

        return response()->json([
            'success' => true,
            'messages' => $messages,
        ]);
    }

    /**
     * Guest get or create private chat with K-Petani
     */
    public function guestGetOrCreatePrivateChat(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Find or create guest chat (visible to all K-Petani, not assigned to specific one)
        $privateChat = PrivateChat::whereNull('user_1_id')
            ->whereNull('user_2_id')
            ->where('user_2_email', $request->email)
            ->where('is_active', true)
            ->first();

        if (!$privateChat) {
            $privateChat = PrivateChat::create([
                'user_1_id' => null, // No K-Petani assigned - visible to all
                'user_2_id' => null,
                'user_1_email' => null,
                'user_2_email' => $request->email,
                'user_1_name' => null,
                'user_2_name' => $request->name,
                'last_message_at' => now(),
                'is_active' => true,
                'taken_by_id' => null, // Not taken yet
                'taken_at' => null,
            ]);
        } else {
            // Update name in case it changed
            $privateChat->update([
                'user_2_name' => $request->name,
            ]);
        }

        return response()->json([
            'success' => true,
            'chat_id' => $privateChat->id,
        ]);
    }

    /**
     * Delete private chat (for authenticated users and guests)
     */
    public function deletePrivateChat(Request $request, $chatId)
    {
        $user = auth()->user();
        $guestEmail = $request->input('email'); // For guest users

        // Find the private chat
        $privateChat = PrivateChat::where('id', $chatId)
            ->where('is_active', true)
            ->first();

        if (!$privateChat) {
            return response()->json([
                'success' => false,
                'message' => 'Chat not found',
            ], 404);
        }

        // Check if user has permission to delete this chat
        $canDelete = false;
        
        if ($user) {
            // Authenticated user: can delete if they are part of the chat
            $canDelete = $privateChat->user_1_id == $user->id || 
                        $privateChat->user_2_id == $user->id;
        } elseif ($guestEmail) {
            // Guest: can delete if their email matches
            $canDelete = $privateChat->user_1_email == $guestEmail || 
                        $privateChat->user_2_email == $guestEmail;
        }

        if (!$canDelete) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to delete this chat',
            ], 403);
        }

        // Soft delete: mark chat as inactive and delete all messages
        $privateChat->update(['is_active' => false]);
        
        // Mark all messages as deleted
        Message::where('private_chat_id', $chatId)
            ->update([
                'is_deleted' => true,
                'deleted_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Chat berhasil dihapus',
        ]);
    }

    /**
     * Delete guest chat (K-Petani only)
     */
    public function deleteGuestChat(Request $request, $chatId)
    {
        $user = auth()->user();

        // Only K-Petani can delete guest chats
        if (!$user || $user->role !== 'k-petani') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only K-Petani can delete guest chats.',
            ], 403);
        }

        // Find the guest chat (user_1_id and user_2_id are null, but user_2_email exists)
        $privateChat = PrivateChat::where('id', $chatId)
            ->whereNull('user_1_id') // Guest chat - no assigned K-Petani
            ->whereNull('user_2_id') // Guest doesn't have user_id
            ->whereNotNull('user_2_email') // Has guest email
            ->where('is_active', true)
            ->first();

        if (!$privateChat) {
            return response()->json([
                'success' => false,
                'message' => 'Guest chat not found',
            ], 404);
        }

        // Soft delete: mark chat as inactive and delete all messages
        $privateChat->update(['is_active' => false]);
        
        // Mark all messages as deleted
        Message::where('private_chat_id', $chatId)
            ->update([
                'is_deleted' => true,
                'deleted_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Guest chat berhasil dihapus',
        ]);
    }

    /**
     * Take a guest chat (lock it for current K-Petani)
     */
    public function takeGuestChat(Request $request, $chatId)
    {
        $user = auth()->user();

        // Only K-Petani can take guest chats
        if (!$user || $user->role !== 'k-petani') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only K-Petani can take guest chats.',
            ], 403);
        }

        // Find the guest chat
        $privateChat = PrivateChat::where('id', $chatId)
            ->whereNull('user_1_id')
            ->whereNull('user_2_id')
            ->whereNotNull('user_2_email')
            ->where('is_active', true)
            ->first();

        if (!$privateChat) {
            return response()->json([
                'success' => false,
                'message' => 'Guest chat not found',
            ], 404);
        }

        // Check if already taken by another K-Petani
        if ($privateChat->taken_by_id && $privateChat->taken_by_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Chat ini sedang ditangani oleh K-Petani lain',
                'taken_by' => [
                    'id' => $privateChat->takenBy->id ?? null,
                    'name' => $privateChat->takenBy->name ?? null,
                ],
            ], 409);
        }

        // Take the chat
        $privateChat->update([
            'taken_by_id' => $user->id,
            'taken_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Chat berhasil diambil',
            'chat' => [
                'id' => $privateChat->id,
                'taken_by_id' => $privateChat->taken_by_id,
                'taken_at' => $privateChat->taken_at?->toISOString(),
            ],
        ]);
    }

    /**
     * Get chat notifications for current user
     */
    public function getChatNotifications()
    {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        $notifications = Notification::where('user_id', $user->id)
            ->where('type', 'chat')
            ->where('is_read', false)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get()
            ->map(function ($notif) {
                return [
                    'id' => $notif->id,
                    'title' => $notif->title,
                    'message' => $notif->message,
                    'type' => $notif->type,
                    'data' => $notif->data,
                    'created_at' => $notif->created_at->toISOString(),
                    'time_ago' => $notif->created_at->diffForHumans(),
                ];
            });

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
            'count' => $notifications->count(),
        ]);
    }
}

