@echo off
setlocal
cd /d "%~dp0"

rem Ignora a configuracao antiga do Maven 3.9.6 que ainda existe no Windows.
set "M2_HOME="
set "MAVEN_SKIP_RC=1"

set "MAVEN_CMD="

if defined MAVEN_HOME if exist "%MAVEN_HOME%\bin\mvn.cmd" set "MAVEN_CMD=%MAVEN_HOME%\bin\mvn.cmd"
if not defined MAVEN_CMD if exist "C:\Program Files\Apache\Maven\apache-maven-3.9.11\bin\mvn.cmd" set "MAVEN_CMD=C:\Program Files\Apache\Maven\apache-maven-3.9.11\bin\mvn.cmd"

if not defined MAVEN_CMD (
  echo [ERRO] Maven funcional nao encontrado.
  echo Instale o Maven ou ajuste MAVEN_HOME para a pasta correta.
  exit /b 1
)

if not exist ".env" (
  echo [ERRO] O arquivo backend\.env ainda nao existe.
  echo Copie backend\.env.example para backend\.env e preencha os dados do Neon.
  exit /b 1
)

if /i "%~1"=="--check" (
  echo Configuracao local encontrada.
  call "%MAVEN_CMD%" -version
  exit /b %ERRORLEVEL%
)

echo Iniciando Altura API em http://localhost:8080
call "%MAVEN_CMD%" "-Dmaven.repo.local=%~dp0.m2repo" spring-boot:run
