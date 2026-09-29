import { spawnSync } from 'node:child_process';

// Draft deployments validate the data shape. Production must also pass publication.
const args = ['scripts/glm_v2.py', '--check'];
if (process.env.VERCEL_ENV !== 'production') args.push('--preview');
const result = spawnSync('python3', args, { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
