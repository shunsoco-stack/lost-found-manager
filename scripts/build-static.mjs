import { spawnSync } from "node:child_process";
import { copyFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_STATIC_EXPORT: "1" },
});

if (result.status !== 0) process.exit(result.status ?? 1);

// Next 16.4 on Windows exports nested segment payload paths, while the client
// requests their dot-separated names. Keep both forms for portable static hosting.
async function copySegmentAliases(directory, segmentRoot, segments = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (segmentRoot) {
        await copySegmentAliases(path, segmentRoot, [...segments, entry.name]);
      } else if (entry.name.startsWith("__next.")) {
        await copySegmentAliases(path, directory, [entry.name]);
      } else {
        await copySegmentAliases(path);
      }
    } else if (segmentRoot && entry.name.endsWith(".txt")) {
      await copyFile(path, join(segmentRoot, [...segments, entry.name].join(".")));
    }
  }
}

await copySegmentAliases("out");
