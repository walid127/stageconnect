<?php

namespace App\Policies;

use App\Models\Formation;
use App\Models\User;

class TrainingPolicy
{
    /**
     * Détermine si l'utilisateur peut créer des formations.
     */
    public function create(User $user): bool
    {
        return $user->isAdminOrGestionaire();
    }

    /**
     * Détermine si l'utilisateur peut mettre à jour la formation.
     */
    public function update(User $user, Formation $formation): bool
    {
        return $user->isAdminOrGestionaire();
    }

    /**
     * Détermine si l'utilisateur peut supprimer la formation.
     */
    public function delete(User $user, Formation $formation): bool
    {
        return $user->isAdminOrGestionaire();
    }
}
