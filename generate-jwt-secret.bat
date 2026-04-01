@echo off
REM =============================================================================
REM 🔐 GENERATEUR DE CLE JWT SECURISEE (WINDOWS)
REM =============================================================================

echo.
echo ===============================================================================
echo  ^|^| GENERATEUR DE CLE JWT SECURISEE
echo ===============================================================================
echo.

REM Generer une cle JWT securisee (32+ caracteres)
REM Note: Sur Windows, utiliser une alternative a openssl si necessaire

echo Methode 1 - Avec OpenSSL (si installe):
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Executer dans PowerShell:
echo.
echo   openssl rand -base64 32
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Exemple de sortie:
echo   AbCdEfGhIjKlMnOpQrStUvWxYz1234567890ABCdEfGhI=
echo.

echo Methode 2 - Avec PowerShell (Windows embded):
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Executer dans PowerShell:
echo.
echo   [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo ETAPES APRES AVOIR LA CLE:
echo.
echo 1. Ouvrir le fichier: backend\.env
echo 2. Trouver la ligne: JWT_SECRET=...
echo 3. Remplacer par votre cle generee
echo 4. Sauvegarder
echo 5. Redemarrer le serveur: npm start
echo.
echo ===============================================================================
echo  Securite: Ne jamais partager cette cle! La garder confidentielle en .env
echo ===============================================================================
echo.

pause
