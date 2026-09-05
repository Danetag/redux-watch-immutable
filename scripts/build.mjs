import {rm, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

await rm('dist', {recursive: true, force: true});
execFileSync('npx', ['tsc', '-p', 'tsconfig.esm.json'], {stdio: 'inherit'});
execFileSync('npx', ['tsc', '-p', 'tsconfig.cjs.json'], {stdio: 'inherit'});
await writeFile('dist/esm/package.json', '{"type":"module"}\n');
