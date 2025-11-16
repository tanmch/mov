<?php

namespace App\Services;

use Kreait\Firebase\Factory;
use Kreait\Firebase\Contract\Auth;
use Kreait\Firebase\Contract\Database;
use Kreait\Firebase\Exception\FirebaseException;

class FirebaseService
{
    protected $auth;
    protected $database;
    protected $factory;

    public function __construct()
    {
        $this->factory = (new Factory)
            ->withServiceAccount(config('firebase.credentials.file'))
            ->withDatabaseUri(config('firebase.database.url'));

        $this->auth = $this->factory->createAuth();
        $this->database = $this->factory->createDatabase();
    }

    /**
     * Get Firebase Auth instance
     */
    public function auth(): Auth
    {
        return $this->auth;
    }

    /**
     * Get Firebase Realtime Database instance
     */
    public function database(): Database
    {
        return $this->database;
    }

    /**
     * Get Firebase Factory instance
     */
    public function factory(): Factory
    {
        return $this->factory;
    }

    /**
     * Verify Firebase ID Token
     */
    public function verifyIdToken(string $idToken)
    {
        try {
            return $this->auth->verifyIdToken($idToken);
        } catch (FirebaseException $e) {
            throw new \Exception('Invalid Firebase token: ' . $e->getMessage());
        }
    }

    /**
     * Create a new user in Firebase
     */
    public function createUser(array $properties)
    {
        try {
            return $this->auth->createUser($properties);
        } catch (FirebaseException $e) {
            throw new \Exception('Failed to create user: ' . $e->getMessage());
        }
    }

    /**
     * Get user by UID
     */
    public function getUserByUid(string $uid)
    {
        try {
            return $this->auth->getUser($uid);
        } catch (FirebaseException $e) {
            throw new \Exception('User not found: ' . $e->getMessage());
        }
    }

    /**
     * Update user in Firebase
     */
    public function updateUser(string $uid, array $properties)
    {
        try {
            return $this->auth->updateUser($uid, $properties);
        } catch (FirebaseException $e) {
            throw new \Exception('Failed to update user: ' . $e->getMessage());
        }
    }

    /**
     * Delete user from Firebase
     */
    public function deleteUser(string $uid)
    {
        try {
            $this->auth->deleteUser($uid);
            return true;
        } catch (FirebaseException $e) {
            throw new \Exception('Failed to delete user: ' . $e->getMessage());
        }
    }

    /**
     * Set custom claims for user (for roles)
     */
    public function setCustomClaims(string $uid, array $claims)
    {
        try {
            $this->auth->setCustomUserClaims($uid, $claims);
            return true;
        } catch (FirebaseException $e) {
            throw new \Exception('Failed to set custom claims: ' . $e->getMessage());
        }
    }

    /**
     * Get data from Realtime Database
     */
    public function getDatabaseData(string $path)
    {
        return $this->database->getReference($path)->getValue();
    }

    /**
     * Set data in Realtime Database
     */
    public function setDatabaseData(string $path, $data)
    {
        try {
            $reference = $this->database->getReference($path);
            $reference->set($data);
            return true;
        } catch (\Exception $e) {
            \Log::error("Firebase setDatabaseData failed", [
                'path' => $path,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Update data in Realtime Database
     */
    public function updateDatabaseData(string $path, array $data)
    {
        return $this->database->getReference($path)->update($data);
    }

    /**
     * Delete data from Realtime Database
     */
    public function deleteDatabaseData(string $path)
    {
        return $this->database->getReference($path)->remove();
    }

    /**
     * Push data to Realtime Database (generates unique key)
     */
    public function pushDatabaseData(string $path, $data)
    {
        return $this->database->getReference($path)->push($data);
    }
}

