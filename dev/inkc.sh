#!/bin/sh
# dev/inkc.sh <story.ink> <out story.js> - compiles ink the way Inky's
# File > Export story.js only... does (inkjs's compiler, counting all
# visits), and writes "var storyContent = {...};".
#   sh dev/inkc.sh story/story.ink ink/story.js
# The author exports from Inky; this is for Claude sessions and checks.
# The compiler: set INKJS_CLI to an inkjs 2.4.0 compiler - the Knotwork
# launcher's lib/vendor/inkjs-cli.js, or node_modules/inkjs/bin/
# inkjs-compiler.js after "npm install inkjs@2.4.0" in a scratch folder -
# or keep the launcher repository next to this one
# (../knotworklauncherprealpha).
here=$(cd "$(dirname "$0")/.." && pwd)
cli=${INKJS_CLI:-$here/../knotworklauncherprealpha/lib/vendor/inkjs-cli.js}
if [ ! -f "$cli" ]; then
  echo "no ink compiler at $cli - set INKJS_CLI (see the top of this file)"
  exit 2
fi
if [ -z "$2" ]; then
  echo "usage: dev/inkc.sh <story.ink> <out story.js>"
  exit 2
fi
rm -f "$2.json"
node "$cli" -c -o "$2.json" "$1"
if [ ! -f "$2.json" ]; then
  echo "did not compile (the lines above say why)"
  exit 1
fi
# the compiler may start its file with a byte-order mark: leave it out
{ printf 'var storyContent = '; sed '1s/^\xEF\xBB\xBF//' "$2.json"; printf ';'; } > "$2" && rm "$2.json"
