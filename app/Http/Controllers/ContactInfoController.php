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
        
        return Inertia::render('CustomerService', [
            'contactInfo' => $contactInfo ? [
                'id' => $contactInfo->id,
                'whatsapp' => $contactInfo->whatsapp,
                'phone' => $contactInfo->phone,
                'email' => $contactInfo->email,
                'operational_hours' => $contactInfo->operational_hours,
            ] : null,
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
