<?php

namespace App\Http\Controllers;

use App\Models\Question;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class QuestionController extends Controller
{
    public function __construct()
    {
        // Register policy manually if needed
        Gate::policy(Question::class, \App\Policies\QuestionPolicy::class);
    }

    /**
     * Display a listing of questions (K-Petani only)
     */
    public function index(Request $request): Response
    {
        // Check if user is K-Petani
        if (auth()->user()->role !== 'k-petani') {
            abort(403, 'Unauthorized');
        }

        $status = $request->get('status', 'all');
        $query = Question::with(['user', 'answeredBy'])
            ->orderBy('created_at', 'desc');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $questions = $query->paginate(20);

        return Inertia::render('Questions/Index', [
            'questions' => $questions,
            'filters' => [
                'status' => $status,
            ],
            'stats' => [
                'pending' => Question::where('status', 'pending')->count(),
                'answered' => Question::where('status', 'answered')->count(),
                'total' => Question::count(),
            ],
        ]);
    }

    /**
     * Store a newly created question (Petani/Guest)
     */
    public function store(Request $request)
    {
        // If user is authenticated, use their info
        $userId = auth()->id();
        $name = $request->name;
        $email = $request->email;

        if ($userId) {
            $user = auth()->user();
            $name = $user->name;
            $email = $user->email;
            
            $validator = Validator::make($request->all(), [
                'question' => 'required|string|min:10|max:1000',
                'category' => 'nullable|string|max:255',
            ]);
        } else {
            // For guest users, name and email are required
            $validator = Validator::make($request->all(), [
                'question' => 'required|string|min:10|max:1000',
                'name' => 'required|string|max:255',
                'email' => 'required|email|max:255',
                'category' => 'nullable|string|max:255',
            ]);
        }

        if ($validator->fails()) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }
            return back()->withErrors($validator)->withInput();
        }

        // Check if there's an existing open chat (pending or answered, not closed) for this user
        // Only reuse if the existing chat is not closed
        $existingQuestion = null;
        if ($userId) {
            // For authenticated users, check by user_id
            $existingQuestion = Question::where('user_id', $userId)
                ->where('status', '!=', 'closed')
                ->orderBy('created_at', 'desc')
                ->first();
        } else {
            // For guest users, check by email
            $existingQuestion = Question::where('email', $email)
                ->whereNull('user_id')
                ->where('status', '!=', 'closed')
                ->orderBy('created_at', 'desc')
                ->first();
        }

        if ($existingQuestion) {
            // Append new question to existing chat (update the question field)
            // Format: original question + separator + new question with timestamp
            $separator = "\n\n---\n";
            $newQuestionPart = "[Pertanyaan baru: " . now()->format('d/m/Y H:i') . "]\n" . $request->question;
            
            // Only clear answer if status was 'closed' (chat was closed, now reopening)
            // If status is 'pending' or 'answered', keep the answer but add new question
            $updateData = [
                'question' => $existingQuestion->question . $separator . $newQuestionPart,
                'status' => 'pending', // Reset to pending when new question is added
            ];
            
            // Only clear answer if chat was closed (reopening closed chat)
            if ($existingQuestion->status === 'closed') {
                $updateData['answer'] = null;
                $updateData['answered_by'] = null;
                $updateData['answered_at'] = null;
            }
            // If status is 'pending' or 'answered', keep the answer (CS can continue the conversation)
            
            $existingQuestion->update($updateData);
            $question = $existingQuestion->fresh(); // Refresh to get updated data
        } else {
            // Create new question/chat room
            $question = Question::create([
                'user_id' => $userId,
                'name' => $name,
                'email' => $email,
                'question' => $request->question,
                'category' => $request->category ?? 'general',
                'status' => 'pending',
            ]);
        }
        
        // Create notification for all K-Petani users when new question/chat is created
        $kPetaniUsers = User::where('role', 'k-petani')->get();
        foreach ($kPetaniUsers as $kPetani) {
            Notification::create([
                'user_id' => $kPetani->id,
                'title' => 'Chat Baru dari ' . ($name ?? 'Guest'),
                'message' => 'Ada chat baru yang memerlukan respons Anda.',
                'type' => 'info',
                'related_type' => 'Question',
                'related_id' => $question->id,
                'data' => [
                    'question_id' => $question->id,
                    'user_name' => $name ?? 'Guest',
                    'user_email' => $email ?? '',
                    'preview' => substr($request->question, 0, 100),
                ],
                'is_read' => false,
            ]);
        }

        // If it's an API request (from frontend), return JSON with question ID
        if ($request->wantsJson() || $request->expectsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Pertanyaan Anda telah dikirim. Tim CS akan segera merespons.',
                'question_id' => $question->id,
            ]);
        }

        return back()->with('success', 'Pertanyaan Anda telah dikirim. Tim CS akan segera merespons.');
    }

    /**
     * Update the answer to a question (K-Petani only)
     */
    public function update(Request $request, Question $question)
    {
        // Check if user is K-Petani
        if (auth()->user()->role !== 'k-petani') {
            abort(403, 'Unauthorized');
        }

        $validator = Validator::make($request->all(), [
            'answer' => 'required|string|min:10|max:2000',
            'status' => 'nullable|in:pending,answered,closed',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        // Auto update status to 'answered' when CS replies (unless explicitly set to 'pending' or 'closed')
        $status = $request->status ?? 'answered';
        
        // Append new answer to existing answer (like customer messages)
        // Format: existing answer + separator + new answer with timestamp
        $newAnswer = $request->answer;
        $separator = "\n\n---\n";
        $timestampedAnswer = "[Jawaban CS: " . now()->format('d/m/Y H:i') . "]\n" . $newAnswer;
        
        if ($question->answer && trim($question->answer)) {
            // Append to existing answer
            $updateData = [
                'answer' => $question->answer . $separator . $timestampedAnswer,
                'answered_by' => auth()->id(),
                'status' => $status,
            ];
        } else {
            // First answer
            $updateData = [
                'answer' => $timestampedAnswer,
                'answered_by' => auth()->id(),
                'status' => $status,
            ];
        }
        
        if ($status !== 'pending') {
            $updateData['answered_at'] = now();
            // Clear read_at when CS sends a new answer (customer needs to read it)
            $updateData['read_at'] = null;
        } else {
            // If status is pending, clear answered_at
            $updateData['answered_at'] = null;
        }
        
        $question->update($updateData);

        return back()->with('success', 'Jawaban berhasil terkirim ke customer.');
    }

    /**
     * Show a single question (K-Petani only)
     */
    public function show(Question $question): Response
    {
        // Check if user is K-Petani
        if (auth()->user()->role !== 'k-petani') {
            abort(403, 'Unauthorized');
        }

        $question->load(['user', 'answeredBy']);

        return Inertia::render('Questions/Show', [
            'question' => $question,
        ]);
    }

    /**
     * Delete a question (K-Petani only)
     */
    public function destroy(Question $question)
    {
        // Check if user is K-Petani
        if (auth()->user()->role !== 'k-petani') {
            abort(403, 'Unauthorized');
        }

        $question->delete();

        return back()->with('success', 'Pertanyaan berhasil dihapus.');
    }

    /**
     * Get user's questions with answers (for Petani/Guest to see their questions and answers)
     */
    public function myQuestions(Request $request)
    {
        $userId = auth()->id();
        
        if ($userId) {
            // Authenticated user - get their questions
            $questions = Question::where('user_id', $userId)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($question) {
                    return [
                        'id' => $question->id,
                        'question' => $question->question,
                        'answer' => $question->answer,
                        'status' => $question->status,
                        'created_at' => $question->created_at?->toISOString(),
                        'answered_at' => $question->answered_at?->toISOString(),
                        'read_at' => $question->read_at?->toISOString(),
                    ];
                });
        } else {
            // Guest user - need email to get questions
            $email = $request->get('email');
            if (!$email) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email diperlukan untuk melihat pertanyaan',
                ], 400);
            }

            $questions = Question::where('email', $email)
                ->whereNull('user_id')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($question) {
                    return [
                        'id' => $question->id,
                        'question' => $question->question,
                        'answer' => $question->answer,
                        'status' => $question->status,
                        'created_at' => $question->created_at?->toISOString(),
                        'answered_at' => $question->answered_at?->toISOString(),
                        'read_at' => $question->read_at?->toISOString(),
                    ];
                });
        }

        return response()->json([
            'success' => true,
            'questions' => $questions,
        ]);
    }

    /**
     * Mark question as read (when customer views the answer)
     */
    public function markAsRead(Request $request, Question $question)
    {
        // Only the question owner (user or guest) can mark as read
        $userId = auth()->id();
        
        if ($userId) {
            // Authenticated user - check if they own this question
            if ($question->user_id !== $userId) {
                abort(403, 'Unauthorized');
            }
        } else {
            // Guest user - check email
            $email = $request->get('email');
            if (!$email || $question->email !== $email) {
                abort(403, 'Unauthorized');
            }
        }
        
        // Mark as read
        $question->update(['read_at' => now()]);
        
        return response()->json([
            'success' => true,
            'message' => 'Pertanyaan ditandai sebagai sudah dibaca',
        ]);
    }
}

