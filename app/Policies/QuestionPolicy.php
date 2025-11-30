<?php

namespace App\Policies;

use App\Models\Question;
use App\Models\User;

class QuestionPolicy
{
    /**
     * Determine if user can view any questions (K-Petani only)
     */
    public function viewAny(User $user): bool
    {
        return $user->role === 'k-petani';
    }

    /**
     * Determine if user can view a question
     */
    public function view(User $user, Question $question): bool
    {
        return $user->role === 'k-petani';
    }

    /**
     * Determine if user can create a question (all users)
     */
    public function create(User $user = null): bool
    {
        return true; // Both authenticated and guest users can ask questions
    }

    /**
     * Determine if user can update a question (K-Petani only)
     */
    public function update(User $user, Question $question): bool
    {
        return $user->role === 'k-petani';
    }

    /**
     * Determine if user can delete a question (K-Petani only)
     */
    public function delete(User $user, Question $question): bool
    {
        return $user->role === 'k-petani';
    }
}


