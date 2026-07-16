<?php

namespace App\Http\Controllers;

use App\Models\WorkId;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;

class WorkIdController extends Controller
{
    /**
     * Display a listing of work IDs.
     */
    public function index(Request $request): Response
    {
        $query = WorkId::with(['creator', 'user'])
            ->orderBy('created_at', 'desc');

        // Filter by role
        if ($request->has('role') && $request->role) {
            $query->where('role', $request->role);
        }

        // Filter by status
        if ($request->has('is_used') && $request->is_used !== null) {
            $query->where('is_used', $request->is_used);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $query->where('work_id', 'like', '%' . $request->search . '%');
        }

        $workIds = $query->paginate(15)->withQueryString();

        return Inertia::render('WorkIds/Index', [
            'workIds' => $workIds,
            'filters' => [
                'role' => $request->role,
                'is_used' => $request->is_used,
                'search' => $request->search,
            ],
        ]);
    }

    /**
     * Show the form for creating a new work ID.
     */
    public function create(): Response
    {
        return Inertia::render('WorkIds/Create');
    }

    /**
     * Show the form for editing the specified work ID.
     */
    public function edit(WorkId $workId): Response
    {
        return Inertia::render('WorkIds/Edit', [
            'workId' => $workId,
        ]);
    }

    /**
     * Store a newly created work ID.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'role' => 'required|in:petani,k-petani',
            'work_id' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('work_ids', 'work_id')->whereNull('deleted_at'),
            ],
            'notes' => 'nullable|string|max:500',
        ]);

        // Generate work ID if not provided
        if (empty($validated['work_id'])) {
            $validated['work_id'] = WorkId::generateWorkId($validated['role']);
        }

        $workId = WorkId::create([
            'work_id' => $validated['work_id'],
            'role' => $validated['role'],
            'created_by' => auth()->id(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->route('work-ids.index')
            ->with('success', 'ID Kerja berhasil dibuat: ' . $workId->work_id);
    }

    /**
     * Display the specified work ID.
     */
    public function show(WorkId $workId): Response
    {
        $workId->load(['creator', 'user']);
        
        return Inertia::render('WorkIds/Show', [
            'workId' => $workId,
        ]);
    }

    /**
     * Update the specified work ID.
     */
    public function update(Request $request, WorkId $workId): RedirectResponse
    {
        // Cannot update if already used
        if ($workId->is_used) {
            return redirect()->back()
                ->withErrors(['work_id' => 'ID Kerja yang sudah digunakan tidak dapat diubah.']);
        }

        $validated = $request->validate([
            'work_id' => [
                'required',
                'string',
                'max:255',
                Rule::unique('work_ids', 'work_id')->ignore($workId->id)->whereNull('deleted_at'),
            ],
            'notes' => 'nullable|string|max:500',
        ]);

        $workId->update($validated);

        return redirect()->route('work-ids.index')
            ->with('success', 'ID Kerja berhasil diperbarui.');
    }

    /**
     * Remove the specified work ID.
     */
    public function destroy(WorkId $workId): RedirectResponse
    {
        // Cannot delete if already used
        if ($workId->is_used) {
            return redirect()->back()
                ->withErrors(['work_id' => 'ID Kerja yang sudah digunakan tidak dapat dihapus.']);
        }

        $workId->delete();

        return redirect()->route('work-ids.index')
            ->with('success', 'ID Kerja berhasil dihapus.');
    }

    /**
     * Generate multiple work IDs at once
     */
    public function generateMultiple(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'role' => 'required|in:petani,k-petani',
            'count' => 'required|integer|min:1|max:50',
            'notes' => 'nullable|string|max:500',
        ]);

        $generated = [];
        for ($i = 0; $i < $validated['count']; $i++) {
            $workId = WorkId::create([
                'work_id' => WorkId::generateWorkId($validated['role']),
                'role' => $validated['role'],
                'created_by' => auth()->id(),
                'notes' => $validated['notes'] ?? null,
            ]);
            $generated[] = $workId->work_id;
        }

        return redirect()->route('work-ids.index')
            ->with('success', count($generated) . ' ID Kerja berhasil dibuat.');
    }
}
