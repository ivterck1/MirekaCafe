const path = require('node:path');

const projectId = 'mireka-cafe';

function backupDirectory(projectRoot) {
  const base = process.env.STUDIO_BACKUPS_DIR || path.resolve(projectRoot, '..', '..', 'NODAGRAMA_Backups');
  return path.resolve(base, 'MirekaCafe');
}

module.exports = {projectId, backupDirectory};
