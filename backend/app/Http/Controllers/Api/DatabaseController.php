<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class DatabaseController extends Controller
{
    /**
     * Trouver le chemin vers mysqldump
     */
    private function findMysqldumpPath()
    {
        // D'abord, vérifier si mysqldump est dans le PATH
        if (PHP_OS_FAMILY === 'Windows') {
            exec('where mysqldump 2>nul', $output, $returnVar);
        } else {
            exec('which mysqldump 2>/dev/null', $output, $returnVar);
        }
        
        if ($returnVar === 0 && !empty($output)) {
            $path = trim($output[0]);
            if (File::exists($path)) {
                return $path;
            }
        }

        // Chemins communs pour mysqldump (Windows/Laragon)
        $possiblePaths = [
            'C:\\laragon\\bin\\mysql\\mysql-8.0.30\\bin\\mysqldump.exe',
            'C:\\laragon\\bin\\mysql\\mysql-8.0.31\\bin\\mysqldump.exe',
            'C:\\laragon\\bin\\mysql\\mysql-8.0.32\\bin\\mysqldump.exe',
            'C:\\xampp\\mysql\\bin\\mysqldump.exe',
            'C:\\wamp64\\bin\\mysql\\mysql8.0.27\\bin\\mysqldump.exe',
        ];

        // Chercher dynamiquement dans le dossier Laragon
        $laragonBase = 'C:\\laragon\\bin\\mysql';
        if (File::exists($laragonBase)) {
            $mysqlDirs = File::directories($laragonBase);
            foreach ($mysqlDirs as $mysqlDir) {
                $mysqldumpPath = $mysqlDir . '\\bin\\mysqldump.exe';
                if (File::exists($mysqldumpPath)) {
                    return $mysqldumpPath;
                }
            }
        }

        // Essayer les chemins fixes
        foreach ($possiblePaths as $path) {
            if (File::exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Trouver le chemin vers mysql
     */
    private function findMysqlPath()
    {
        // D'abord, vérifier si mysql est dans le PATH
        if (PHP_OS_FAMILY === 'Windows') {
            exec('where mysql 2>nul', $output, $returnVar);
        } else {
            exec('which mysql 2>/dev/null', $output, $returnVar);
        }
        
        if ($returnVar === 0 && !empty($output)) {
            $path = trim($output[0]);
            if (File::exists($path)) {
                return $path;
            }
        }

        // Chemins communs pour mysql (Windows/Laragon)
        $possiblePaths = [
            'C:\\laragon\\bin\\mysql\\mysql-8.0.30\\bin\\mysql.exe',
            'C:\\laragon\\bin\\mysql\\mysql-8.0.31\\bin\\mysql.exe',
            'C:\\laragon\\bin\\mysql\\mysql-8.0.32\\bin\\mysql.exe',
            'C:\\xampp\\mysql\\bin\\mysql.exe',
            'C:\\wamp64\\bin\\mysql\\mysql8.0.27\\bin\\mysql.exe',
        ];

        // Chercher dynamiquement dans le dossier Laragon
        $laragonBase = 'C:\\laragon\\bin\\mysql';
        if (File::exists($laragonBase)) {
            $mysqlDirs = File::directories($laragonBase);
            foreach ($mysqlDirs as $mysqlDir) {
                $mysqlPath = $mysqlDir . '\\bin\\mysql.exe';
                if (File::exists($mysqlPath)) {
                    return $mysqlPath;
                }
            }
        }

        // Essayer les chemins fixes
        foreach ($possiblePaths as $path) {
            if (File::exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Sauvegarde SQL sans mysqldump (hébergements sans client MySQL : Render buildpack, etc.).
     * Utilise la connexion PDO Laravel (même SSL/options que l’app).
     */
    private function backupUsingPhp(string $backupPath): void
    {
        $pdo = DB::connection()->getPdo();
        $database = DB::connection()->getDatabaseName();
        $tablesResult = DB::select(
            'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ? ORDER BY TABLE_NAME',
            [$database, 'BASE TABLE']
        );
        if (empty($tablesResult)) {
            File::put($backupPath, "-- StageConnect dump (vide)\n-- " . date('c') . "\n");
            return;
        }

        $handle = fopen($backupPath, 'w');
        if ($handle === false) {
            throw new \RuntimeException('Impossible d\'écrire le fichier de sauvegarde.');
        }

        fwrite($handle, "-- StageConnect SQL dump (PHP/PDO)\n-- " . date('c') . "\n\n");
        fwrite($handle, "SET FOREIGN_KEY_CHECKS=0;\n");
        fwrite($handle, "SET NAMES utf8mb4;\n\n");

        foreach ($tablesResult as $row) {
            $table = $row->name;
            $quotedTable = '`' . str_replace('`', '``', $table) . '`';

            $createRows = DB::select('SHOW CREATE TABLE ' . $quotedTable);
            $createSql = $createRows[0]->{'Create Table'};

            fwrite($handle, "DROP TABLE IF EXISTS {$quotedTable};\n");
            fwrite($handle, $createSql . ";\n\n");

            $stmt = $pdo->query('SELECT * FROM ' . $quotedTable);
            $colList = null;

            while ($rowData = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                if ($colList === null) {
                    $cols = array_keys($rowData);
                    $colList = implode(',', array_map(static function ($c) {
                        return '`' . str_replace('`', '``', $c) . '`';
                    }, $cols));
                }
                $values = [];
                foreach ($rowData as $val) {
                    if ($val === null) {
                        $values[] = 'NULL';
                    } else {
                        $q = $pdo->quote($val);
                        $values[] = $q !== false ? $q : "'" . addslashes((string) $val) . "'";
                    }
                }
                fwrite($handle, "INSERT INTO {$quotedTable} ({$colList}) VALUES (" . implode(',', $values) . ");\n");
            }
            fwrite($handle, "\n");
        }

        fwrite($handle, "SET FOREIGN_KEY_CHECKS=1;\n");
        fclose($handle);
    }

    /**
     * Sauvegarder la base de données (Admin uniquement)
     */
    public function backup(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent sauvegarder la base de données.',
            ], 403);
        }

        try {
            $database = config('database.connections.mysql.database');
            $username = config('database.connections.mysql.username');
            $password = config('database.connections.mysql.password');
            $host = config('database.connections.mysql.host');
            $port = config('database.connections.mysql.port', 3306);

            $filename = 'backup_' . date('Y-m-d_His') . '.sql';
            $backupsDir = storage_path('app/backups');
            $backupPath = $backupsDir . '/' . $filename;

            // Créer le dossier backups s'il n'existe pas
            if (!File::exists($backupsDir)) {
                File::makeDirectory($backupsDir, 0755, true);
            }

            $backupMethod = 'php';
            $mysqldumpPath = $this->findMysqldumpPath();

            if ($mysqldumpPath) {
                $configFile = storage_path('app/temp_mysql_config.cnf');
                $configContent = "[client]\n";
                $configContent .= "host=" . $host . "\n";
                $configContent .= "port=" . $port . "\n";
                $configContent .= "user=" . $username . "\n";
                $configContent .= "password=" . $password . "\n";
                $sslCa = env('MYSQL_ATTR_SSL_CA');
                if (!empty($sslCa) && is_string($sslCa) && file_exists($sslCa)) {
                    $configContent .= "ssl-ca=" . $sslCa . "\n";
                }
                $sslMode = env('DB_SSL_MODE');
                if (!empty($sslMode)) {
                    $configContent .= "ssl-mode=" . $sslMode . "\n";
                }
                File::put($configFile, $configContent);

                if (PHP_OS_FAMILY !== 'Windows') {
                    chmod($configFile, 0600);
                }

                $command = sprintf(
                    '%s --single-transaction --quick --defaults-file=%s %s > %s 2>&1',
                    escapeshellarg($mysqldumpPath),
                    escapeshellarg($configFile),
                    escapeshellarg($database),
                    escapeshellarg($backupPath)
                );

                $output = [];
                $returnVar = 0;
                exec($command, $output, $returnVar);

                if (File::exists($configFile)) {
                    File::delete($configFile);
                }

                if ($returnVar === 0 && File::exists($backupPath) && File::size($backupPath) > 0) {
                    $backupMethod = 'mysqldump';
                } else {
                    \Log::warning('mysqldump a échoué ou fichier vide, repli sur sauvegarde PHP', [
                        'return_var' => $returnVar,
                        'output_lines' => $output,
                    ]);
                    if (File::exists($backupPath)) {
                        File::delete($backupPath);
                    }
                    $this->backupUsingPhp($backupPath);
                }
            } else {
                \Log::info('mysqldump introuvable, sauvegarde via PHP (PDO)');
                $this->backupUsingPhp($backupPath);
            }

            if (!File::exists($backupPath) || File::size($backupPath) === 0) {
                \Log::error('Fichier de sauvegarde non créé ou vide', [
                    'backup_path' => $backupPath,
                    'exists' => File::exists($backupPath),
                    'size' => File::exists($backupPath) ? File::size($backupPath) : 0,
                ]);

                return response()->json([
                    'message' => 'Le fichier de sauvegarde n\'a pas été créé ou est vide.',
                    'error' => 'Échec de la création du fichier de sauvegarde',
                ], 500);
            }

            return response()->json([
                'message' => 'Sauvegarde créée avec succès!',
                'filename' => $filename,
                'path' => $backupPath,
                'size' => File::size($backupPath),
                'created_at' => now()->toDateTimeString(),
                'method' => $backupMethod,
            ]);
        } catch (\Exception $e) {
            \Log::error('Exception lors de la sauvegarde de la base de données', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Erreur lors de la sauvegarde.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Liste des sauvegardes disponibles (Admin uniquement)
     */
    public function listBackups(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $backupsPath = storage_path('app/backups');
        
        if (!File::exists($backupsPath)) {
            return response()->json(['backups' => []]);
        }

        $files = File::files($backupsPath);
        $backups = [];

        foreach ($files as $file) {
            if ($file->getExtension() === 'sql') {
                $backups[] = [
                    'filename' => $file->getFilename(),
                    'size' => $file->getSize(),
                    'created_at' => date('Y-m-d H:i:s', $file->getMTime()),
                ];
            }
        }

        // Trier par date de création (plus récent en premier)
        usort($backups, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });

        return response()->json(['backups' => $backups]);
    }

    /**
     * Télécharger une sauvegarde (Admin uniquement)
     */
    public function downloadBackup(Request $request, $filename)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $backupPath = storage_path('app/backups/' . $filename);

        if (!File::exists($backupPath)) {
            return response()->json([
                'message' => 'Sauvegarde introuvable.',
            ], 404);
        }

        return response()->download($backupPath, $filename);
    }

    /**
     * Restaurer la base de données (Admin uniquement)
     */
    public function restore(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent restaurer la base de données.',
            ], 403);
        }

        $validated = $request->validate([
            'filename' => 'required|string',
        ]);

        try {
            $backupPath = storage_path('app/backups/' . $validated['filename']);

            if (!File::exists($backupPath)) {
                return response()->json([
                    'message' => 'Fichier de sauvegarde introuvable.',
                ], 404);
            }

            $database = config('database.connections.mysql.database');
            $username = config('database.connections.mysql.username');
            $password = config('database.connections.mysql.password');
            $host = config('database.connections.mysql.host');
            $port = config('database.connections.mysql.port', 3306);

            // Trouver le chemin vers mysql
            $mysqlPath = $this->findMysqlPath();
            if (!$mysqlPath) {
                \Log::error('mysql introuvable dans le PATH');
                return response()->json([
                    'message' => 'mysql n\'est pas disponible. Vérifiez que MySQL est installé et dans le PATH.',
                    'error' => 'Commande mysql introuvable',
                ], 500);
            }

            // Créer un fichier de configuration temporaire pour éviter les problèmes de mot de passe
            $configFile = storage_path('app/temp_mysql_config.cnf');
            $configContent = "[client]\n";
            $configContent .= "host=" . $host . "\n";
            $configContent .= "port=" . $port . "\n";
            $configContent .= "user=" . $username . "\n";
            $configContent .= "password=" . $password . "\n";
            File::put($configFile, $configContent);
            
            // Définir les permissions du fichier de configuration (lecture seule pour le propriétaire)
            if (PHP_OS_FAMILY !== 'Windows') {
                chmod($configFile, 0600);
            }

            // Utiliser proc_open pour rediriger correctement l'entrée du fichier SQL
            // Cela fonctionne mieux que exec() avec redirection sur Windows
            $descriptorspec = [
                0 => ['pipe', 'r'],  // stdin
                1 => ['pipe', 'w'],  // stdout
                2 => ['pipe', 'w'],  // stderr
            ];

            $command = sprintf(
                '%s --defaults-file=%s %s',
                escapeshellarg($mysqlPath),
                escapeshellarg($configFile),
                escapeshellarg($database)
            );

            $process = proc_open($command, $descriptorspec, $pipes);
            
            if (!is_resource($process)) {
                \Log::error('Échec de l\'ouverture du processus pour la restauration mysql');
                return response()->json([
                    'message' => 'Erreur lors de l\'ouverture du processus de restauration.',
                    'error' => 'Échec de l\'ouverture du processus',
                ], 500);
            }

            // Lire le fichier de sauvegarde et ajouter les commandes pour désactiver/réactiver les clés étrangères
            $backupContent = File::get($backupPath);
            
            // Préparer le contenu SQL avec désactivation des clés étrangères
            $sqlContent = "SET FOREIGN_KEY_CHECKS=0;\n";
            $sqlContent .= "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n";
            $sqlContent .= "SET AUTOCOMMIT=0;\n";
            $sqlContent .= "START TRANSACTION;\n";
            $sqlContent .= $backupContent;
            $sqlContent .= "\nCOMMIT;\n";
            $sqlContent .= "SET FOREIGN_KEY_CHECKS=1;\n";
            
            fwrite($pipes[0], $sqlContent);
            fclose($pipes[0]);

            // Lire stdout et stderr
            $output = stream_get_contents($pipes[1]);
            $errors = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);

            // Obtenir le code de retour
            $returnVar = proc_close($process);
            
            // Combiner stdout et stderr pour les logs
            $allOutput = trim($output);
            if (!empty($errors)) {
                $allOutput .= "\n" . trim($errors);
            }
            $outputArray = !empty($allOutput) ? explode("\n", $allOutput) : [];

            // Supprimer le fichier de configuration temporaire
            if (File::exists($configFile)) {
                File::delete($configFile);
            }

            if ($returnVar !== 0) {
                \Log::error('Échec de la restauration mysql', [
                    'command' => $command,
                    'output' => $outputArray,
                    'return_var' => $returnVar
                ]);
                
                return response()->json([
                    'message' => 'Erreur lors de la restauration de la base de données.',
                    'error' => implode("\n", $outputArray),
                ], 500);
            }

            return response()->json([
                'message' => 'Base de données restaurée avec succès!',
            ]);
        } catch (\Exception $e) {
            \Log::error('Exception lors de la restauration de la base de données', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la restauration.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Supprimer une sauvegarde (Admin uniquement)
     */
    public function deleteBackup(Request $request, $filename)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $backupPath = storage_path('app/backups/' . $filename);

        if (!File::exists($backupPath)) {
            return response()->json([
                'message' => 'Sauvegarde introuvable.',
            ], 404);
        }

        File::delete($backupPath);

        return response()->json([
            'message' => 'Sauvegarde supprimée avec succès!',
        ]);
    }
}
