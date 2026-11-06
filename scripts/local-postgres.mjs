import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

// An isolated development cluster; never administer an existing system database.
const root = process.cwd();
const directory = path.resolve(root, '.local/postgres');
if (!directory.startsWith(root + path.sep)) throw new Error('Invalid database directory.');
const bin =
  process.env.PG_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin' : '');
const executable = (name) =>
  bin ? path.join(bin, name + (process.platform === 'win32' ? '.exe' : '')) : name;
function run(name, args, env = {}) {
  const result = spawnSync(executable(name), args, {
    windowsHide: true,
    encoding: 'utf8',
    ...(name === 'pg_ctl' ? { stdio: 'ignore' } : {}),
    env: { ...process.env, ...env },
  });
  if (result.status !== 0)
    throw new Error(`${name} failed: ${result.stderr || result.error || result.stdout}`);
  return result.stdout;
}
mkdirSync(path.join(root, '.local'), { recursive: true });
const configFile = path.join(root, '.local/postgres-connection.json');
if (process.argv.includes('--stop')) {
  run('pg_ctl', ['-D', directory, '-m', 'fast', 'stop']);
  console.log('Project PostgreSQL stopped.');
} else {
  let config;
  if (existsSync(configFile)) config = JSON.parse(readFileSync(configFile, 'utf8'));
  else {
    if (existsSync(path.join(directory, 'PG_VERSION')))
      throw new Error('Existing cluster has no connection metadata. Refusing to overwrite it.');
    config = { password: randomBytes(24).toString('hex'), port: 55432 };
    const passwordFile = path.join(root, '.local/postgres-init-password');
    writeFileSync(passwordFile, config.password, { mode: 0o600 });
    try {
      run('initdb', [
        '-D',
        directory,
        '-U',
        'pocket',
        '--encoding=UTF8',
        '--locale=C',
        '--auth=scram-sha-256',
        `--pwfile=${passwordFile}`,
      ]);
    } finally {
      unlinkSync(passwordFile);
    }
    writeFileSync(configFile, JSON.stringify(config), { mode: 0o600 });
  }
  const status = spawnSync(executable('pg_ctl'), ['-D', directory, 'status'], {
    windowsHide: true,
  });
  if (status.status !== 0)
    run('pg_ctl', [
      '-D',
      directory,
      '-l',
      path.join(root, '.local/postgres.log'),
      '-o',
      `-p ${config.port} -h 127.0.0.1`,
      '-w',
      'start',
    ]);
  for (const name of ['pocket', 'pocket_test']) {
    const args = [
      '-h',
      '127.0.0.1',
      '-p',
      String(config.port),
      '-U',
      'pocket',
      '-d',
      'postgres',
      '-At',
      '-c',
    ];
    const env = { PGPASSWORD: config.password };
    if (
      run('psql', [...args, `SELECT 1 FROM pg_database WHERE datname = '${name}'`], env).trim() !==
      '1'
    )
      run('psql', [...args, `CREATE DATABASE ${name}`], env);
  }
  const envFile = path.join(root, '.env');
  let contents = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
  if (!/^DATABASE_URL\s*=\s*\S+/m.test(contents))
    contents += `\nDATABASE_URL="postgresql://pocket:${config.password}@127.0.0.1:${config.port}/pocket"\n`;
  if (!/^TEST_DATABASE_URL\s*=\s*\S+/m.test(contents))
    contents += `TEST_DATABASE_URL="postgresql://pocket:${config.password}@127.0.0.1:${config.port}/pocket_test"\n`;
  writeFileSync(envFile, contents);
  console.log(
    `Project PostgreSQL ready on 127.0.0.1:${config.port}. Database URLs are configured in .env.`,
  );
}
