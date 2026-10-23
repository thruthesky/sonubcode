#!/usr/bin/env bash
# Sonub Code release build — Linux x64 (the SONUB cloud sandbox image) by default. Run on a Linux x64 machine with bun 1.4.4.
#   script/sonub/build-release.sh 2.1.4-sonub.1 [target ...]     targets: linux-x64 (default), linux-arm64, darwin-arm64, …
# Output: dist-release/sonubcode-<version>-<target>.tar.gz and .sha256 — upload them to the GitHub release sonub-v<version>.
set -euo pipefail
version="${1:?usage: build-release.sh <version> [target ...]}"
shift
targets=("${@:-linux-x64}")
root="$(cd "$(dirname "$0")/../.." && pwd)"
out="$root/dist-release"
mkdir -p "$out"
cd "$root/packages/cli"
for target in "${targets[@]}"; do
	OPENCODE_VERSION="$version" OPENCODE_CHANNEL=sonub bun run script/build.ts --skip-web-ui --target="sonubcode-$target"
	dir="dist/cli-$target"
	cp "$root/LICENSE" "$root/NOTICE.md" "$dir/"
	tarball="$out/sonubcode-$version-$target.tar.gz"
	tar -C "$dir" -czf "$tarball" bin/sonubcode LICENSE NOTICE.md
	(cd "$out" && sha256sum "$(basename "$tarball")" > "$(basename "$tarball").sha256")
	echo "built $tarball"
done
