@echo off
cd /d "%~dp0LabelStudioConnector"
echo Label Studio Industrial - Conector SolidWorks
where dotnet >nul 2>&1
if errorlevel 1 (
  echo No se encontro .NET SDK. Consultar con el responsable de sistemas.
  pause
  exit /b 1
)
dotnet run
pause
