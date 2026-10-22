import process from 'node:process';
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const forbidden = (name) =>
  /^(?:\.env(?:$|\.)|\.git$|\.npmrc$|\.netrc$|\.pypirc$|\.htpasswd$|id_(?:rsa|ed25519)(?:$|\.))|\.(?:pem|p12|pfx|key)$/i.test(
    name,
  );
function inspect(directory) {
  const failures = [];
  function walk(current) {
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, item.name);
      const relative = path
        .relative(directory, absolute)
        .split(path.sep)
        .join('/');
      if (item.isSymbolicLink() || forbidden(item.name)) {
        failures.push(relative);
        continue;
      }
      if (item.isDirectory()) walk(absolute);
      else if (item.isFile()) {
        // Private key markers cannot be delivered in text or binary assets.
        const bytes = fs.readFileSync(absolute);
        if (
          /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/.test(
            bytes.toString('latin1'),
          )
        )
          failures.push(relative);
      } else failures.push(relative);
    }
  }
  if (!fs.statSync(directory).isDirectory())
    throw new Error('Public output is not a directory');
  walk(directory);
  if (failures.length)
    throw new Error(
      'Private files blocked from publication: ' + failures.join(', '),
    );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (!process.argv[2]) throw new Error('Expected public output directory');
  inspect(path.resolve(process.argv[2]));
  console.log(
    'Public output checked: no environment, credential or private-key file',
  );
}
export { inspect };
