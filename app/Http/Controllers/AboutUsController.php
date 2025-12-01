<?php

namespace App\Http\Controllers;

use App\Models\AboutUs;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class AboutUsController extends Controller
{
    /**
     * Display a listing of the resource (Public)
     */
    public function index()
    {
        $teamMembers = AboutUs::where('is_active', true)
            ->orderBy('order', 'asc')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($member) {
                return [
                    'id' => $member->id,
                    'name' => $member->name,
                    'photo_url' => $member->photo_path ? Storage::url($member->photo_path) : null,
                    'jobdesc' => $member->jobdesc,
                    'description' => $member->description,
                    'order' => $member->order,
                ];
            });

        return response()->json([
            'success' => true,
            'team_members' => $teamMembers,
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Store a newly created resource (K-Petani only)
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
            'name' => 'required|string|max:255',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'jobdesc' => 'required|string|max:500',
            'description' => 'required|string|max:2000',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('about-us', 'public');
        }

        $aboutUs = AboutUs::create([
            'name' => $request->name,
            'photo_path' => $photoPath,
            'jobdesc' => $request->jobdesc,
            'description' => $request->description,
            'order' => $request->order ?? 0,
            'is_active' => $request->is_active ?? true,
        ]);

        return redirect()->route('about-us.management')->with('success', 'Anggota tim berhasil ditambahkan');
    }

    /**
     * Update the specified resource (K-Petani only)
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

        $aboutUs = AboutUs::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'jobdesc' => 'required|string|max:500',
            'description' => 'required|string|max:2000',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return redirect()->route('about-us.management')
                ->withErrors($validator)
                ->withInput();
        }

        // Handle photo update
        $photoPath = null;
        if ($request->hasFile('photo')) {
            // Delete old photo
            if ($aboutUs->photo_path && Storage::disk('public')->exists($aboutUs->photo_path)) {
                Storage::disk('public')->delete($aboutUs->photo_path);
            }
            $photoPath = $request->file('photo')->store('about-us', 'public');
        }

        $updateData = [
            'name' => $request->name,
            'jobdesc' => $request->jobdesc,
            'description' => $request->description,
            'order' => $request->order ?? $aboutUs->order,
            'is_active' => $request->is_active ?? $aboutUs->is_active,
        ];
        
        // Only update photo_path if a new photo was uploaded
        if ($photoPath) {
            $updateData['photo_path'] = $photoPath;
        }
        
        $aboutUs->update($updateData);

        return redirect()->route('about-us.management')->with('success', 'Anggota tim berhasil diupdate');
    }

    /**
     * Remove the specified resource (K-Petani only)
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

        $aboutUs = AboutUs::findOrFail($id);

        // Delete photo
        if ($aboutUs->photo_path && Storage::disk('public')->exists($aboutUs->photo_path)) {
            Storage::disk('public')->delete($aboutUs->photo_path);
        }

        $aboutUs->delete();

        return redirect()->route('about-us.management')->with('success', 'Anggota tim berhasil dihapus');
    }
}
