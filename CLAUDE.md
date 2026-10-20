Local builder/fixer runs: follow LOCAL-SUBAGENTS.md.

Git: cloud sessions make working-claude from origin/working and push only
there. Human merges from working-claude when cloud session makes a change that is needed locally. Laptop sessions work on local working (or in a local throwaway branch made from working when testing something risky, and then merge to working if testing is successful) and only push to remote working. Nobody pushes to main.