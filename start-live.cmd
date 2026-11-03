@echo off
title Agents Ka Ghar - Live (Hermes)
cd /d "%~dp0"
node bin\agents-ka-ghar.mjs --port 4319 --hermes-home D:\hermes --open
pause
