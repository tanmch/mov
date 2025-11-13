<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class, 'email')->ignore($this->user()->id)->whereNull('deleted_at'),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'username' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique(User::class, 'username')->ignore($this->user()->id)->whereNull('deleted_at'),
            ],
            'id_kerja' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique(User::class, 'id_kerja')->ignore($this->user()->id)->whereNull('deleted_at'),
            ],
        ];
    }
}
