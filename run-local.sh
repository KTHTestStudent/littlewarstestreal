#!/usr/bin/env bash
# run-local.sh - one local-model run (builder or fixer) through dsh headless.
# Claude Code calls this from Git Bash in the project folder; you approve
# each call in Claude Code's permission prompt. Never put this script on an
# allow-list: the prompt IS the approval step.
#
#   bash run-local.sh builder "phase5" prompts/phase5.txt
#   bash run-local.sh fixer   "phase5-fix1" prompts/phase5-fix1.txt
#
# What it does: refuses to start on a dirty tree (so the diff is the model's),
# runs ONE headless dsh session, saves the model's answer and reasoning to
# .local-runs/, appends one row to .local-runs/runs.csv and prints a short
# summary. It does not commit - Claude commits after the self-test.
set -u

role="${1:?role: builder or fixer}"
label="${2:?label, e.g. phase5}"
promptfile="${3:?prompt file}"
DSH_BIN="${DSH_BIN:-dsh}"

case "$role" in
  builder) export DSH_HOME="${DSH_BUILDER_HOME:-$USERPROFILE/.dsh}" ;;
  fixer)   export DSH_HOME="${DSH_FIXER_HOME:-$USERPROFILE/.dsh-fixer}" ;;
  *) echo "role must be builder or fixer"; exit 2 ;;
esac
# Stay in the project folder; anything outside would need an approval that
# nobody can give in headless mode.
export DSH_PERMISSION_MODE=workspace-write

[ -f "$promptfile" ] || { echo "no prompt file: $promptfile"; exit 2; }
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "REFUSED: uncommitted changes. Commit or stash first so the diff is the model's."
  exit 3
fi

mkdir -p .local-runs
grep -qx '.local-runs/' .git/info/exclude 2>/dev/null || echo '.local-runs/' >> .git/info/exclude
stamp="$(date +%Y%m%d-%H%M%S)"
id="$stamp-$role-$label"
ans=".local-runs/$id.answer.txt"
rsn=".local-runs/$id.reasoning.txt"
cp "$promptfile" ".local-runs/$id.prompt.txt"

# Free physical memory in MB (Windows; empty elsewhere).
freemb() { powershell.exe -NoProfile -Command "[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)" 2>/dev/null | tr -d '\r'; }

# Unload the OTHER model first, so a swap never holds both for a moment.
other=fixer; [ "$role" = fixer ] && other=builder
ollama stop "$other" >/dev/null 2>&1

echo "== $id   (DSH_HOME=$DSH_HOME)"
ollama ps 2>/dev/null | sed -n '1,3p'
untracked_before="$(git ls-files --others --exclude-standard | sort)"
mem0="$(freemb)"
t0=$(date +%s)
"$DSH_BIN" --profile headless "$(cat "$promptfile")" >"$ans" 2>"$rsn"
code=$?
t1=$(date +%s)
mem1="$(freemb)"
mins=$(awk "BEGIN{printf \"%.1f\", ($t1-$t0)/60}")

stat="$(git diff --shortstat)"
# Changed tracked files, plus files the run CREATED (untracked now, not before).
newfiles="$(comm -13 <(printf '%s\n' "$untracked_before") <(git ls-files --others --exclude-standard | sort) | sed '/^$/d')"
files="$(git diff --name-only | tr '\n' ' ')"
[ -n "$newfiles" ] && files="$files$(printf '%s\n' "$newfiles" | sed 's/$/ (new)/' | tr '\n' ' ')"
# Last line of the answer, skipping blank lines and code-fence lines.
last="$(grep -v -E '^[[:space:]]*$|^[[:space:]]*```' "$ans" | tail -n 1 | cut -c1-200)"
crash="$(grep -m1 -E 'ROCm error|llama-server process has terminated' "$rsn" "$ans" 2>/dev/null)"
# Git commands that could read an old answer (history, other branches). The
# prompt forbids running anything (R3) but headless mode would not stop it,
# so flag any such text for a look. A hit may only be the model thinking.
gitseen="$(grep -h -o -E '\bgit[[:space:]]+(log|show|diff|checkout|switch|restore|stash|reset|cat-file|blame|reflog|branch|worktree|fetch|pull|clone|grep)\b[^"`\\]{0,60}' "$ans" "$rsn" 2>/dev/null | sort -u | head -n 3 | tr '\n' ';')"

[ -f .local-runs/runs.csv ] || echo 'run_id,role,label,exit,minutes,files_changed,diffstat,last_line,free_mb_start,free_mb_end' > .local-runs/runs.csv
q() { printf '"%s"' "$(printf '%s' "$1" | sed 's/"/""/g')"; }
echo "$(q "$id"),$role,$(q "$label"),$code,$mins,$(q "$files"),$(q "$stat"),$(q "$last"),$mem0,$mem1" >> .local-runs/runs.csv

echo "exit: $code   minutes: $mins   free RAM MB: ${mem0:-?} -> ${mem1:-?}"
echo "changed: ${files:-NOTHING}   ${stat}"
echo "last line: ${last:-<empty>}"
echo "answer: $ans ($(wc -c <"$ans") bytes)   reasoning: $rsn ($(wc -c <"$rsn") bytes)"
[ -n "$gitseen" ] && echo "!! git command text in the run (look in the reasoning there): $gitseen"
if [ -n "$crash" ]; then
  echo "!! DRIVER CRASH: $crash"
  echo "!! Restart Windows before ANY further run (COMMANDS.txt section 6)."
  exit 4
fi
exit "$code"
